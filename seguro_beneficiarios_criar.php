<?php
// Função de log customizada para debug via browser
function debug_log($message) {
    $log_file = __DIR__ . '/debug_seguro_beneficiarios.log';
    $timestamp = date('Y-m-d H:i:s.u');
    $log_entry = "[$timestamp] $message\n";
    file_put_contents($log_file, $log_entry, FILE_APPEND);
    error_log($message); // Mantém log padrão também
}

debug_log("========================================");
debug_log("🚀 SEGURO BENEFICIÁRIOS CRIAR - INICIANDO");
debug_log("========================================");

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

debug_log("🔧 Tentando incluir arquivos...");
try {
    require '../../Adm/php/banco.php';
    debug_log("✅ banco.php incluído com sucesso");
} catch (Exception $e) {
    debug_log("❌ ERRO ao incluir banco.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erro ao carregar banco.php'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    include "../../Adm/php/funcoes.php";
    debug_log("✅ funcoes.php incluído com sucesso");
} catch (Exception $e) {
    debug_log("⚠️ AVISO ao incluir funcoes.php: " . $e->getMessage());
}

debug_log("🔌 Tentando conectar ao banco...");
try {
    $pdo = Banco::conectar_postgres();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    debug_log("✅ Conexão com banco estabelecida");
} catch (Exception $e) {
    debug_log("❌ ERRO ao conectar ao banco: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erro ao conectar ao banco'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {   
    debug_log("📖 Lendo input JSON...");
    $input = json_decode(file_get_contents('php://input'), true);
    $id_associado = $input['id_associado'] ?? null;
    $id_divisao = $input['id_divisao'] ?? null;
    $quantidade = $input['quantidade'] ?? null;

    $request_id = uniqid('REQ-', true);
    debug_log("🔑 [$request_id] Parâmetros recebidos: id_associado=$id_associado, id_divisao=$id_divisao, quantidade=$quantidade");
    debug_log("🔍 [$request_id] TIPO de quantidade: " . gettype($quantidade));
    debug_log("🔍 [$request_id] VALOR EXATO de quantidade: '" . var_export($quantidade, true) . "'");

    // PROTEÇÃO ANTI-DUPLICAÇÃO: Verificar se requisição idêntica foi processada recentemente
    $cache_key = "criar_beneficiario_{$id_associado}_{$id_divisao}_{$quantidade}";
    $cache_file = sys_get_temp_dir() . "/{$cache_key}.cache";
    
    if (file_exists($cache_file)) {
        $last_request_time = (float)file_get_contents($cache_file);
        $time_diff = microtime(true) - $last_request_time;
        
        if ($time_diff < 2.0) { // 2 segundos
            debug_log("🚫 [$request_id] REQUISIÇÃO DUPLICADA BLOQUEADA! Última requisição há " . round($time_diff * 1000) . "ms");
            http_response_code(429);
            echo json_encode([
                'success' => false,
                'error' => 'Requisição duplicada detectada. Aguarde 2 segundos.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
    
    // Marcar timestamp desta requisição
    file_put_contents($cache_file, microtime(true));
    debug_log("✅ [$request_id] Timestamp registrado: " . microtime(true));

    // Criar lock para evitar execução duplicada simultânea
    $lock_key = "criar_beneficiario_{$id_associado}_{$id_divisao}_{$quantidade}";
    $lock_file = sys_get_temp_dir() . "/{$lock_key}.lock";
    $lock_handle = fopen($lock_file, 'w');
    
    debug_log("🔒 [$request_id] Tentando adquirir lock: $lock_file");
    
    // Tentar adquirir lock exclusivo (não bloqueante)
    if (!flock($lock_handle, LOCK_EX | LOCK_NB)) {
        debug_log("⚠️ [$request_id] LOCK JÁ EXISTE! Requisição duplicada detectada. Aguardando...");
        // Aguardar até 5 segundos pelo lock
        $acquired = flock($lock_handle, LOCK_EX);
        if ($acquired) {
            debug_log("✅ [$request_id] Lock adquirido após espera");
        } else {
            debug_log("❌ [$request_id] Timeout ao aguardar lock");
            fclose($lock_handle);
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => 'Requisição duplicada detectada'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    } else {
        debug_log("✅ [$request_id] Lock adquirido imediatamente");
    }

    if (!$id_associado || !$id_divisao || !$quantidade) {
        debug_log("❌ Parâmetros obrigatórios ausentes");
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'id_associado, id_divisao e quantidade são obrigatórios'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($quantidade < 1 || $quantidade > 4) {
        debug_log("❌ Quantidade inválida: $quantidade");
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Quantidade deve ser entre 1 e 4'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    debug_log("🔄 [$request_id] Iniciando transação...");
    $pdo->beginTransaction();
    
    // LOCK de tabela para evitar inserções concorrentes
    debug_log("🔒 [$request_id] Aplicando LOCK na tabela seguro_beneficiarios...");
    $pdo->exec("LOCK TABLE sind.seguro_beneficiarios IN EXCLUSIVE MODE");
    debug_log("✅ [$request_id] LOCK de tabela aplicado com sucesso");

    // Verificar quantos beneficiários já existem
    debug_log("🔍 [$request_id] Verificando quantidade existente...");
    $query_count = "SELECT COUNT(*) as total FROM sind.seguro_beneficiarios 
                    WHERE id_associado = :id_associado AND id_divisao = :id_divisao";
    $stmt_count = $pdo->prepare($query_count);
    $stmt_count->execute([
        ':id_associado' => $id_associado,
        ':id_divisao' => $id_divisao
    ]);
    $row_count = $stmt_count->fetch(PDO::FETCH_ASSOC);
    $total_existente = (int)$row_count['total'];

    debug_log("📊 [$request_id] Total existente: $total_existente, Solicitado: $quantidade");

    if ($total_existente + $quantidade > 4) {
        debug_log("❌ Limite excedido: $total_existente + $quantidade > 4");
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
    debug_log("📊 [$request_id] CONTAGEM ANTES DO INSERT: $count_before beneficiários");

    // Inserir novos beneficiários
    debug_log("➕ [$request_id] Inserindo $quantidade beneficiário(s)...");
    $beneficiarios_criados = [];
    $query_insert = "INSERT INTO sind.seguro_beneficiarios 
                     (id_associado, id_divisao, status, data_criacao) 
                     VALUES (:id_associado, :id_divisao, 'pendente', NOW()) 
                     RETURNING id_beneficiario, id_associado, id_divisao, status, data_criacao";

    debug_log("🔁 [$request_id] INICIANDO LOOP - quantidade=$quantidade, tipo=" . gettype($quantidade));
    debug_log("🔍 [$request_id] Valor de \$quantidade ANTES do loop: $quantidade");
    debug_log("🔍 [$request_id] Condição do loop: \$i < $quantidade");
    
    for ($i = 0; $i < $quantidade; $i++) {
        debug_log("   ➡️ [$request_id] ITERAÇÃO $i - Inserindo beneficiário " . ($i + 1) . "/$quantidade");
        $stmt_insert = $pdo->prepare($query_insert);
        $stmt_insert->execute([
            ':id_associado' => $id_associado,
            ':id_divisao' => $id_divisao
        ]);

        $beneficiario = $stmt_insert->fetch(PDO::FETCH_ASSOC);
        $beneficiarios_criados[] = $beneficiario;
        debug_log("   ✅ [$request_id] ITERAÇÃO $i - Beneficiário criado: ID " . $beneficiario['id_beneficiario']);
        debug_log("   📊 [$request_id] Total criados até agora: " . count($beneficiarios_criados));
    }
    debug_log("🏁 [$request_id] LOOP FINALIZADO - Total de iterações executadas: $i");
    debug_log("📋 [$request_id] Array beneficiarios_criados tem " . count($beneficiarios_criados) . " elementos");
    debug_log("🔍 [$request_id] Valor de \$quantidade DEPOIS do loop: $quantidade");
    debug_log("🔍 [$request_id] Valor de \$i DEPOIS do loop: $i");
    
    // VERIFICAÇÃO CRÍTICA: Contar registros DEPOIS do INSERT (antes do commit)
    $query_count_after = "SELECT COUNT(*) as total FROM sind.seguro_beneficiarios 
                          WHERE id_associado = :id_associado AND id_divisao = :id_divisao";
    $stmt_count_after = $pdo->prepare($query_count_after);
    $stmt_count_after->execute([
        ':id_associado' => $id_associado,
        ':id_divisao' => $id_divisao
    ]);
    $count_after = $stmt_count_after->fetch(PDO::FETCH_ASSOC)['total'];
    debug_log("📊 [$request_id] CONTAGEM DEPOIS DO INSERT (antes commit): $count_after beneficiários");
    debug_log("🔢 [$request_id] DIFERENÇA: " . ($count_after - $count_before) . " novos registros (esperado: $quantidade)");
    
    if (($count_after - $count_before) != $quantidade) {
        debug_log("⚠️⚠️⚠️ [$request_id] ALERTA CRÍTICO: Diferença não bate! Esperado $quantidade, mas foram inseridos " . ($count_after - $count_before));
    }

    debug_log("💾 [$request_id] Commit da transação...");
    $pdo->commit();
    debug_log("✅ [$request_id] Transação commitada com sucesso! Total criado: " . count($beneficiarios_criados));

    // Liberar lock
    flock($lock_handle, LOCK_UN);
    fclose($lock_handle);
    @unlink($lock_file);
    debug_log("🔓 [$request_id] Lock liberado");

    echo json_encode([
        'success' => true,
        'data' => $beneficiarios_criados,
        'message' => "$quantidade beneficiário(s) criado(s) com sucesso"
    ], JSON_UNESCAPED_UNICODE);
    
    debug_log("✅ [$request_id] Resposta JSON enviada com sucesso");
    debug_log("========================================");

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
    debug_log("❌ ERRO PDO ao criar beneficiários: " . $e->getMessage());
    debug_log("❌ Stack trace: " . $e->getTraceAsString());
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
    debug_log("❌ ERRO GERAL ao criar beneficiários: " . $e->getMessage());
    debug_log("❌ Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro ao criar beneficiários. Tente novamente.'
    ], JSON_UNESCAPED_UNICODE);
}
