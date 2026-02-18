<?php
/**
 * Grava Agendamento - Versão Corrigida com Proteção Contra Duplicação
 * 
 * PROTEÇÃO TRIPLA CONTRA DUPLICAÇÃO:
 * 1. Verificar se já existe agendamento idêntico nos últimos 5 minutos
 * 2. Verificar se já existe agendamento ativo para mesmo profissional/especialidade
 * 3. Usar transação para garantir atomicidade
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log de início
error_log("=== INÍCIO GRAVA_AGENDAMENTO_APP.PHP ===");
error_log("POST Data: " . print_r($_POST, true));

// Incluir conexão com banco
require_once 'Adm/php/banco.php';

try {
    // Conectar ao banco PostgreSQL
    $pdo = Banco::conectar_postgres();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Obter dados do POST
    $cod_associado = $_POST['cod_associado'] ?? '';
    $id_empregador = $_POST['id_empregador'] ?? '';
    $cod_convenio = $_POST['cod_convenio'] ?? '1';
    $data_solicitacao = $_POST['data_solicitacao'] ?? date('Y-m-d H:i:s');
    $status = $_POST['status'] ?? '1';
    $profissional = $_POST['profissional'] ?? '';
    $especialidade = $_POST['especialidade'] ?? '';
    $convenio_nome = $_POST['convenio_nome'] ?? '';
    $data_pretendida = $_POST['data_pretendida'] ?? null;
    
    // Log dos dados recebidos
    error_log("Dados recebidos:");
    error_log("  cod_associado: $cod_associado");
    error_log("  id_empregador: $id_empregador");
    error_log("  cod_convenio: $cod_convenio");
    error_log("  profissional: $profissional");
    error_log("  especialidade: $especialidade");
    error_log("  convenio_nome: $convenio_nome");
    error_log("  data_pretendida: " . ($data_pretendida ?: 'NULL'));
    
    // Validar dados obrigatórios
    if (empty($cod_associado) || empty($id_empregador)) {
        throw new Exception('Dados obrigatórios não fornecidos: cod_associado e id_empregador são obrigatórios');
    }
    
    // INICIAR TRANSAÇÃO
    $pdo->beginTransaction();
    
    try {
        // PROTEÇÃO 1: Verificar duplicação nos últimos 5 minutos
        $stmt = $pdo->prepare("
            SELECT id, data_solicitacao 
            FROM sind.agendamento 
            WHERE cod_associado = ? 
              AND id_empregador = ?
              AND profissional = ?
              AND especialidade = ?
              AND convenio_nome = ?
              AND data_solicitacao >= NOW() - INTERVAL '5 minutes'
              AND status IN ('1', '2')
            ORDER BY data_solicitacao DESC
            LIMIT 1
        ");
        
        $stmt->execute([
            $cod_associado,
            $id_empregador,
            $profissional,
            $especialidade,
            $convenio_nome
        ]);
        
        $duplicateRecent = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($duplicateRecent) {
            $pdo->rollBack();
            error_log("⚠️ DUPLICAÇÃO BLOQUEADA - Agendamento recente encontrado: ID " . $duplicateRecent['id']);
            
            echo json_encode([
                'success' => true,
                'message' => 'Agendamento já existe (duplicação evitada)',
                'data' => [
                    'id' => $duplicateRecent['id'],
                    'duplicate_prevented' => true,
                    'new_record' => false,
                    'check_level' => 'recent_5min',
                    'profissional' => $profissional,
                    'especialidade' => $especialidade,
                    'convenio_nome' => $convenio_nome
                ]
            ]);
            exit;
        }
        
        // PROTEÇÃO 2: Verificar se já existe agendamento ativo (status 1 ou 2) para mesmo profissional/especialidade
        $stmt = $pdo->prepare("
            SELECT id, data_solicitacao, status
            FROM sind.agendamento 
            WHERE cod_associado = ? 
              AND id_empregador = ?
              AND profissional = ?
              AND especialidade = ?
              AND status IN ('1', '2')
            ORDER BY data_solicitacao DESC
            LIMIT 1
        ");
        
        $stmt->execute([
            $cod_associado,
            $id_empregador,
            $profissional,
            $especialidade
        ]);
        
        $duplicateActive = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($duplicateActive) {
            $pdo->rollBack();
            error_log("⚠️ DUPLICAÇÃO BLOQUEADA - Agendamento ativo encontrado: ID " . $duplicateActive['id']);
            
            echo json_encode([
                'success' => true,
                'message' => 'Você já possui um agendamento ativo para este profissional',
                'data' => [
                    'id' => $duplicateActive['id'],
                    'duplicate_prevented' => true,
                    'new_record' => false,
                    'check_level' => 'active_appointment',
                    'profissional' => $profissional,
                    'especialidade' => $especialidade,
                    'convenio_nome' => $convenio_nome
                ]
            ]);
            exit;
        }
        
        // NENHUMA DUPLICAÇÃO ENCONTRADA - INSERIR NOVO AGENDAMENTO
        $stmt = $pdo->prepare("
            INSERT INTO sind.agendamento (
                cod_associado,
                id_empregador,
                cod_convenio,
                data_solicitacao,
                status,
                profissional,
                especialidade,
                convenio_nome,
                data_pretendida
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
        ");
        
        $stmt->execute([
            $cod_associado,
            $id_empregador,
            $cod_convenio,
            $data_solicitacao,
            $status,
            $profissional,
            $especialidade,
            $convenio_nome,
            $data_pretendida
        ]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $agendamentoId = $result['id'];
        
        // COMMIT DA TRANSAÇÃO
        $pdo->commit();
        
        error_log("✅ Agendamento inserido com sucesso - ID: $agendamentoId");
        
        echo json_encode([
            'success' => true,
            'message' => 'Agendamento solicitado com sucesso!',
            'data' => [
                'id' => $agendamentoId,
                'duplicate_prevented' => false,
                'new_record' => true,
                'cod_associado' => $cod_associado,
                'id_empregador' => $id_empregador,
                'profissional' => $profissional,
                'especialidade' => $especialidade,
                'convenio_nome' => $convenio_nome,
                'data_pretendida' => $data_pretendida
            ]
        ]);
        
    } catch (Exception $e) {
        // Rollback em caso de erro
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("❌ Erro ao gravar agendamento: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao processar agendamento: ' . $e->getMessage(),
        'error' => $e->getMessage()
    ]);
}

error_log("=== FIM GRAVA_AGENDAMENTO_APP.PHP ===");
?>
