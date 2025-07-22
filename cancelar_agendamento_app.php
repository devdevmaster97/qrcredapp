<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit;
}

try {
    // Incluir arquivo de conexão com banco (ajuste o caminho conforme sua estrutura)
    require_once 'Adm/php/banco.php';
    
    // Conectar ao banco PostgreSQL
    $pdo = Banco::conectar_postgres();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Receber dados via POST
    $id_agendamento = $_POST['id_agendamento'] ?? '';
    $cod_associado = $_POST['cod_associado'] ?? '';
    $id_empregador = $_POST['id_empregador'] ?? '';
    
    // Log para debug
    error_log("CANCELAR AGENDAMENTO: id=$id_agendamento, associado=$cod_associado, empregador=$id_empregador");
    
    // Validar dados obrigatórios
    if (empty($id_agendamento) || empty($cod_associado) || empty($id_empregador)) {
        echo json_encode([
            'success' => false,
            'message' => 'Dados obrigatórios não fornecidos'
        ]);
        exit;
    }
    
    // Converter para tipos apropriados
    $id_agendamento = (int)$id_agendamento;
    $id_empregador = (int)$id_empregador;
    
    // 🔍 VERIFICAR SE O AGENDAMENTO EXISTE E PERTENCE AO ASSOCIADO
    $sqlCheck = "SELECT id, profissional, especialidade, convenio_nome 
                 FROM sind.agendamento 
                 WHERE id = :id_agendamento 
                 AND cod_associado = :cod_associado 
                 AND id_empregador = :id_empregador";
    
    $stmtCheck = $pdo->prepare($sqlCheck);
    $stmtCheck->bindParam(':id_agendamento', $id_agendamento, PDO::PARAM_INT);
    $stmtCheck->bindParam(':cod_associado', $cod_associado, PDO::PARAM_STR);
    $stmtCheck->bindParam(':id_empregador', $id_empregador, PDO::PARAM_INT);
    $stmtCheck->execute();
    
    $agendamento = $stmtCheck->fetch(PDO::FETCH_ASSOC);
    
    if (!$agendamento) {
        echo json_encode([
            'success' => false,
            'message' => 'Agendamento não encontrado ou não pertence a este usuário'
        ]);
        exit;
    }
    
    // Log do agendamento encontrado
    error_log("AGENDAMENTO ENCONTRADO: " . json_encode($agendamento));
    
    // 🗑️ DELETAR O AGENDAMENTO
    $sqlDelete = "DELETE FROM sind.agendamento 
                  WHERE id = :id_agendamento 
                  AND cod_associado = :cod_associado 
                  AND id_empregador = :id_empregador";
    
    $stmtDelete = $pdo->prepare($sqlDelete);
    $stmtDelete->bindParam(':id_agendamento', $id_agendamento, PDO::PARAM_INT);
    $stmtDelete->bindParam(':cod_associado', $cod_associado, PDO::PARAM_STR);
    $stmtDelete->bindParam(':id_empregador', $id_empregador, PDO::PARAM_INT);
    
    if ($stmtDelete->execute()) {
        $affectedRows = $stmtDelete->rowCount();
        
        if ($affectedRows > 0) {
            // Log do sucesso
            error_log("AGENDAMENTO CANCELADO COM SUCESSO: ID=$id_agendamento");
            
            echo json_encode([
                'success' => true,
                'message' => 'Agendamento cancelado com sucesso',
                'data' => [
                    'id' => $id_agendamento,
                    'profissional' => $agendamento['profissional'],
                    'especialidade' => $agendamento['especialidade'],
                    'convenio_nome' => $agendamento['convenio_nome'],
                    'affected_rows' => $affectedRows
                ]
            ]);
        } else {
            error_log("NENHUM REGISTRO AFETADO: ID=$id_agendamento");
            echo json_encode([
                'success' => false,
                'message' => 'Nenhum agendamento foi cancelado'
            ]);
        }
    } else {
        $errorInfo = $stmtDelete->errorInfo();
        error_log("ERRO AO EXECUTAR DELETE: " . json_encode($errorInfo));
        echo json_encode([
            'success' => false,
            'message' => 'Erro ao cancelar agendamento: ' . $errorInfo[2]
        ]);
    }
    
} catch (PDOException $e) {
    error_log("ERRO PDO ao cancelar agendamento: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Erro de banco de dados: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log("ERRO GERAL ao cancelar agendamento: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno do servidor'
    ]);
} finally {
    // Fechar conexão PDO (opcional, PDO faz isso automaticamente)
    $pdo = null;
}
?> 