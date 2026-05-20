<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require '../../Adm/php/banco.php';
include "../../Adm/php/funcoes.php";

try {
    $pdo = Banco::conectar_postgres();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    $id_beneficiario = $data['id_beneficiario'] ?? null;
    $id_associado = $data['id_associado'] ?? null;

    if (!$id_beneficiario || !$id_associado) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'id_beneficiario e id_associado são obrigatórios'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Verificar se o beneficiário existe e pertence ao associado
    $query_check = "SELECT id_beneficiario, status FROM sind.seguro_beneficiarios 
                    WHERE id_beneficiario = :id_beneficiario AND id_associado = :id_associado";
    $stmt_check = $pdo->prepare($query_check);
    $stmt_check->execute([
        ':id_beneficiario' => $id_beneficiario,
        ':id_associado' => $id_associado
    ]);

    $beneficiario = $stmt_check->fetch(PDO::FETCH_ASSOC);

    if (!$beneficiario) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Beneficiário não encontrado ou não pertence a este associado'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Não permitir exclusão se já foi assinado
    if ($beneficiario['status'] === 'assinado') {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Não é possível excluir beneficiário com documento já assinado'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Excluir beneficiário
    $query_delete = "DELETE FROM sind.seguro_beneficiarios 
                     WHERE id_beneficiario = :id_beneficiario AND id_associado = :id_associado";
    $stmt_delete = $pdo->prepare($query_delete);
    $stmt_delete->execute([
        ':id_beneficiario' => $id_beneficiario,
        ':id_associado' => $id_associado
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Beneficiário excluído com sucesso'
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log("Erro ao excluir beneficiário: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro ao excluir beneficiário. Tente novamente.'
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    error_log("Erro geral ao excluir beneficiário: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro ao excluir beneficiário. Tente novamente.'
    ], JSON_UNESCAPED_UNICODE);
}
