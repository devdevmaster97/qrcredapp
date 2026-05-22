<?php
error_log("========================================");
error_log(" SEGURO BENEFICIÁRIOS CRIAR - INICIANDO");
error_log("========================================");

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

error_log(" Tentando incluir arquivos...");
try {
    require '../../Adm/php/banco.php';
    error_log(" banco.php incluído com sucesso");
} catch (Exception $e) {
    error_log(" ERRO ao incluir banco.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erro ao carregar banco.php'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    include "../../Adm/php/funcoes.php";
    error_log(" funcoes.php incluído com sucesso");
} catch (Exception $e) {
    error_log(" AVISO ao incluir funcoes.php: " . $e->getMessage());
}

error_log(" Tentando conectar ao banco...");
try {
    $pdo = Banco::conectar_postgres();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    error_log(" Conexão com banco estabelecida");
} catch (Exception $e) {
    error_log(" ERRO ao conectar ao banco: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erro ao conectar ao banco'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {   
    error_log(" Lendo input JSON...");
    $input = json_decode(file_get_contents('php://input'), true);
    $id_associado = $input['id_associado'] ?? null;
    $id_divisao = $input['id_divisao'] ?? null;
    $quantidade = $input['quantidade'] ?? null;

    $request_id = uniqid('REQ-', true);
    error_log("🔑 [$request_id] Parâmetros recebidos: id_associado=$id_associado, id_divisao=$id_divisao, quantidade=$quantidade");
    error_log("🔍 [$request_id] TIPO de quantidade: " . gettype($quantidade));
    error_log("🔍 [$request_id] VALOR EXATO de quantidade: '" . var_export($quantidade, true) . "'");

    // Criar lock para evitar execução duplicada simultânea
    $lock_key = "criar_beneficiario_{$id_associado}_{$id_divisao}_{$quantidade}";
    $lock_file = sys_get_temp_dir() . "/{$lock_key}.lock";
    $lock_handle = fopen($lock_file, 'w');
    
    error_log("🔒 [$request_id] Tentando adquirir lock: $lock_file");
    
    // Tentar adquirir lock exclusivo (não bloqueante)
    if (!flock($lock_handle, LOCK_EX | LOCK_NB)) {
        error_log("⚠️ [$request_id] LOCK JÁ EXISTE! Requisição duplicada detectada. Aguardando...");
        // Aguardar até 5 segundos pelo lock
        $acquired = flock($lock_handle, LOCK_EX);
        if ($acquired) {
            error_log("✅ [$request_id] Lock adquirido após espera");
        } else {
            error_log("❌ [$request_id] Timeout ao aguardar lock");
            fclose($lock_handle);
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => 'Requisição duplicada detectada'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    } else {
        error_log("✅ [$request_id] Lock adquirido imediatamente");
    }

    if (!$id_associado || !$id_divisao || !$quantidade) {
        error_log(" Parâmetros obrigatórios ausentes");
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'id_associado, id_divisao e quantidade são obrigatórios'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($quantidade < 1 || $quantidade > 4) {
        error_log(" Quantidade inválida: $quantidade");
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Quantidade deve ser entre 1 e 4'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    error_log("🔄 [$request_id] Iniciando transação...");
    $pdo->beginTransaction();

    // Verificar quantos beneficiários já existem
    error_log("🔍 [$request_id] Verificando quantidade existente...");
    $query_count = "SELECT COUNT(*) as total FROM sind.seguro_beneficiarios 
                    WHERE id_associado = :id_associado AND id_divisao = :id_divisao";
    $stmt_count = $pdo->prepare($query_count);
    $stmt_count->execute([
        ':id_associado' => $id_associado,
        ':id_divisao' => $id_divisao
    ]);
    $row_count = $stmt_count->fetch(PDO::FETCH_ASSOC);
    $total_existente = (int)$row_count['total'];

    error_log("📊 [$request_id] Total existente: $total_existente, Solicitado: $quantidade");

    if ($total_existente + $quantidade > 4) {
        error_log("❌ Limite excedido: $total_existente + $quantidade > 4");
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => "Você já possui $total_existente beneficiário(s). Máximo permitido: 4"
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // VERIFICAÇÃO CRÍTICA: Contar registros ANTES do INSERT
    $query_count_before = "SELECT COUNT(*) as total FROM sind.seguro_beneficiarios 
                           WHERE id_associado = :id_associado AND id_divisao = :id_divisao";
    $stmt_count_before = $pdo->prepare($query_count_before);
    $stmt_count_before->execute([
        ':id_associado' => $id_associado,
        ':id_divisao' => $id_divisao
    ]);
    $count_before = $stmt_count_before->fetch(PDO::FETCH_ASSOC)['total'];
    error_log("📊 [$request_id] CONTAGEM ANTES DO INSERT: $count_before beneficiários");

    // Inserir novos beneficiários
    error_log("➕ [$request_id] Inserindo $quantidade beneficiário(s)...");
    $beneficiarios_criados = [];
    $query_insert = "INSERT INTO sind.seguro_beneficiarios 
                     (id_associado, id_divisao, status, data_criacao) 
                     VALUES (:id_associado, :id_divisao, 'pendente', NOW()) 
                     RETURNING id_beneficiario, id_associado, id_divisao, status, data_criacao";

    error_log("🔁 [$request_id] INICIANDO LOOP - quantidade=$quantidade, tipo=" . gettype($quantidade));
    for ($i = 0; $i < $quantidade; $i++) {
        error_log("   ➡️ [$request_id] ITERAÇÃO $i - Inserindo beneficiário " . ($i + 1) . "/$quantidade");
        $stmt_insert = $pdo->prepare($query_insert);
        $stmt_insert->execute([
            ':id_associado' => $id_associado,
            ':id_divisao' => $id_divisao
        ]);

        $beneficiario = $stmt_insert->fetch(PDO::FETCH_ASSOC);
        $beneficiarios_criados[] = $beneficiario;
        error_log("   ✅ [$request_id] ITERAÇÃO $i - Beneficiário criado: ID " . $beneficiario['id_beneficiario']);
        error_log("   📊 [$request_id] Total criados até agora: " . count($beneficiarios_criados));
    }
    error_log("🏁 [$request_id] LOOP FINALIZADO - Total de iterações executadas: $i");
    error_log("📋 [$request_id] Array beneficiarios_criados tem " . count($beneficiarios_criados) . " elementos");
    
    // VERIFICAÇÃO CRÍTICA: Contar registros DEPOIS do INSERT (antes do commit)
    $query_count_after = "SELECT COUNT(*) as total FROM sind.seguro_beneficiarios 
                          WHERE id_associado = :id_associado AND id_divisao = :id_divisao";
    $stmt_count_after = $pdo->prepare($query_count_after);
    $stmt_count_after->execute([
        ':id_associado' => $id_associado,
        ':id_divisao' => $id_divisao
    ]);
    $count_after = $stmt_count_after->fetch(PDO::FETCH_ASSOC)['total'];
    error_log("📊 [$request_id] CONTAGEM DEPOIS DO INSERT (antes commit): $count_after beneficiários");
    error_log("🔢 [$request_id] DIFERENÇA: " . ($count_after - $count_before) . " novos registros (esperado: $quantidade)");
    
    if (($count_after - $count_before) != $quantidade) {
        error_log("⚠️⚠️⚠️ [$request_id] ALERTA CRÍTICO: Diferença não bate! Esperado $quantidade, mas foram inseridos " . ($count_after - $count_before));
    }

    error_log("💾 [$request_id] Commit da transação...");
    $pdo->commit();
    error_log("✅ [$request_id] Transação commitada com sucesso! Total criado: " . count($beneficiarios_criados));

    // Liberar lock
    flock($lock_handle, LOCK_UN);
    fclose($lock_handle);
    @unlink($lock_file);
    error_log("🔓 [$request_id] Lock liberado");

    echo json_encode([
        'success' => true,
        'data' => $beneficiarios_criados,
        'message' => "$quantidade beneficiário(s) criado(s) com sucesso"
    ], JSON_UNESCAPED_UNICODE);
    
    error_log("✅ [$request_id] Resposta JSON enviada com sucesso");
    error_log("========================================");

} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // Liberar lock em caso de erro
    if (isset($lock_handle)) {
        flock($lock_handle, LOCK_UN);
        fclose($lock_handle);
        if (isset($lock_file)) @unlink($lock_file);
    }
    error_log("Erro ao criar beneficiários: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro ao criar beneficiários. Tente novamente.'
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // Liberar lock em caso de erro
    if (isset($lock_handle)) {
        flock($lock_handle, LOCK_UN);
        fclose($lock_handle);
        if (isset($lock_file)) @unlink($lock_file);
    }
    error_log("Erro geral ao criar beneficiários: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro ao criar beneficiários. Tente novamente.'
    ], JSON_UNESCAPED_UNICODE);
}
