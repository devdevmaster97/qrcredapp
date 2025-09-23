# API PHP para Atualizar PIX do Associado

Copie e cole este código PHP no servidor para criar a API `atualizar_pix_associado.php`:

```php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

include "../../php/banco.php";

try {
    // Obter os parâmetros do POST
    $matricula = isset($_POST['matricula']) ? $_POST['matricula'] : '';
    $id_empregador = isset($_POST['id_empregador']) ? $_POST['id_empregador'] : '';
    $id_associado = isset($_POST['id_associado']) ? $_POST['id_associado'] : '';
    $id_divisao = isset($_POST['id_divisao']) ? $_POST['id_divisao'] : '';
    $pix = isset($_POST['pix']) ? $_POST['pix'] : '';
    
    if (empty($matricula) || empty($id_empregador) || empty($id_associado) || empty($id_divisao) || empty($pix)) {
        echo json_encode(['erro' => 'Parâmetros obrigatórios não informados']);
        exit;
    }
    
    // Conectar ao banco
    $pdo = Banco::conectar_postgres();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Atualizar o campo PIX do associado
    $sql = "UPDATE sind.associado 
            SET pix = :pix
            WHERE codigo = :matricula 
            AND empregador = :id_empregador 
            AND id = :id_associado 
            AND id_divisao = :id_divisao";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':pix', $pix, PDO::PARAM_STR);
    $stmt->bindParam(':matricula', $matricula, PDO::PARAM_STR);
    $stmt->bindParam(':id_empregador', $id_empregador, PDO::PARAM_STR);
    $stmt->bindParam(':id_associado', $id_associado, PDO::PARAM_INT);
    $stmt->bindParam(':id_divisao', $id_divisao, PDO::PARAM_INT);
    
    $resultado = $stmt->execute();
    $linhasAfetadas = $stmt->rowCount();
    
    if ($resultado && $linhasAfetadas > 0) {
        echo json_encode([
            'success' => true,
            'message' => 'PIX atualizado com sucesso',
            'linhas_afetadas' => $linhasAfetadas
        ]);
    } else if ($resultado && $linhasAfetadas === 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Nenhum registro encontrado para atualizar',
            'linhas_afetadas' => 0
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Erro ao atualizar PIX'
        ]);
    }
    
} catch (Exception $e) {
    echo json_encode(['erro' => 'Erro ao atualizar PIX: ' . $e->getMessage()]);
} finally {
    Banco::desconectar();
}
?>
```

## Local no Servidor

Este arquivo deve ser colocado no mesmo diretório onde estão os outros arquivos PHP do sistema, geralmente na pasta raiz ou em uma pasta específica de APIs.
