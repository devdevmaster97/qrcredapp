<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'conexao.php';

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $id_beneficiario = $data['id_beneficiario'] ?? null;
    $id_associado = $data['id_associado'] ?? null;

    if (!$id_beneficiario || !$id_associado) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'id_beneficiario e id_associado são obrigatórios'
        ]);
        exit;
    }

    // Verificar se o beneficiário existe e pertence ao associado
    $query_check = "SELECT id, status FROM sind.seguro_beneficiarios 
                    WHERE id = $1 AND id_associado = $2";
    $result_check = pg_query_params($conn, $query_check, [$id_beneficiario, $id_associado]);

    if (!$result_check || pg_num_rows($result_check) === 0) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Beneficiário não encontrado ou não pertence a este associado'
        ]);
        exit;
    }

    $beneficiario = pg_fetch_assoc($result_check);

    // Não permitir exclusão se já foi assinado
    if ($beneficiario['status'] === 'assinado') {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Não é possível excluir beneficiário com documento já assinado'
        ]);
        exit;
    }

    // Excluir beneficiário
    $query_delete = "DELETE FROM sind.seguro_beneficiarios 
                     WHERE id = $1 AND id_associado = $2";
    $result_delete = pg_query_params($conn, $query_delete, [$id_beneficiario, $id_associado]);

    if (!$result_delete) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao excluir beneficiário: ' . pg_last_error($conn)
        ]);
        exit;
    }

    echo json_encode([
        'success' => true,
        'message' => 'Beneficiário excluído com sucesso'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro ao excluir beneficiário: ' . $e->getMessage()
    ]);
}
