<?PHP
    // Permitir acesso de qualquer origem
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Max-Age: 86400");
    header("Content-Type: application/json");
    
    include "Adm/php/banco.php";
    include "Adm/php/funcoes.php";
    $pdo = Banco::conectar_postgres();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Receber parâmetros
    $matricula = isset($_POST['matricula']) ? $_POST['matricula'] : "";
    $empregador = isset($_POST['empregador']) ? $_POST['empregador'] : null;
    $mes = isset($_POST['mes']) ? $_POST['mes'] : "";
    
    // Log para debug
    error_log("CONTA_SALDO_APP: matricula=$matricula, empregador=$empregador, mes=$mes");
    
    $someArray = array();

    try {
        // Consulta SQL SIMPLIFICADA - apenas tabela conta
        $sql = "SELECT lancamento, valor, mes, parcela, data as dia, hora, associado, empregador, convenio
                FROM sind.conta 
                WHERE associado = :matricula 
                AND empregador = :empregador 
                AND mes = :mes 
                ORDER BY lancamento ASC";
        
        error_log("CONTA_SALDO_APP: SQL = $sql");
        
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':matricula', $matricula, PDO::PARAM_STR);
        $stmt->bindParam(':empregador', $empregador, PDO::PARAM_INT);
        $stmt->bindParam(':mes', $mes, PDO::PARAM_STR);
        $stmt->execute();
        
        while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // Não usar utf8_encode se não for necessário
            $someArray[] = $row;
        }
        
        error_log("CONTA_SALDO_APP: Retornando " . count($someArray) . " registros");
        
    } catch (Exception $e) {
        error_log("CONTA_SALDO_APP: Erro = " . $e->getMessage());
    }
    
    echo json_encode($someArray);
?>
