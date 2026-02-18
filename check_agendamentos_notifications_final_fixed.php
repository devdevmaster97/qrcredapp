<?php
/**
 * Check Agendamentos Notifications - Versão Corrigida
 * 
 * CORREÇÕES:
 * 1. Marca flag ANTES de enviar notificação (evita duplicação)
 * 2. Grava logs na tabela notification_log
 * 3. Usa transação para garantir atomicidade
 * 4. Proteção contra execução simultânea
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

error_log("=== INÍCIO CHECK_AGENDAMENTOS_NOTIFICATIONS ===");

require_once 'Adm/php/banco.php';
require_once 'send_push_notification_app.php';

try {
    $pdo = Banco::conectar_postgres();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $results = [
        'total_processed' => 0,
        'notifications_sent' => 0,
        'errors' => 0,
        'details' => []
    ];
    
    // BUSCAR AGENDAMENTOS CONFIRMADOS QUE AINDA NÃO FORAM NOTIFICADOS
    // IMPORTANTE: Usar FOR UPDATE SKIP LOCKED para evitar race condition
    $stmt = $pdo->prepare("
        SELECT 
            a.id,
            a.cod_associado,
            a.profissional,
            a.especialidade,
            a.convenio_nome,
            a.data_agendada,
            a.data_pretendida,
            a.notification_sent_confirmado,
            ass.cartao as user_card
        FROM sind.agendamento a
        INNER JOIN sind.associado ass ON a.cod_associado = ass.codigo
        WHERE a.status = '2'
          AND a.notification_sent_confirmado = false
          AND a.data_agendada IS NOT NULL
        ORDER BY a.data_agendada ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 50
    ");
    
    $stmt->execute();
    $agendamentos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    error_log("📋 Total de agendamentos encontrados: " . count($agendamentos));
    
    foreach ($agendamentos as $agendamento) {
        $results['total_processed']++;
        $agendamentoId = $agendamento['id'];
        $userCard = $agendamento['user_card'];
        
        error_log("🔄 Processando agendamento ID: {$agendamentoId} - Usuário: {$userCard}");
        
        try {
            // INICIAR TRANSAÇÃO
            $pdo->beginTransaction();
            
            // MARCAR FLAG COMO TRUE **ANTES** DE ENVIAR NOTIFICAÇÃO
            // Isso evita que execuções simultâneas enviem duplicadas
            $updateStmt = $pdo->prepare("
                UPDATE sind.agendamento
                SET notification_sent_confirmado = true
                WHERE id = ?
                  AND notification_sent_confirmado = false
            ");
            
            $updateStmt->execute([$agendamentoId]);
            $rowsAffected = $updateStmt->rowCount();
            
            if ($rowsAffected === 0) {
                // Outro processo já marcou esta flag - pular
                $pdo->rollBack();
                error_log("⚠️ Agendamento {$agendamentoId} já foi processado por outro processo");
                continue;
            }
            
            // COMMIT DA TRANSAÇÃO (flag marcada com sucesso)
            $pdo->commit();
            
            error_log("✅ Flag marcada para agendamento {$agendamentoId}");
            
            // BUSCAR SUBSCRIPTIONS ATIVAS DO USUÁRIO
            $subsStmt = $pdo->prepare("
                SELECT id, endpoint, p256dh, auth, settings
                FROM sind.push_subscriptions
                WHERE user_card = ?
                  AND is_active = true
            ");
            
            $subsStmt->execute([$userCard]);
            $subscriptions = $subsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($subscriptions)) {
                error_log("⚠️ Usuário {$userCard} não tem subscriptions ativas");
                
                // Gravar log de erro
                $logStmt = $pdo->prepare("
                    INSERT INTO sind.notification_log (
                        user_card,
                        agendamento_id,
                        tipo_notificacao,
                        titulo,
                        mensagem,
                        status,
                        error_message,
                        profissional,
                        especialidade,
                        convenio_nome,
                        data_agendada
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                
                $logStmt->execute([
                    $userCard,
                    $agendamentoId,
                    'agendamento_confirmado',
                    'Agendamento Confirmado',
                    'Seu agendamento foi confirmado',
                    'failed',
                    'Usuário não tem subscriptions ativas',
                    $agendamento['profissional'],
                    $agendamento['especialidade'],
                    $agendamento['convenio_nome'],
                    $agendamento['data_agendada']
                ]);
                
                $results['errors']++;
                continue;
            }
            
            // VERIFICAR SE USUÁRIO TEM NOTIFICAÇÕES HABILITADAS
            $settings = json_decode($subscriptions[0]['settings'], true);
            if (!$settings['agendamentoConfirmado']) {
                error_log("⚠️ Usuário {$userCard} desabilitou notificações de agendamento confirmado");
                continue;
            }
            
            // PREPARAR DADOS DA NOTIFICAÇÃO
            $dataFormatada = date('d/m/Y', strtotime($agendamento['data_agendada']));
            $horaFormatada = date('H:i', strtotime($agendamento['data_agendada']));
            
            $titulo = "Agendamento Confirmado! ✅";
            $mensagem = "{$agendamento['profissional']} - {$agendamento['especialidade']}\n{$dataFormatada} às {$horaFormatada}";
            
            $notificationData = [
                'title' => $titulo,
                'body' => $mensagem,
                'icon' => '/icon-192x192.png',
                'badge' => '/icon-192x192.png',
                'data' => [
                    'url' => '/convenio/dashboard/agendamentos',
                    'agendamento_id' => $agendamentoId,
                    'tipo' => 'agendamento_confirmado'
                ]
            ];
            
            // ENVIAR NOTIFICAÇÃO PARA CADA SUBSCRIPTION
            $notificationSent = false;
            $lastError = null;
            
            foreach ($subscriptions as $subscription) {
                try {
                    error_log("📤 Enviando notificação para subscription ID: {$subscription['id']}");
                    
                    $pushSubscription = [
                        'endpoint' => $subscription['endpoint'],
                        'keys' => [
                            'p256dh' => $subscription['p256dh'],
                            'auth' => $subscription['auth']
                        ]
                    ];
                    
                    $result = sendPushNotification($pushSubscription, $notificationData);
                    
                    if ($result['success']) {
                        error_log("✅ Notificação enviada com sucesso para subscription {$subscription['id']}");
                        $notificationSent = true;
                        
                        // GRAVAR LOG DE SUCESSO
                        $logStmt = $pdo->prepare("
                            INSERT INTO sind.notification_log (
                                user_card,
                                agendamento_id,
                                tipo_notificacao,
                                titulo,
                                mensagem,
                                status,
                                subscription_id,
                                profissional,
                                especialidade,
                                convenio_nome,
                                data_agendada,
                                response_data
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ");
                        
                        $logStmt->execute([
                            $userCard,
                            $agendamentoId,
                            'agendamento_confirmado',
                            $titulo,
                            $mensagem,
                            'sent',
                            $subscription['id'],
                            $agendamento['profissional'],
                            $agendamento['especialidade'],
                            $agendamento['convenio_nome'],
                            $agendamento['data_agendada'],
                            json_encode($result)
                        ]);
                        
                    } else {
                        error_log("❌ Erro ao enviar notificação: {$result['error']}");
                        $lastError = $result['error'];
                        
                        // GRAVAR LOG DE ERRO
                        $logStmt = $pdo->prepare("
                            INSERT INTO sind.notification_log (
                                user_card,
                                agendamento_id,
                                tipo_notificacao,
                                titulo,
                                mensagem,
                                status,
                                subscription_id,
                                error_message,
                                profissional,
                                especialidade,
                                convenio_nome,
                                data_agendada
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ");
                        
                        $logStmt->execute([
                            $userCard,
                            $agendamentoId,
                            'agendamento_confirmado',
                            $titulo,
                            $mensagem,
                            'failed',
                            $subscription['id'],
                            $result['error'],
                            $agendamento['profissional'],
                            $agendamento['especialidade'],
                            $agendamento['convenio_nome'],
                            $agendamento['data_agendada']
                        ]);
                    }
                    
                } catch (Exception $e) {
                    error_log("❌ Exceção ao enviar notificação: " . $e->getMessage());
                    $lastError = $e->getMessage();
                }
            }
            
            if ($notificationSent) {
                $results['notifications_sent']++;
                $results['details'][] = [
                    'agendamento_id' => $agendamentoId,
                    'user_card' => $userCard,
                    'profissional' => $agendamento['profissional'],
                    'status' => 'sent'
                ];
            } else {
                $results['errors']++;
                $results['details'][] = [
                    'agendamento_id' => $agendamentoId,
                    'user_card' => $userCard,
                    'profissional' => $agendamento['profissional'],
                    'status' => 'failed',
                    'error' => $lastError
                ];
            }
            
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("❌ Erro ao processar agendamento {$agendamentoId}: " . $e->getMessage());
            $results['errors']++;
        }
    }
    
    error_log("=== FIM CHECK_AGENDAMENTOS_NOTIFICATIONS ===");
    error_log("📊 Resumo: {$results['notifications_sent']} enviadas, {$results['errors']} erros");
    
    echo json_encode([
        'success' => true,
        'message' => "Processadas {$results['total_processed']} notificações",
        'results' => $results
    ]);
    
} catch (Exception $e) {
    error_log("❌ Erro fatal: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao processar notificações',
        'error' => $e->getMessage()
    ]);
}
?>
