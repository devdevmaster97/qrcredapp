<?php
header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Log dos parâmetros recebidos
$log = [
    'timestamp' => date('Y-m-d H:i:s'),
    'metodo' => $_SERVER['REQUEST_METHOD'],
    'parametros_post' => $_POST,
    'parametros_get' => $_GET,
    'raw_input' => file_get_contents('php://input')
];

// Simular os parâmetros que deveriam vir
$matricula = $_POST['matricula'] ?? '555555';
$empregador = $_POST['empregador'] ?? '30';
$mes = $_POST['mes'] ?? 'NOV/24'; // Mês que deveria vir
$id = $_POST['id'] ?? '157';
$divisao = $_POST['divisao'] ?? '1';

$log['parametros_processados'] = [
    'matricula' => $matricula,
    'empregador' => $empregador,
    'mes' => $mes,
    'id' => $id,
    'divisao' => $divisao
];

// Tentar conectar ao banco
try {
    require_once('Banco.php');
    $banco = new Banco();
    $pdo = $banco->getConexao();
    
    $log['conexao_banco'] = 'OK';
    
    // Query para buscar registros
    $sql = "SELECT * FROM sind.conta 
            WHERE matricula = :matricula 
            AND empregador = :empregador 
            AND mes = :mes 
            AND id_associado = :id 
            AND divisao = :divisao
            ORDER BY data DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':matricula' => $matricula,
        ':empregador' => $empregador,
        ':mes' => $mes,
        ':id' => $id,
        ':divisao' => $divisao
    ]);
    
    $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $log['query'] = $sql;
    $log['total_registros'] = count($resultados);
    $log['registros'] = $resultados;
    
    // Tentar também sem o mês para ver se existem registros
    $sqlSemMes = "SELECT mes, COUNT(*) as total FROM sind.conta 
                  WHERE matricula = :matricula 
                  AND empregador = :empregador 
                  AND id_associado = :id 
                  AND divisao = :divisao
                  GROUP BY mes
                  ORDER BY mes DESC";
    
    $stmtSemMes = $pdo->prepare($sqlSemMes);
    $stmtSemMes->execute([
        ':matricula' => $matricula,
        ':empregador' => $empregador,
        ':id' => $id,
        ':divisao' => $divisao
    ]);
    
    $mesesDisponiveis = $stmtSemMes->fetchAll(PDO::FETCH_ASSOC);
    $log['meses_disponiveis'] = $mesesDisponiveis;
    
} catch (Exception $e) {
    $log['erro_banco'] = $e->getMessage();
}

echo json_encode($log, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>
