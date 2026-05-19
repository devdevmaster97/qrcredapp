<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'conexao.php';

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $id_associado = $data['id_associado'] ?? null;
    $id_divisao = $data['id_divisao'] ?? null;
    $quantidade = $data['quantidade'] ?? null;

    if (!$id_associado || !$id_divisao || !$quantidade) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'id_associado, id_divisao e quantidade são obrigatórios'
        ]);
        exit;
    }

    if ($quantidade < 1 || $quantidade > 4) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Quantidade deve ser entre 1 e 4'
        ]);
        exit;
    }

    pg_query($conn, "BEGIN");

    // Verificar quantos beneficiários já existem
    $query_count = "SELECT COUNT(*) as total FROM sind.seguro_beneficiarios 
                    WHERE id_associado = $1 AND id_divisao = $2";
    $result_count = pg_query_params($conn, $query_count, [$id_associado, $id_divisao]);
    $row_count = pg_fetch_assoc($result_count);
    $total_existente = (int)$row_count['total'];

    if ($total_existente + $quantidade > 4) {
        pg_query($conn, "ROLLBACK");
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => "Você já possui $total_existente beneficiário(s). Máximo permitido: 4"
        ]);
        exit;
    }

    // Inserir novos beneficiários
    $beneficiarios_criados = [];
    $query_insert = "INSERT INTO sind.seguro_beneficiarios 
                     (id_associado, id_divisao, nome, cpf, parentesco, data_nascimento, status, data_cadastro) 
                     VALUES ($1, $2, $3, $4, $5, $6, 'pendente', NOW()) 
                     RETURNING id, nome, cpf, parentesco, data_nascimento, status, data_cadastro";

    for ($i = 0; $i < $quantidade; $i++) {
        $nome_placeholder = "Beneficiário " . ($total_existente + $i + 1);
        $cpf_placeholder = "";
        $parentesco_placeholder = "";
        $data_nascimento_placeholder = null;

        $result_insert = pg_query_params($conn, $query_insert, [
            $id_associado,
            $id_divisao,
            $nome_placeholder,
            $cpf_placeholder,
            $parentesco_placeholder,
            $data_nascimento_placeholder
        ]);

        if (!$result_insert) {
            pg_query($conn, "ROLLBACK");
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erro ao inserir beneficiário: ' . pg_last_error($conn)
            ]);
            exit;
        }

        $beneficiario = pg_fetch_assoc($result_insert);
        $beneficiarios_criados[] = $beneficiario;
    }

    pg_query($conn, "COMMIT");

    echo json_encode([
        'success' => true,
        'data' => $beneficiarios_criados,
        'message' => "$quantidade beneficiário(s) criado(s) com sucesso"
    ]);

} catch (Exception $e) {
    if (isset($conn)) {
        pg_query($conn, "ROLLBACK");
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro ao criar beneficiários: ' . $e->getMessage()
    ]);
}
