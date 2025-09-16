<?php
// Script de teste para debug da API de histórico
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h2>Teste da API de Histórico de Antecipação</h2>";

// Dados de teste
$matricula = '023995';
$empregador = 6;
$id_associado = 174;
$divisao = 1;

echo "<h3>Dados de teste:</h3>";
echo "Matrícula: $matricula<br>";
echo "Empregador: $empregador<br>";
echo "ID Associado: $id_associado<br>";
echo "Divisão: $divisao<br><br>";

// Teste 1: POST
echo "<h3>Teste 1: Requisição POST</h3>";
$postData = http_build_query([
    'matricula' => $matricula,
    'empregador' => $empregador,
    'id_associado' => $id_associado,
    'divisao' => $divisao
]);

$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/x-www-form-urlencoded',
        'content' => $postData
    ]
]);

$result = file_get_contents('https://sas.makecard.com.br/historico_antecipacao_app.php', false, $context);
echo "Resposta POST: " . htmlspecialchars($result) . "<br><br>";

// Teste 2: GET
echo "<h3>Teste 2: Requisição GET</h3>";
$getUrl = "https://sas.makecard.com.br/historico_antecipacao_app.php?" . $postData;
$result = file_get_contents($getUrl);
echo "Resposta GET: " . htmlspecialchars($result) . "<br><br>";

// Teste 3: POST com cURL
echo "<h3>Teste 3: POST com cURL</h3>";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://sas.makecard.com.br/historico_antecipacao_app.php');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/x-www-form-urlencoded'
]);

$result = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode<br>";
echo "Resposta cURL: " . htmlspecialchars($result) . "<br><br>";

echo "<h3>Logs do servidor:</h3>";
echo "<p>Verifique os logs do servidor para ver os detalhes de debug.</p>";
echo "<p>Os logs devem estar em: /var/log/apache2/error.log ou similar</p>";
?>
