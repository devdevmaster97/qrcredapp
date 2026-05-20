<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require 'Adm/php/banco.php';
include "Adm/php/funcoes.php";

try {
    $pdo = Banco::conectar_postgres();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
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
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $pdo->beginTransaction();

    // Verificar quantos beneficiários já existem
    $query_count = "SELECT COUNT(*) as total FROM sind.seguro_beneficiarios 
                    WHERE id_associado = :id_associado AND id_divisao = :id_divisao";
    $stmt_count = $pdo->prepare($query_count);
    $stmt_count->execute([
        ':id_associado' => $id_associado,
        ':id_divisao' => $id_divisao
    ]);
    $row_count = $stmt_count->fetch(PDO::FETCH_ASSOC);
    $total_existente = (int)$row_count['total'];

    if ($total_existente + $quantidade > 4) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => "Você já possui $total_existente beneficiário(s). Máximo permitido: 4"
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Inserir novos beneficiários
    $beneficiarios_criados = [];
    $query_insert = "INSERT INTO sind.seguro_beneficiarios 
                     (id_associado, id_divisao, status, data_criacao) 
                     VALUES (:id_associado, :id_divisao, 'pendente', NOW()) 
                     RETURNING id_beneficiario, id_associado, id_divisao, status, data_criacao";

    for ($i = 0; $i < $quantidade; $i++) {
        $stmt_insert = $pdo->prepare($query_insert);
        $stmt_insert->execute([
            ':id_associado' => $id_associado,
            ':id_divisao' => $id_divisao
        ]);

        $beneficiario = $stmt_insert->fetch(PDO::FETCH_ASSOC);
        $beneficiarios_criados[] = $beneficiario;
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'data' => $beneficiarios_criados,
        'message' => "$quantidade beneficiário(s) criado(s) com sucesso"
    ], JSON_UNESCAPED_UNICODE);

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
