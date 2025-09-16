<?PHP
header("Content-type: application/json");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

ini_set('display_errors', true);
error_reporting(E_ALL);
date_default_timezone_set('America/Sao_Paulo');

// Incluindo o arquivo de conexão com o banco
include "Adm/php/banco.php";
include "Adm/php/funcoes.php";

// Se for uma requisição OPTIONS, finalizar aqui (pre-flight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Suportar tanto GET quanto POST
$matricula = '';
$empregador = '';
$id_associado = '';
$divisao = '';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $matricula = $_GET['matricula'] ?? '';
    $empregador = $_GET['empregador'] ?? '';
    $id_associado = $_GET['id_associado'] ?? '';
    $divisao = $_GET['divisao'] ?? '';
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $matricula = $_POST['matricula'] ?? '';
    $empregador = $_POST['empregador'] ?? '';
    $id_associado = $_POST['id_associado'] ?? '';
    $divisao = $_POST['divisao'] ?? '';
}

if($matricula && $empregador && $id_associado && $divisao) {
    // Conectando ao banco de dados utilizando o PDO
    $pdo = Banco::conectar_postgres();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    try {
        // Preparando a consulta SQL para buscar o histórico
        $sql = "SELECT id, matricula, empregador, mes as mes_corrente, 
                data_solicitacao, valor as valor_solicitado, aprovado as status, 
                data_aprovacao, celular, valor_taxa as taxa, valor_a_descontar, chave_pix
                FROM sind.antecipacao 
                WHERE matricula = ? AND empregador = ? AND id_associado = ? AND divisao = ? 
                ORDER BY data_solicitacao DESC";
        
        $stmt = $pdo->prepare($sql);
        
        // Associando os parâmetros com os placeholders
        $stmt->bindParam(1, $matricula, PDO::PARAM_STR);
        $stmt->bindParam(2, $empregador, PDO::PARAM_INT);
        $stmt->bindParam(3, $id_associado, PDO::PARAM_INT);
        $stmt->bindParam(4, $divisao, PDO::PARAM_INT);
        
        // Executando a consulta preparada
        $stmt->execute();
        
        // Obtendo todos os resultados
        $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Verificando se há resultados
        if(count($resultados) > 0) {
            // Codificar para UTF-8 se necessário
            foreach($resultados as &$row) {
                $row = array_map(function($item) {
                    return is_string($item) ? mb_convert_encoding($item, 'UTF-8', 'ISO-8859-1') : $item;
                }, $row);
            }
            
            // Retornando os resultados em formato JSON
            echo json_encode($resultados);
        } else {
            // Retornando array vazio se não houver resultados
            echo json_encode([]);
        }
        
    } catch (PDOException $e) {
        // Em caso de erro, retornando mensagem
        $response = array("error" => "Erro ao consultar banco de dados: " . $e->getMessage());
        $response = array_map(function($value) {
            return is_string($value) ? mb_convert_encoding($value, 'UTF-8', 'ISO-8859-1') : $value;
        }, $response);
        echo json_encode($response);
    }
} else {
    // Se os parâmetros não foram enviados
    $response = array("error" => "Matrícula, empregador, id_associado e divisão são obrigatórios");
    $response = array_map(function($value) {
        return is_string($value) ? mb_convert_encoding($value, 'UTF-8', 'ISO-8859-1') : $value;
    }, $response);
    echo json_encode($response);
}
?>
