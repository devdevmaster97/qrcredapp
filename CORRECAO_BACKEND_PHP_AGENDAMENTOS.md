# 🔧 Correção Backend PHP - Agendamentos

## 📋 **Problema Identificado**

O **frontend está enviando os dados corretos**, mas o backend PHP não está gravando os novos campos no banco de dados.

### ✅ **Dados enviados pelo frontend:**
```json
{
  "cod_associado": "222222",
  "id_empregador": 1,
  "cod_convenio": "173",
  "profissional": "Centro Diagnóstico Santa Rosa",
  "especialidade": "Densitometria Óssea",
  "convenio_nome": "CENTRO DIAG.SANTA ROSA-IMEDI"
}
```

### ❌ **Resultado no banco:**
```sql
id: 26, cod_associado: "222222", id_empregador: 1, cod_convenio: 1, 
profissional: "", especialidade: "", convenio_nome: ""
```

## 🔧 **Correções Necessárias**

### **1. Arquivo: `grava_agendamento_app.php`**

#### **Adicionar recebimento dos novos campos:**
```php
// Receber os novos campos via POST
$profissional = $_POST['profissional'] ?? '';
$especialidade = $_POST['especialidade'] ?? '';
$convenio_nome = $_POST['convenio_nome'] ?? '';

// Log para debug
error_log("NOVOS CAMPOS RECEBIDOS: profissional=$profissional, especialidade=$especialidade, convenio_nome=$convenio_nome");
```

#### **Atualizar a query SQL de INSERT:**
```php
// Query SQL ANTES (apenas campos antigos)
$sql = "INSERT INTO sind.agendamento (
    cod_associado, 
    id_empregador, 
    cod_convenio, 
    data_solicitacao, 
    status
) VALUES (?, ?, ?, ?, ?)";

// Query SQL DEPOIS (com novos campos)
$sql = "INSERT INTO sind.agendamento (
    cod_associado, 
    id_empregador, 
    cod_convenio, 
    data_solicitacao, 
    status,
    profissional,
    especialidade,
    convenio_nome
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
```

#### **Atualizar os parâmetros do bind:**
```php
// Parâmetros ANTES
$stmt->bind_param("ssssi", 
    $cod_associado, 
    $id_empregador, 
    $cod_convenio, 
    $data_solicitacao, 
    $status
);

// Parâmetros DEPOIS
$stmt->bind_param("ssssisss", 
    $cod_associado, 
    $id_empregador, 
    $cod_convenio, 
    $data_solicitacao, 
    $status,
    $profissional,
    $especialidade,
    $convenio_nome
);
```

### **2. Arquivo: `lista_agendamentos_app.php`**

#### **Atualizar a query SELECT:**
```php
// Query ANTES
$sql = "SELECT 
    id, 
    cod_associado, 
    id_empregador, 
    data_solicitacao, 
    cod_convenio, 
    status
FROM sind.agendamento 
WHERE cod_associado = ? AND id_empregador = ?";

// Query DEPOIS
$sql = "SELECT 
    id, 
    cod_associado, 
    id_empregador, 
    data_solicitacao, 
    cod_convenio, 
    status,
    profissional,
    especialidade,
    convenio_nome
FROM sind.agendamento 
WHERE cod_associado = ? AND id_empregador = ?";
```

## 🧪 **Teste da Correção**

### **1. Verificar estrutura da tabela:**
```sql
DESCRIBE sind.agendamento;
```

**Resultado esperado:**
```
+------------------+----------+------+-----+-------------------+
| Field            | Type     | Null | Key | Default           |
+------------------+----------+------+-----+-------------------+
| id               | int(11)  | NO   | PRI | auto_increment    |
| cod_associado    | varchar  | YES  |     | NULL              |
| id_empregador    | int      | YES  |     | NULL              |
| data_solicitacao | datetime | YES  |     | CURRENT_TIMESTAMP |
| cod_convenio     | varchar  | YES  |     | NULL              |
| status           | int      | YES  |     | NULL              |
| profissional     | varchar  | YES  |     | NULL              |  ← NOVO
| especialidade    | varchar  | YES  |     | NULL              |  ← NOVO
| convenio_nome    | varchar  | YES  |     | NULL              |  ← NOVO
+------------------+----------+------+-----+-------------------+
```

### **2. Teste manual de INSERT:**
```sql
INSERT INTO sind.agendamento (
    cod_associado, 
    id_empregador, 
    cod_convenio, 
    data_solicitacao, 
    status,
    profissional,
    especialidade,
    convenio_nome
) VALUES (
    '222222',
    1,
    '173',
    NOW(),
    1,
    'Centro Diagnóstico Santa Rosa',
    'Densitometria Óssea',
    'CENTRO DIAG.SANTA ROSA-IMEDI'
);
```

### **3. Verificar se gravou:**
```sql
SELECT id, cod_associado, profissional, especialidade, convenio_nome 
FROM sind.agendamento 
WHERE cod_associado = '222222' 
ORDER BY id DESC 
LIMIT 5;
```

## 📝 **Exemplo Completo do PHP Corrigido**

### **grava_agendamento_app.php:**
```php
<?php
// Receber dados básicos
$cod_associado = $_POST['cod_associado'] ?? '';
$id_empregador = $_POST['id_empregador'] ?? '';
$cod_convenio = $_POST['cod_convenio'] ?? '';
$data_solicitacao = $_POST['data_solicitacao'] ?? date('Y-m-d H:i:s');
$status = $_POST['status'] ?? 1;

// NOVOS CAMPOS
$profissional = $_POST['profissional'] ?? '';
$especialidade = $_POST['especialidade'] ?? '';
$convenio_nome = $_POST['convenio_nome'] ?? '';

// Log para debug
error_log("DADOS RECEBIDOS: cod_associado=$cod_associado, profissional=$profissional, especialidade=$especialidade, convenio_nome=$convenio_nome");

// Query com novos campos
$sql = "INSERT INTO sind.agendamento (
    cod_associado, 
    id_empregador, 
    cod_convenio, 
    data_solicitacao, 
    status,
    profissional,
    especialidade,
    convenio_nome
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

$stmt = $conexao->prepare($sql);
$stmt->bind_param("ssssisss", 
    $cod_associado, 
    $id_empregador, 
    $cod_convenio, 
    $data_solicitacao, 
    $status,
    $profissional,
    $especialidade,
    $convenio_nome
);

if ($stmt->execute()) {
    $id = $conexao->insert_id;
    echo json_encode([
        'success' => true,
        'message' => 'Agendamento criado com sucesso',
        'data' => [
            'id' => $id,
            'new_record' => true,
            'profissional' => $profissional,
            'especialidade' => $especialidade,
            'convenio_nome' => $convenio_nome
        ]
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao criar agendamento'
    ]);
}
?>
```

## 🎯 **Resultado Esperado**

Após a correção, o agendamento deve gravar assim:
```sql
id: 27, cod_associado: "222222", id_empregador: 1, cod_convenio: "173", 
profissional: "Centro Diagnóstico Santa Rosa", 
especialidade: "Densitometria Óssea", 
convenio_nome: "CENTRO DIAG.SANTA ROSA-IMEDI"
```

## ✅ **Status**
- ✅ Frontend: 100% correto
- ✅ API Next.js: 100% correta  
- ❌ Backend PHP: Precisa das correções acima 