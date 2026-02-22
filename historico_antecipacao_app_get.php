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

// Log detalhado dos dados recebidos
error_log("=== HISTÓRICO ANTECIPAÇÃO - LOG DE DEBUG ===");
error_log("Método da requisição: " . $_SERVER['REQUEST_METHOD']);
error_log("Timestamp: " . date('Y-m-d H:i:s'));
error_log("User Agent: " . ($_SERVER['HTTP_USER_AGENT'] ?? 'N/A'));
error_log("IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'N/A'));

// Log de todos os parâmetros GET
error_log("--- PARÂMETROS GET ---");
foreach ($_GET as $key => $value) {
    error_log("GET[$key] = " . $value);
}

// Log de todos os parâmetros POST
error_log("--- PARÂMETROS POST ---");
foreach ($_POST as $key => $value) {
    error_log("POST[$key] = " . $value);
}

// Suportar tanto GET quanto POST
$matricula = '';
$empregador = '';
$id_associado = '';
$id_divisao = '';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $matricula = $_GET['matricula'] ?? '';
    $empregador = $_GET['empregador'] ?? '';
    $id_associado = $_GET['id_associado'] ?? '';
    $id_divisao = $_GET['id_divisao'] ?? '';
    error_log("Dados extraídos do GET: matricula=$matricula, empregador=$empregador, id_associado=$id_associado, id_divisao=$id_divisao");
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $matricula = $_POST['matricula'] ?? '';
    $empregador = $_POST['empregador'] ?? '';
    $id_associado = $_POST['id_associado'] ?? '';
    $id_divisao = $_POST['id_divisao'] ?? '';
    error_log("Dados extraídos do POST: matricula=$matricula, empregador=$empregador, id_associado=$id_associado, id_divisao=$id_divisao");
}

if($matricula && $empregador && $id_associado && $id_divisao) {
    error_log("✅ Todos os parâmetros obrigatórios presentes, iniciando consulta ao banco");
    
    // Conectando ao banco de dados utilizando o PDO
    $pdo = Banco::conectar_postgres();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    try {
        // Preparando a consulta SQL para buscar o histórico
        $sql = "SELECT id, matricula, empregador, mes as mes_corrente, 
                data_solicitacao, valor as valor_solicitado, aprovado as status, 
                data_aprovacao, celular, valor_taxa as taxa, valor_a_descontar, chave_pix
                FROM sind.antecipacao 
                WHERE matricula = ? AND empregador = ? AND id_associado = ? AND id_divisao = ? 
                ORDER BY data_solicitacao DESC";
        
        error_log("SQL Query: " . $sql);
        error_log("Parâmetros: matricula=$matricula, empregador=$empregador, id_associado=$id_associado, id_divisao=$id_divisao");
        
        $stmt = $pdo->prepare($sql);
        
        // Associando os parâmetros com os placeholders
        $stmt->bindParam(1, $matricula, PDO::PARAM_STR);
        $stmt->bindParam(2, $empregador, PDO::PARAM_INT);
        $stmt->bindParam(3, $id_associado, PDO::PARAM_INT);
        $stmt->bindParam(4, $id_divisao, PDO::PARAM_INT);
        
        // Executando a consulta preparada
        $stmt->execute();
        error_log("✅ Consulta executada com sucesso");
        
        // Obtendo todos os resultados
        $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);
        error_log("📊 Número de registros encontrados: " . count($resultados));
        
        // Verificando se há resultados
        if(count($resultados) > 0) {
            error_log("📋 Dados brutos encontrados (primeiros 3 registros):");
            for($i = 0; $i < min(3, count($resultados)); $i++) {
                error_log("Registro " . ($i + 1) . ": " . json_encode($resultados[$i]));
            }
            
            // Codificar para UTF-8 se necessário
            foreach($resultados as &$row) {
                $row = array_map(function($item) {
                    return is_string($item) ? mb_convert_encoding($item, 'UTF-8', 'ISO-8859-1') : $item;
                }, $row);
            }
            
            error_log("📋 Dados após conversão UTF-8 (primeiros 3 registros):");
            for($i = 0; $i < min(3, count($resultados)); $i++) {
                error_log("Registro " . ($i + 1) . ": " . json_encode($resultados[$i]));
            }
            
            // Retornando os resultados em formato JSON
            $json_result = json_encode($resultados);
            error_log("📤 JSON final enviado (primeiros 500 caracteres): " . substr($json_result, 0, 500));
            echo $json_result;
        } else {
            error_log("⚠️ Nenhum registro encontrado para os parâmetros fornecidos");
            // Retornando array vazio se não houver resultados
            echo json_encode([]);
        }
        
    } catch (PDOException $e) {
        // Em caso de erro, retornando mensagem
        error_log("❌ ERRO PDO: " . $e->getMessage());
        error_log("❌ Código do erro: " . $e->getCode());
        error_log("❌ Arquivo: " . $e->getFile() . " Linha: " . $e->getLine());
        
        $response = array("error" => "Erro ao consultar banco de dados: " . $e->getMessage());
        $response = array_map(function($value) {
            return is_string($value) ? mb_convert_encoding($value, 'UTF-8', 'ISO-8859-1') : $value;
        }, $response);
        echo json_encode($response);
    }
} else {
    // Se os parâmetros não foram enviados
    error_log("❌ PARÂMETROS AUSENTES:");
    error_log("   - matricula: " . ($matricula ?: 'AUSENTE'));
    error_log("   - empregador: " . ($empregador ?: 'AUSENTE'));
    error_log("   - id_associado: " . ($id_associado ?: 'AUSENTE'));
    error_log("   - id_divisao: " . ($id_divisao ?: 'AUSENTE'));
    
    $response = array("error" => "Matrícula, empregador, id_associado e id_divisao são obrigatórios");
    $response = array_map(function($value) {
        return is_string($value) ? mb_convert_encoding($value, 'UTF-8', 'ISO-8859-1') : $value;
    }, $response);
    echo json_encode($response);
}

error_log("=== FIM DO LOG DE DEBUG ===");
?>
