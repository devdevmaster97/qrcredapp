# 🗑️ Backend PHP - Cancelar Agendamento

## 📋 **Arquivo: `cancelar_agendamento_app.php`**

Código PHP para deletar agendamentos no servidor:

```php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit;
}

try {
    // Conexão com banco de dados
    require_once 'config_banco.php'; // Ajuste conforme sua conexão
    
    // Receber dados via POST
    $id_agendamento = $_POST['id_agendamento'] ?? '';
    $cod_associado = $_POST['cod_associado'] ?? '';
    $id_empregador = $_POST['id_empregador'] ?? '';
    
    // Log para debug
    error_log("CANCELAR AGENDAMENTO: id=$id_agendamento, associado=$cod_associado, empregador=$id_empregador");
    
    // Validar dados obrigatórios
    if (empty($id_agendamento) || empty($cod_associado) || empty($id_empregador)) {
        echo json_encode([
            'success' => false,
            'message' => 'Dados obrigatórios não fornecidos'
        ]);
        exit;
    }
    
    // 🔍 VERIFICAR SE O AGENDAMENTO EXISTE E PERTENCE AO ASSOCIADO
    $sqlCheck = "SELECT id, profissional, especialidade, convenio_nome 
                 FROM sind.agendamento 
                 WHERE id = ? 
                 AND cod_associado = ? 
                 AND id_empregador = ?";
    
    $stmtCheck = $conexao->prepare($sqlCheck);
    $stmtCheck->bind_param("isi", $id_agendamento, $cod_associado, $id_empregador);
    $stmtCheck->execute();
    $result = $stmtCheck->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Agendamento não encontrado ou não pertence a este usuário'
        ]);
        exit;
    }
    
    $agendamento = $result->fetch_assoc();
    
    // 🗑️ DELETAR O AGENDAMENTO
    $sqlDelete = "DELETE FROM sind.agendamento 
                  WHERE id = ? 
                  AND cod_associado = ? 
                  AND id_empregador = ?";
    
    $stmtDelete = $conexao->prepare($sqlDelete);
    $stmtDelete->bind_param("isi", $id_agendamento, $cod_associado, $id_empregador);
    
    if ($stmtDelete->execute()) {
        if ($stmtDelete->affected_rows > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'Agendamento cancelado com sucesso',
                'data' => [
                    'id' => $id_agendamento,
                    'profissional' => $agendamento['profissional'],
                    'especialidade' => $agendamento['especialidade'],
                    'convenio_nome' => $agendamento['convenio_nome']
                ]
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Nenhum agendamento foi cancelado'
            ]);
        }
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Erro ao cancelar agendamento: ' . $conexao->error
        ]);
    }
    
} catch (Exception $e) {
    error_log("Erro ao cancelar agendamento: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno do servidor'
    ]);
}
?>
```

## 🧪 **Teste Manual**

### **1. Verificar estrutura da tabela:**
```sql
DESCRIBE sind.agendamento;
```

### **2. Listar agendamentos antes de cancelar:**
```sql
SELECT id, cod_associado, profissional, especialidade, convenio_nome, data_solicitacao 
FROM sind.agendamento 
WHERE cod_associado = '222222' 
ORDER BY id DESC;
```

### **3. Teste manual de cancelamento:**
```sql
-- Simular o que o PHP faz
DELETE FROM sind.agendamento 
WHERE id = 30 
AND cod_associado = '222222' 
AND id_empregador = 1;
```

### **4. Verificar se foi deletado:**
```sql
SELECT id, cod_associado, profissional, especialidade, convenio_nome 
FROM sind.agendamento 
WHERE id = 30;
-- Deve retornar 0 registros se foi deletado
```

## 🔒 **Segurança Implementada**

1. **Verificação de Propriedade**: Só permite cancelar agendamentos do próprio usuário
2. **Validação de Dados**: Verifica se todos os campos obrigatórios estão presentes
3. **Prepared Statements**: Previne SQL Injection
4. **Log de Auditoria**: Registra todas as tentativas de cancelamento

## ✅ **Fluxo Completo**

1. **Frontend**: Usuário clica em "Cancelar"
2. **Frontend**: Mostra confirmação
3. **Frontend**: Envia requisição para `/api/cancelar-agendamento`
4. **API Next.js**: Valida e repassa para `cancelar_agendamento_app.php`
5. **Backend PHP**: Verifica permissão e deleta do banco
6. **Frontend**: Remove da lista e mostra mensagem de sucesso

## 🎯 **Resultado Esperado**

- ✅ Botão "Cancelar" aparece em cada agendamento
- ✅ Confirmação antes de cancelar
- ✅ Feedback visual durante cancelamento
- ✅ Agendamento removido da lista
- ✅ Registro deletado do banco de dados
- ✅ Segurança: só cancela agendamentos do próprio usuário 