<?php
/**
 * API para verificar se o associado possui contrato de Antecipação Salarial assinado
 * Verifica especificamente tipo = 2 (Contrato de Antecipação Salarial) na tabela associados_sasmais
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data || empty($data['codigo'])) {
        http_response_code(400);
        echo json_encode([
            'status' => 'erro',
            'mensagem' => 'Código do associado é obrigatório',
            'temAntecipacao' => false
        ]);
        exit;
    }

    $codigo     = trim((string) $data['codigo']);
    $id         = isset($data['id']) ? (int) $data['id'] : null;
    $id_divisao = isset($data['id_divisao']) ? (int) $data['id_divisao'] : null;

    error_log("🔍 verificar_antecipacao - código: $codigo, id: $id, id_divisao: $id_divisao");

    include "Adm/php/banco.php";

    $pdo = Banco::conectar_postgres();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Buscar registro com tipo = 2 (Antecipação Salarial)
    if ($id !== null && $id_divisao !== null) {
        $sql = "SELECT id, codigo, nome, has_signed, signed_at, autorizado
                FROM sind.associados_sasmais
                WHERE tipo = 2
                  AND id_associado = :id
                  AND id_divisao = :id_divisao
                LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':id' => $id, ':id_divisao' => $id_divisao]);
    } else {
        $sql = "SELECT id, codigo, nome, has_signed, signed_at, autorizado
                FROM sind.associados_sasmais
                WHERE tipo = 2
                  AND codigo = :codigo
                LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':codigo' => $codigo]);
    }

    $registro = $stmt->fetch(PDO::FETCH_ASSOC);
    $pdo = null;

    $temAntecipacao = !empty($registro);

    error_log("✅ verificar_antecipacao - temAntecipacao: " . ($temAntecipacao ? 'true' : 'false'));

    echo json_encode([
        'status'          => 'sucesso',
        'temAntecipacao'  => $temAntecipacao,
        'mensagem'        => $temAntecipacao
            ? 'Contrato de Antecipação Salarial encontrado'
            : 'Contrato de Antecipação Salarial não encontrado',
        'dados'           => $temAntecipacao ? $registro : null
    ]);

} catch (PDOException $e) {
    error_log("❌ Erro PDO em verificar_antecipacao: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status'         => 'erro',
        'mensagem'       => 'Erro ao consultar banco de dados',
        'temAntecipacao' => false
    ]);
} catch (Exception $e) {
    error_log("❌ Erro em verificar_antecipacao: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status'         => 'erro',
        'mensagem'       => 'Erro interno do servidor',
        'temAntecipacao' => false
    ]);
}
?>
