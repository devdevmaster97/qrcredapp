<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'conexao.php';

try {
    $id_associado = $_GET['id_associado'] ?? null;
    $id_divisao = $_GET['id_divisao'] ?? null;

    if (!$id_associado || !$id_divisao) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'id_associado e id_divisao são obrigatórios'
        ]);
        exit;
    }

    $query = "SELECT id, id_associado, id_divisao, nome, cpf, parentesco, 
                     data_nascimento, status, data_cadastro, data_atualizacao,
                     documento_url, documento_assinado_url
              FROM sind.seguro_beneficiarios 
              WHERE id_associado = $1 AND id_divisao = $2
              ORDER BY data_cadastro ASC";

    $result = pg_query_params($conn, $query, [$id_associado, $id_divisao]);

    if (!$result) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao buscar beneficiários: ' . pg_last_error($conn)
        ]);
        exit;
    }

    $beneficiarios = [];
    while ($row = pg_fetch_assoc($result)) {
        $beneficiarios[] = $row;
    }

    echo json_encode([
        'success' => true,
        'data' => $beneficiarios
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro ao listar beneficiários: ' . $e->getMessage()
    ]);
}
