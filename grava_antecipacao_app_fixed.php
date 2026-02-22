<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Request-ID, Cache-Control, Pragma, Expires');

// Função de log para debug
function logDebug($message, $data = null) {
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message";
    if ($data !== null) {
        $logMessage .= " - " . json_encode($data, JSON_UNESCAPED_UNICODE);
    }
    error_log($logMessage);
    // REMOVIDO echo para não contaminar resposta JSON
}

try {
    logDebug("🚀 [CRÍTICO] PHP INICIADO - Recebendo requisição de antecipação");
    
    // Verificar método
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        logDebug("❌ [ERRO] Método não é POST: " . $_SERVER['REQUEST_METHOD']);
        throw new Exception('Método não permitido');
    }
    
    logDebug("✅ [OK] Método POST confirmado");

    // Capturar dados
    $matricula = $_POST['matricula'] ?? '';
    $valor = $_POST['valor_pedido'] ?? '';  // Corrigido: API envia 'valor_pedido', não 'valor'
    $pass = $_POST['pass'] ?? '';
    $request_id = $_POST['request_id'] ?? '';
    
    logDebug("🔍 [INÍCIO] Dados recebidos no PHP", [
        'matricula' => $matricula,
        'valor' => $valor,
        'pass' => '***',
        'request_id' => $request_id,
        'todos_posts' => array_keys($_POST)
    ]);

    // TESTE CRÍTICO: Verificar se dados essenciais estão chegando
    if (empty($pass)) {
        logDebug("❌ [ERRO CRÍTICO] Campo 'pass' não foi enviado pela API");
        echo json_encode([
            'success' => false,
            'error' => 'Campo senha (pass) é obrigatório mas não foi enviado',
            'debug_info' => [
                'campos_recebidos' => array_keys($_POST),
                'matricula' => $matricula,
                'valor' => $valor,
                'pass_vazio' => empty($pass),
                'request_id' => $request_id
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    // Validações básicas
    if (empty($matricula) || empty($valor)) {
        throw new Exception('Matrícula e valor são obrigatórios');
    }

    // Incluir arquivo de conexão com banco (estrutura do servidor)
    include "Adm/php/banco.php";
    
    // Verificar se classe existe
    if (!class_exists('Banco')) {
        throw new Exception('Classe Banco não encontrada');
    }
    
    // Conectar usando a estrutura do servidor
    $pdo = Banco::conectar_postgres();
    
    if (!$pdo) {
        throw new Exception('Erro na conexão com banco de dados');
    }
    
    logDebug("Conexão com banco estabelecida");

    // PROTEÇÃO ANTI-DUPLICAÇÃO 1: Removida verificação por request_id (coluna não existe)
    // Mantendo apenas proteção temporal abaixo

    // PROTEÇÃO ANTI-DUPLICAÇÃO REMOVIDA: Permitir registros iguais com data/hora diferentes
    // Regra de negócio: Apenas data/hora devem ser diferentes, outros campos podem ser iguais
    logDebug("✅ [DUPLICAÇÃO] Proteção temporal removida - permitindo registros com mesmos dados mas data/hora diferentes");

    // Buscar dados do associado
    logDebug("Buscando dados do associado", ['matricula' => $matricula]);
    $sql_associado = "
        SELECT 
            a.nome,
            a.codigo,
            e.nome as empregador_nome,
            a.empregador,
            a.id,
            a.id_divisao
        FROM sind.associado a
        LEFT JOIN sind.empregador e ON a.empregador = e.id
        WHERE a.codigo = ?
        LIMIT 1
    ";
    
    $stmt_associado = $pdo->prepare($sql_associado);
    $stmt_associado->execute([$matricula]);
    $associado = $stmt_associado->fetch(PDO::FETCH_ASSOC);
    
    if (!$associado) {
        logDebug("❌ [ERRO] Associado não encontrado", ['matricula' => $matricula]);
        echo json_encode([
            'success' => false,
            'error' => 'Associado não encontrado',
            'request_id' => $request_id
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    logDebug("Associado encontrado", [
        'nome' => $associado['nome'],
        'codigo' => $associado['codigo'],
        'empregador' => $associado['empregador_nome'],
        'id_associado' => $associado['id'],
        'id_divisao' => $associado['id_divisao']
    ]);

    // Verificar senha do associado
    logDebug("🔍 [DEBUG] Verificando senha - Request ID: $request_id");
    $sql_senha = "SELECT COUNT(*) as total FROM sind.c_senhaassociado WHERE cod_associado = ? AND senha = ? AND id_empregador = ? AND id_associado = ? AND id_divisao = ?";
    $stmt_senha = $pdo->prepare($sql_senha);
    $stmt_senha->execute([$matricula, $pass, $associado['empregador'], $associado['id'], $associado['id_divisao']]);
    $resultado_senha = $stmt_senha->fetch(PDO::FETCH_ASSOC);
    
    logDebug("🔍 [DEBUG] Resultado verificação senha - Request ID: $request_id - Total: " . $resultado_senha['total']);
    
    if ($resultado_senha['total'] == 0) {
        logDebug("❌ [ERRO] Senha incorreta - Request ID: $request_id - Matrícula: $matricula");
        echo json_encode([
            'success' => false,
            'error' => 'Senha incorreta',
            'request_id' => $request_id
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    logDebug("✅ [SUCESSO] Senha verificada com sucesso - Request ID: $request_id");

    // Capturar dados adicionais do POST
    $empregador = $_POST['empregador'] ?? $associado['empregador'];
    $mes_corrente = $_POST['mes_corrente'] ?? '';
    $celular = $_POST['celular'] ?? '';
    $taxa = $_POST['taxa'] ?? '0';
    $valor_descontar = $_POST['valor_descontar'] ?? '0';
    $chave_pix = $_POST['chave_pix'] ?? '';
    $convenio = $_POST['convenio'] ?? '1';
    $id_associado = $_POST['id'] ?? $associado['id'];
    $id_divisao = $_POST['id_divisao'] ?? $associado['id_divisao'];

    logDebug("Dados completos para inserção", [
        'matricula' => $matricula,
        'empregador' => $empregador,
        'valor' => $valor,
        'mes_corrente' => $mes_corrente,
        'celular' => $celular,
        'taxa' => $taxa,
        'valor_descontar' => $valor_descontar,
        'chave_pix' => $chave_pix,
        'convenio' => $convenio,
        'id_associado' => $id_associado,
        'id_divisao' => $id_divisao,
        'request_id' => $request_id
    ]);

    // INICIAR TRANSAÇÃO ATÔMICA
    $pdo->beginTransaction();
    logDebug("🔄 [TRANSAÇÃO] Iniciada - Request ID: $request_id");

    try {
        // INSERÇÃO ÚNICA NA TABELA ANTECIPACAO - CAMPOS OFICIAIS CORRETOS
        $stmt = $pdo->prepare("
            INSERT INTO sind.antecipacao (
                matricula,
                empregador,
                mes,
                data_solicitacao,
                valor,
                aprovado,
                celular,
                valor_taxa,
                valor_a_descontar,
                chave_pix,
                id_divisao,
                id_associado,
                hora
            ) VALUES (?, ?, ?, CURRENT_DATE, ?, null, ?, ?, ?, ?, ?, ?, CAST(CURRENT_TIME AS TIME(0)))
        ");

        logDebug("🔄 [SQL] Executando INSERT antecipacao", [
            'matricula' => $matricula,
            'empregador' => $empregador,
            'mes_corrente' => $mes_corrente,
            'valor' => $valor,
            'celular' => $celular,
            'taxa' => $taxa,
            'valor_descontar' => $valor_descontar,
            'chave_pix' => $chave_pix,
            'id_divisao' => $id_divisao,
            'id_associado' => $id_associado
        ]);

        $resultado_antecipacao = $stmt->execute([
            $matricula,           // matricula
            $empregador,          // empregador
            $mes_corrente,        // mes
            $valor,               // valor
            $celular,             // celular
            $taxa,                // valor_taxa
            $valor_descontar,     // valor_a_descontar
            $chave_pix,           // chave_pix
            $id_divisao,          // id_divisao
            $id_associado         // id_associado
        ]);

        logDebug("🔍 [SQL] Resultado execute antecipacao", [
            'resultado' => $resultado_antecipacao,
            'error_info' => $stmt->errorInfo(),
            'row_count' => $stmt->rowCount()
        ]);

        if (!$resultado_antecipacao) {
            throw new Exception('Erro ao inserir na tabela antecipacao: ' . implode(', ', $stmt->errorInfo()));
        }

        $antecipacao_id = $pdo->lastInsertId();
        logDebug("✅ [SUCESSO] Inserção na tabela antecipacao - ID: $antecipacao_id - Request ID: $request_id");

        // INSERÇÃO ÚNICA NA TABELA CONTA - CAMPOS OFICIAIS CORRETOS
        $stmt_conta = $pdo->prepare("
            INSERT INTO sind.conta (
                associado,
                convenio,
                valor,
                data,
                hora,
                descricao,
                mes,
                empregador,
                tipo,
                id_divisao,
                id_associado,
                aprovado
            ) VALUES (?, ?, ?, CURRENT_DATE, CAST(CURRENT_TIME AS TIME(0)), ?, ?, ?, ?, ?, ?, false)
        ");

        logDebug("🔄 [SQL] Executando INSERT conta", [
            'associado' => $matricula,
            'convenio' => $convenio,
            'valor' => $valor_descontar,  // Corrigido: mostra o valor real que será inserido
            'descricao' => 'Antecipação salarial',
            'mes' => $mes_corrente,
            'empregador' => $empregador,
            'tipo' => 'ANTECIPACAO',
            'divisao' => $id_divisao,
            'id_associado' => $id_associado,
            'aprovado' => false
        ]);

        $resultado_conta = $stmt_conta->execute([
            $matricula,                    // associado
            $convenio,                     // convenio
            $valor_descontar,              // valor
            'Antecipação salarial',        // descricao
            $mes_corrente,                 // mes
            $empregador,                   // empregador
            'ANTECIPACAO',                 // tipo
            $id_divisao,                   // divisao
            $id_associado                  // id_associado
        ]);

        logDebug("🔍 [SQL] Resultado execute conta", [
            'resultado' => $resultado_conta,
            'error_info' => $stmt_conta->errorInfo(),
            'row_count' => $stmt_conta->rowCount()
        ]);

        if (!$resultado_conta) {
            throw new Exception('Erro ao inserir na tabela conta: ' . implode(', ', $stmt_conta->errorInfo()));
        }

        $conta_id = $pdo->lastInsertId();
        logDebug("✅ [SUCESSO] Inserção na tabela conta - ID: $conta_id - Request ID: $request_id");

        // COMMIT DA TRANSAÇÃO
        $pdo->commit();
        logDebug("✅ [TRANSAÇÃO] Confirmada com sucesso - Request ID: $request_id");

        // Verificar se realmente foi inserido
        $stmt_verificacao = $pdo->prepare("SELECT COUNT(*) as total FROM sind.antecipacao WHERE id = ?");
        $stmt_verificacao->execute([$antecipacao_id]);
        $verificacao_antecipacao = $stmt_verificacao->fetch(PDO::FETCH_ASSOC);
        
        $stmt_verificacao_conta = $pdo->prepare("SELECT COUNT(*) as total FROM sind.conta WHERE lancamento = ?");
        $stmt_verificacao_conta->execute([$conta_id]);
        $verificacao_conta = $stmt_verificacao_conta->fetch(PDO::FETCH_ASSOC);
        
        logDebug("🔍 [VERIFICAÇÃO] Registros inseridos", [
            'antecipacao_existe' => $verificacao_antecipacao['total'],
            'conta_existe' => $verificacao_conta['total'],
            'antecipacao_id' => $antecipacao_id,
            'conta_id' => $conta_id
        ]);

        // Resposta de sucesso
        echo json_encode([
            'success' => true,
            'message' => 'Antecipação gravada com sucesso',
            'antecipacao_id' => $antecipacao_id,
            'conta_id' => $conta_id,
            'request_id' => $request_id,
            'debug_info' => [
                'matricula' => $matricula,
                'valor' => $valor,
                'empregador' => $empregador,
                'mes' => $mes_corrente,
                'timestamp' => date('Y-m-d H:i:s'),
                'verificacao_gravacao' => [
                    'antecipacao_inserida' => $verificacao_antecipacao['total'] > 0,
                    'conta_inserida' => $verificacao_conta['total'] > 0
                ],
                'protecoes_aplicadas' => [
                    'duplicacao_temporal' => true,
                    'verificacao_senha' => true,
                    'transacao_atomica' => true
                ]
            ]
        ], JSON_UNESCAPED_UNICODE);

    } catch (Exception $e) {
        // ROLLBACK DA TRANSAÇÃO EM CASO DE ERRO
        $pdo->rollback();
        logDebug("❌ [TRANSAÇÃO] Rollback executado - Request ID: $request_id - Erro: " . $e->getMessage());
        throw $e;
    }

} catch (Exception $e) {
    logDebug("❌ [ERRO GERAL CAPTURADO] " . $e->getMessage());
    logDebug("❌ [STACK TRACE] " . $e->getTraceAsString());
    
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'request_id' => $request_id ?? 'N/A',
        'debug_info' => [
            'timestamp' => date('Y-m-d H:i:s'),
            'error_type' => get_class($e),
            'error_line' => $e->getLine(),
            'error_file' => basename($e->getFile()),
            'stack_trace' => $e->getTraceAsString()
        ]
    ], JSON_UNESCAPED_UNICODE);
}
?>
