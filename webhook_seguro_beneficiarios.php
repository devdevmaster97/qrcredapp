<?php
/**
 * Webhook ZapSign para Seguro Beneficiários
 * Baseado em: webhook_zapsign.php
 * Criado em: 2026-05-12
 * 
 * Funcionalidade:
 * - Recebe webhook do ZapSign quando documento "Indicacao Beneficiario Seguro" é assinado
 * - Extrai dados do signatário (associado) e do beneficiário (answers)
 * - Atualiza primeiro beneficiário pendente do associado
 */

header('Content-Type: application/json; charset=utf-8');

error_log("========================================");
error_log("🔔 WEBHOOK SEGURO BENEFICIÁRIOS - " . date('Y-m-d H:i:s'));
error_log("========================================");

try {
    $input = file_get_contents('php://input');
    error_log("📥 Input recebido: " . $input);
    
    $data = json_decode($input, true);
    
    if (!$data) {
        throw new Exception('Dados inválidos recebidos do webhook');
    }
    
    // Verificar se é documento de seguro
    $doc_name = $data['name'] ?? '';
    $doc_token = $data['token'] ?? '';
    $event_type = $data['event_type'] ?? '';
    
    error_log("📋 Documento: $doc_name");
    error_log("📋 Token: $doc_token");
    error_log("📋 Event: $event_type");
    
    // Validar se é documento de seguro
    if (stripos($doc_name, 'Indicacao Beneficiario Seguro') === false && 
        stripos($doc_name, 'Seguro') === false) {
        error_log("⚠️ Documento não é de seguro, ignorando...");
        echo json_encode([
            'status' => 'ignorado',
            'mensagem' => 'Documento não é de seguro'
        ]);
        exit;
    }
    
    // Validar evento
    if ($event_type !== 'doc_signed') {
        error_log("⚠️ Evento não é doc_signed, ignorando...");
        echo json_encode([
            'status' => 'ignorado',
            'mensagem' => 'Evento não é assinatura'
        ]);
        exit;
    }
    
    // Extrair dados do signatário (associado)
    $signer = $data['signer_who_signed'] ?? ($data['signers'][0] ?? null);
    
    if (!$signer) {
        throw new Exception('Signatário não encontrado no webhook');
    }
    
    $cpf_original = $signer['cpf'] ?? '';
    $nome_signatario = $signer['name'] ?? '';
    $email_signatario = $signer['email'] ?? '';
    $telefone_signatario = $signer['phone'] ?? $signer['phone_number'] ?? '';
    $signed_at = $signer['signed_at'] ?? date('Y-m-d H:i:s');
    
    // Limpar CPF
    $cpf = preg_replace('/[^0-9]/', '', $cpf_original);
    
    error_log("👤 Signatário:");
    error_log("   Nome: $nome_signatario");
    error_log("   CPF: $cpf");
    error_log("   Email: $email_signatario");
    
    if (empty($cpf)) {
        throw new Exception('CPF do signatário não encontrado');
    }
    
    // Extrair dados do beneficiário (answers)
    $answers = $data['answers'] ?? [];
    
    $nome_beneficiario = '';
    $data_nascimento = '';
    $parentesco = '';
    $percentual = 0;
    
    foreach ($answers as $answer) {
        $variable = $answer['variable'] ?? '';
        $value = $answer['value'] ?? '';
        
        if (stripos($variable, 'Nome de quem vai receber') !== false) {
            $nome_beneficiario = $value;
        } elseif (stripos($variable, 'Data de Nascimento') !== false) {
            $data_nascimento = $value;
        } elseif (stripos($variable, 'Parentesco') !== false) {
            $parentesco = $value;
        } elseif (stripos($variable, 'Percentual') !== false) {
            $percentual = intval($value);
        }
    }
    
    error_log("👶 Beneficiário:");
    error_log("   Nome: $nome_beneficiario");
    error_log("   Data Nasc: $data_nascimento");
    error_log("   Parentesco: $parentesco");
    error_log("   Percentual: $percentual");
    
    // Conectar ao banco
    include "../../Adm/php/banco.php";
    $pdo = Banco::conectar_postgres();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Iniciar transação para evitar race condition
    $pdo->beginTransaction();
    
    try {
        // Buscar associado pelo CPF
        error_log("🔍 Buscando associado pelo CPF: $cpf");
        
        $sqlAssociado = "SELECT id, id_divisao, codigo, nome 
                         FROM sind.associado 
                         WHERE cpf = :cpf 
                         ORDER BY id DESC 
                         LIMIT 1";
        
        $stmtAssociado = $pdo->prepare($sqlAssociado);
        $stmtAssociado->execute([':cpf' => $cpf]);
        $associado = $stmtAssociado->fetch(PDO::FETCH_ASSOC);
        
        if (!$associado) {
            error_log("❌ Associado não encontrado com CPF: $cpf");
            throw new Exception("Associado não encontrado");
        }
        
        $id_associado = $associado['id'];
        $id_divisao = $associado['id_divisao'];
        
        error_log("✅ Associado encontrado:");
        error_log("   ID: $id_associado");
        error_log("   Divisão: $id_divisao");
        error_log("   Nome: " . $associado['nome']);
        
        // Buscar primeiro beneficiário pendente com lock para evitar race condition
        error_log("🔍 Buscando beneficiário pendente...");
        
        $sqlBeneficiario = "SELECT id_beneficiario 
                            FROM sind.seguro_beneficiarios 
                            WHERE id_associado = :id_associado 
                              AND status = 'pendente'
                            ORDER BY id_beneficiario ASC 
                            LIMIT 1
                            FOR UPDATE";
        
        $stmtBeneficiario = $pdo->prepare($sqlBeneficiario);
        $stmtBeneficiario->execute([':id_associado' => $id_associado]);
        $beneficiario = $stmtBeneficiario->fetch(PDO::FETCH_ASSOC);
        
        if (!$beneficiario) {
            error_log("⚠️ Nenhum beneficiário pendente encontrado para associado $id_associado");
            throw new Exception("Nenhum beneficiário pendente encontrado");
        }
        
        $id_beneficiario = $beneficiario['id_beneficiario'];
        error_log("✅ Beneficiário pendente encontrado: ID $id_beneficiario");
        
        // Atualizar beneficiário com dados da assinatura
        error_log("📝 Atualizando beneficiário...");
        
        $sqlUpdate = "UPDATE sind.seguro_beneficiarios 
                      SET status = 'assinado',
                          cpf_zap = :cpf_zap,
                          nome_zap = :nome_zap,
                          nome_beneficiario = :nome_beneficiario,
                          data_nascimento = :data_nascimento,
                          parentesco = :parentesco,
                          percentual = :percentual,
                          doc_token = :doc_token,
                          data_assinatura = :data_assinatura
                      WHERE id_beneficiario = :id_beneficiario";
        
        $stmtUpdate = $pdo->prepare($sqlUpdate);
        $stmtUpdate->execute([
            ':cpf_zap' => $cpf,
            ':nome_zap' => $nome_signatario,
            ':nome_beneficiario' => $nome_beneficiario,
            ':data_nascimento' => $data_nascimento,
            ':parentesco' => $parentesco,
            ':percentual' => $percentual,
            ':doc_token' => $doc_token,
            ':data_assinatura' => $signed_at,
            ':id_beneficiario' => $id_beneficiario
        ]);
        
        // Commit da transação
        $pdo->commit();
        
        error_log("✅ Beneficiário atualizado com sucesso!");
        error_log("   ID Beneficiário: $id_beneficiario");
        error_log("   Nome Beneficiário: $nome_beneficiario");
        error_log("   Status: assinado");
        
    } catch (Exception $e) {
        // Rollback em caso de erro
        $pdo->rollBack();
        throw $e;
    }
    
    $pdo = null;
    
    echo json_encode([
        'status' => 'sucesso',
        'mensagem' => 'Beneficiário atualizado com sucesso',
        'id_beneficiario' => $id_beneficiario,
        'id_associado' => $id_associado,
        'nome_beneficiario' => $nome_beneficiario
    ]);
    
    error_log("========================================");
    error_log("✅ WEBHOOK PROCESSADO COM SUCESSO");
    error_log("========================================");
    
} catch (PDOException $e) {
    error_log("❌ ERRO PDO: " . $e->getMessage());
    error_log("❌ Stack trace: " . $e->getTraceAsString());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'erro',
        'mensagem' => 'Erro ao processar webhook. Tente novamente.'
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    error_log("❌ ERRO GERAL: " . $e->getMessage());
    error_log("❌ Stack trace: " . $e->getTraceAsString());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'erro',
        'mensagem' => 'Erro ao processar webhook. Tente novamente.'
    ], JSON_UNESCAPED_UNICODE);
}
?>
