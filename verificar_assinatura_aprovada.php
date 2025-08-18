<?php
/**
 * API para verificar se uma assinatura digital foi aprovada
 * Verifica se existe registro com tipo específico, valor_aprovado e data_pgto preenchidos
 */

// Headers CORS
header("Access-Control-Allow-Origin: https://sasapp.tec.br");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json; charset=UTF-8");

// Tratar requisições OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include "Adm/php/banco.php";
$pdo = Banco::conectar_postgres();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$response = new stdClass();

try {
    // Obter parâmetros
    $codigo = $_POST['codigo'] ?? '';
    $tipo = $_POST['tipo'] ?? 'antecipacao'; // Padrão para antecipacao
    
    if (empty($codigo)) {
        $response->success = false;
        $response->message = "Código do associado é obrigatório";
        $response->aprovada = false;
        echo json_encode($response);
        exit;
    }
    
    // Log para debug
    error_log("=== VERIFICAR ASSINATURA APROVADA ===");
    error_log("Código: " . $codigo);
    error_log("Tipo: " . $tipo);
    
    // Query para verificar se existe assinatura aprovada do tipo especificado
    // Assumindo que a tabela se chama 'sind.assinaturas_digitais' ou similar
    $sql = "SELECT 
                id, 
                codigo_associado, 
                tipo, 
                valor_aprovado, 
                data_pgto, 
                data_assinatura,
                status
            FROM sind.assinaturas_digitais 
            WHERE codigo_associado = :codigo 
            AND tipo = :tipo 
            AND valor_aprovado IS NOT NULL 
            AND valor_aprovado != '' 
            AND data_pgto IS NOT NULL 
            AND data_pgto != ''
            ORDER BY data_assinatura DESC 
            LIMIT 1";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':codigo', $codigo, PDO::PARAM_STR);
    $stmt->bindParam(':tipo', $tipo, PDO::PARAM_STR);
    $stmt->execute();
    
    $resultado = $stmt->fetch(PDO::FETCH_ASSOC);
    
    error_log("Resultado da consulta: " . print_r($resultado, true));
    
    if ($resultado) {
        // Encontrou assinatura aprovada
        $response->success = true;
        $response->aprovada = true;
        $response->valor_aprovado = $resultado['valor_aprovado'];
        $response->data_pgto = $resultado['data_pgto'];
        $response->data_assinatura = $resultado['data_assinatura'];
        $response->tipo = $resultado['tipo'];
        $response->message = "Antecipação aprovada encontrada";
        
        error_log("✅ Antecipação aprovada encontrada para código: " . $codigo);
    } else {
        // Não encontrou assinatura aprovada
        $response->success = true;
        $response->aprovada = false;
        $response->message = "Nenhuma antecipação aprovada encontrada";
        
        error_log("❌ Nenhuma antecipação aprovada para código: " . $codigo);
    }
    
} catch (Exception $e) {
    error_log("Erro ao verificar assinatura aprovada: " . $e->getMessage());
    
    $response->success = false;
    $response->message = "Erro ao verificar aprovação: " . $e->getMessage();
    $response->aprovada = false;
}

echo json_encode($response);
?>
