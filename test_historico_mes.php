<?php
// Script de teste para verificar se o campo mes_corrente está sendo retornado

header("Content-type: application/json");
error_reporting(E_ALL);
ini_set('display_errors', true);

include "Adm/php/banco.php";

try {
    $pdo = Banco::conectar_postgres();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Testar com o cartão 8074900243 (Luciana)
    $sql = "SELECT id, matricula, empregador, mes as mes_corrente, 
            data_solicitacao, valor as valor_solicitado, aprovado as status, 
            data_aprovacao, celular, valor_taxa as taxa, valor_a_descontar, chave_pix
            FROM sind.antecipacao 
            WHERE matricula = '333322' AND empregador = 30 AND id_associado = 182 AND id_divisao = 2
            ORDER BY data_solicitacao DESC
            LIMIT 5";
    
    echo "=== QUERY SQL ===\n";
    echo $sql . "\n\n";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    
    $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "=== TOTAL DE REGISTROS ===\n";
    echo count($resultados) . "\n\n";
    
    echo "=== PRIMEIROS 5 REGISTROS ===\n";
    foreach($resultados as $index => $row) {
        echo "Registro " . ($index + 1) . ":\n";
        echo json_encode($row, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";
    }
    
    // Verificar se o campo mes_corrente existe
    if (count($resultados) > 0) {
        $primeiro = $resultados[0];
        echo "=== CAMPOS DISPONÍVEIS ===\n";
        echo implode(", ", array_keys($primeiro)) . "\n\n";
        
        if (isset($primeiro['mes_corrente'])) {
            echo "✅ Campo 'mes_corrente' EXISTE\n";
            echo "Valor: " . $primeiro['mes_corrente'] . "\n";
        } else {
            echo "❌ Campo 'mes_corrente' NÃO EXISTE\n";
        }
        
        if (isset($primeiro['mes'])) {
            echo "✅ Campo 'mes' EXISTE\n";
            echo "Valor: " . $primeiro['mes'] . "\n";
        }
    }
    
} catch (Exception $e) {
    echo "ERRO: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString();
}
?>
