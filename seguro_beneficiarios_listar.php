<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require 'Adm/php/banco.php';
include "Adm/php/funcoes.php";
$pdo = Banco::conectar_postgres();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

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

    $query = "SELECT id_beneficiario, id_associado, id_divisao, cpf_zap, nome_zap,
                     nome_beneficiario, data_nascimento, parentesco, percentual,
                     status, doc_token, data_criacao, data_assinatura
              FROM sind.seguro_beneficiarios 
              WHERE id_associado = :id_associado AND id_divisao = :id_divisao
              ORDER BY data_criacao ASC";

    $stmt = $pdo->prepare($query);
    $stmt->bindParam(':id_associado', $id_associado, PDO::PARAM_INT);
    $stmt->bindParam(':id_divisao', $id_divisao, PDO::PARAM_INT);
    $stmt->execute();

    $beneficiarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'beneficiarios' => $beneficiarios
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro ao listar beneficiários: ' . $e->getMessage()
    ]);
}
