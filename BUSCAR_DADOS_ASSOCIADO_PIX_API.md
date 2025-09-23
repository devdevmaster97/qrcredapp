# API PHP para Buscar Dados do Associado com PIX

Copie e cole este código PHP no servidor para criar a API `buscar_dados_associado_pix.php`:

```php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

include "../../php/banco.php";

try {
    // Obter os parâmetros do POST
    $matricula = isset($_POST['matricula']) ? $_POST['matricula'] : '';
    $id_empregador = isset($_POST['id_empregador']) ? $_POST['id_empregador'] : '';
    $id_associado = isset($_POST['id_associado']) ? $_POST['id_associado'] : '';
    $id_divisao = isset($_POST['id_divisao']) ? $_POST['id_divisao'] : '';
    
    if (empty($matricula) || empty($id_empregador) || empty($id_associado) || empty($id_divisao)) {
        echo json_encode(['erro' => 'Parâmetros obrigatórios não informados']);
        exit;
    }
    
    // Conectar ao banco
    $pdo = Banco::conectar_postgres();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Buscar dados do associado incluindo o campo PIX
    $sql = "SELECT codigo, nome, empregador, id, id_divisao, pix
            FROM sind.associado
            WHERE codigo = :matricula 
            AND empregador = :id_empregador 
            AND id = :id_associado 
            AND id_divisao = :id_divisao";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':matricula', $matricula, PDO::PARAM_STR);
    $stmt->bindParam(':id_empregador', $id_empregador, PDO::PARAM_STR);
    $stmt->bindParam(':id_associado', $id_associado, PDO::PARAM_INT);
    $stmt->bindParam(':id_divisao', $id_divisao, PDO::PARAM_INT);
    $stmt->execute();
    
    $associado = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$associado) {
        echo json_encode(['erro' => 'Associado não encontrado']);
        exit;
    }
    
    // Retornar os dados em JSON
    echo json_encode([
        'codigo' => $associado['codigo'],
        'nome' => $associado['nome'],
        'empregador' => $associado['empregador'],
        'id' => $associado['id'],
        'id_divisao' => $associado['id_divisao'],
        'pix' => $associado['pix']
    ]);
    
} catch (Exception $e) {
    echo json_encode(['erro' => 'Erro ao buscar dados: ' . $e->getMessage()]);
} finally {
    Banco::desconectar();
}
?>
```

## Local no Servidor

Este arquivo deve ser colocado no mesmo diretório onde estão os outros arquivos PHP do sistema, geralmente na pasta raiz ou em uma pasta específica de APIs.
