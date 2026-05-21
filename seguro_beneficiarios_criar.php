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

    // Inserir novos beneficiários
    error_log("➕ [$request_id] Inserindo $quantidade beneficiário(s)...");
    $beneficiarios_criados = [];
    $query_insert = "INSERT INTO sind.seguro_beneficiarios 
                     (id_associado, id_divisao, status, data_criacao) 
                     VALUES (:id_associado, :id_divisao, 'pendente', NOW()) 
                     RETURNING id_beneficiario, id_associado, id_divisao, status, data_criacao";

    for ($i = 0; $i < $quantidade; $i++) {
        error_log("   ➡️ [$request_id] Inserindo beneficiário " . ($i + 1) . "/$quantidade");
        $stmt_insert = $pdo->prepare($query_insert);
        $stmt_insert->execute([
            ':id_associado' => $id_associado,
            ':id_divisao' => $id_divisao
        ]);

        $beneficiario = $stmt_insert->fetch(PDO::FETCH_ASSOC);
        $beneficiarios_criados[] = $beneficiario;
        error_log("   ✅ [$request_id] Beneficiário criado: ID " . $beneficiario['id_beneficiario']);
    }

    error_log("💾 [$request_id] Commit da transação...");
    $pdo->commit();
    error_log("✅ [$request_id] Transação commitada com sucesso! Total criado: " . count($beneficiarios_criados));

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
    error_log("Erro geral ao criar beneficiários: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro ao criar beneficiários. Tente novamente.'
    ], JSON_UNESCAPED_UNICODE);
}
