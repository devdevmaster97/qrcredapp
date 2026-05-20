<?php
error_log("========================================");
error_log("📋 SEGURO BENEFICIÁRIOS LISTAR - INICIANDO");
error_log("========================================");

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

error_log("🔧 Tentando incluir arquivos...");
try {
    require '../../Adm/php/banco.php';
    error_log("✅ banco.php incluído com sucesso");
} catch (Exception $e) {
    error_log("❌ ERRO ao incluir banco.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erro ao carregar banco.php']);
    exit;
}

try {
    include "../../Adm/php/funcoes.php";
    error_log("✅ funcoes.php incluído com sucesso");
} catch (Exception $e) {
    error_log("⚠️ AVISO ao incluir funcoes.php: " . $e->getMessage());
}

error_log("🔌 Tentando conectar ao banco...");
try {
    $pdo = Banco::conectar_postgres();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    error_log("✅ Conexão com banco estabelecida");
} catch (Exception $e) {
    error_log("❌ ERRO ao conectar ao banco: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erro ao conectar ao banco']);
    exit;
}

try {
    $id_associado = $_GET['id_associado'] ?? null;
    $id_divisao = $_GET['id_divisao'] ?? null;

    error_log("📥 Parâmetros recebidos: id_associado=$id_associado, id_divisao=$id_divisao");

    if (!$id_associado || !$id_divisao) {
        error_log("❌ Parâmetros obrigatórios ausentes");
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'id_associado e id_divisao são obrigatórios'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    error_log("🔍 Preparando query SQL...");
    $query = "SELECT id_beneficiario, id_associado, id_divisao, cpf_zap, nome_zap,
                     nome_beneficiario, data_nascimento, parentesco, percentual,
                     status, doc_token, data_criacao, data_assinatura
              FROM sind.seguro_beneficiarios 
              WHERE id_associado = :id_associado AND id_divisao = :id_divisao
              ORDER BY data_criacao ASC";

    error_log("📝 Query preparada, executando...");
    $stmt = $pdo->prepare($query);
    $stmt->bindParam(':id_associado', $id_associado, PDO::PARAM_INT);
    $stmt->bindParam(':id_divisao', $id_divisao, PDO::PARAM_INT);
    $stmt->execute();

    $beneficiarios = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $total = count($beneficiarios);
    
    error_log("✅ Query executada com sucesso! Total de beneficiários: $total");

    echo json_encode([
        'success' => true,
        'beneficiarios' => $beneficiarios
    ], JSON_UNESCAPED_UNICODE);
    
    error_log("✅ Resposta JSON enviada com sucesso");
    error_log("========================================");

} catch (PDOException $e) {
    error_log("❌ ERRO PDO: " . $e->getMessage());
    error_log("❌ Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro ao listar beneficiários. Tente novamente.'
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    error_log("❌ ERRO GERAL: " . $e->getMessage());
    error_log("❌ Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro ao listar beneficiários. Tente novamente.'
    ], JSON_UNESCAPED_UNICODE);
}
