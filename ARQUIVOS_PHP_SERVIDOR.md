# Arquivos PHP para Servidor - Funcionalidade de Agendamentos

Este documento contém o código dos arquivos PHP que devem ser instalados no servidor `https://sas.makecard.com.br/` para suportar a funcionalidade de agendamentos.

## 📁 Arquivo 1: grava_agendamento_app.php

**Função**: Salvar novos agendamentos na tabela `sind.agendamento`

```php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Tratar requisições OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Verificar se é uma requisição POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit();
}

// Incluir arquivo de conexão com banco (ajuste o caminho conforme sua estrutura)
require_once 'Adm/php/banco.php';

try {
    // Obter dados do POST
    $cod_associado = $_POST['cod_associado'] ?? '';
    $id_empregador = $_POST['id_empregador'] ?? '';
    $cod_convenio = $_POST['cod_convenio'] ?? '1';
    $data_solicitacao = $_POST['data_solicitacao'] ?? date('Y-m-d H:i:s');
    $status = $_POST['status'] ?? '1';
    $profissional = $_POST['profissional'] ?? '';
    $especialidade = $_POST['especialidade'] ?? '';
    $convenio_nome = $_POST['convenio_nome'] ?? '';
    
    // Validar dados obrigatórios
    if (empty($cod_associado) || empty($id_empregador)) {
        throw new Exception('Código do associado e ID do empregador são obrigatórios');
    }
    
    // Conectar ao banco PostgreSQL
    $banco = new Banco();
    $pdo = $banco->conectar_postgres();
    
    if (!$pdo) {
        throw new Exception('Erro ao conectar com o banco de dados');
    }
    
    // Preparar query de inserção
    $sql = "INSERT INTO sind.agendamento (
        cod_associado, 
        id_empregador, 
        data_solicitacao, 
        cod_convenio, 
        status
    ) VALUES (
        :cod_associado, 
        :id_empregador, 
        :data_solicitacao, 
        :cod_convenio, 
        :status
    ) RETURNING id";
    
    $stmt = $pdo->prepare($sql);
    
    // Executar inserção
    $result = $stmt->execute([
        ':cod_associado' => $cod_associado,
        ':id_empregador' => $id_empregador,
        ':data_solicitacao' => $data_solicitacao,
        ':cod_convenio' => $cod_convenio,
        ':status' => $status
    ]);
    
    if ($result) {
        // Obter o ID do registro inserido
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $id_agendamento = $row['id'];
        
        // Log do agendamento
        error_log("Agendamento criado - ID: {$id_agendamento}, Associado: {$cod_associado}, Empregador: {$id_empregador}, Convênio: {$cod_convenio}");
        
        // Retornar sucesso
        echo json_encode([
            'success' => true,
            'message' => 'Agendamento salvo com sucesso',
            'data' => [
                'id' => $id_agendamento,
                'cod_associado' => $cod_associado,
                'id_empregador' => $id_empregador,
                'cod_convenio' => $cod_convenio,
                'data_solicitacao' => $data_solicitacao,
                'status' => $status,
                'profissional' => $profissional,
                'especialidade' => $especialidade,
                'convenio_nome' => $convenio_nome
            ]
        ]);
    } else {
        throw new Exception('Erro ao salvar agendamento no banco de dados');
    }
    
} catch (Exception $e) {
    error_log("Erro ao gravar agendamento: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
```

## 📁 Arquivo 2: lista_agendamentos_app.php

**Função**: Buscar agendamentos existentes do associado

```php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Tratar requisições OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Verificar se é uma requisição POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit();
}

// Incluir arquivo de conexão com banco (ajuste o caminho conforme sua estrutura)
require_once 'Adm/php/banco.php';

try {
    // Obter dados do POST
    $cod_associado = $_POST['cod_associado'] ?? '';
    $id_empregador = $_POST['id_empregador'] ?? '';
    
    // Validar dados obrigatórios
    if (empty($cod_associado) || empty($id_empregador)) {
        throw new Exception('Código do associado e ID do empregador são obrigatórios');
    }
    
    // Conectar ao banco PostgreSQL
    $banco = new Banco();
    $pdo = $banco->conectar_postgres();
    
    if (!$pdo) {
        throw new Exception('Erro ao conectar com o banco de dados');
    }
    
    // Preparar query de busca
    $sql = "SELECT 
        id,
        cod_associado,
        id_empregador,
        data_solicitacao,
        cod_convenio,
        status
    FROM sind.agendamento 
    WHERE cod_associado = :cod_associado 
    AND id_empregador = :id_empregador
    ORDER BY data_solicitacao DESC";
    
    $stmt = $pdo->prepare($sql);
    
    // Executar consulta
    $result = $stmt->execute([
        ':cod_associado' => $cod_associado,
        ':id_empregador' => $id_empregador
    ]);
    
    if ($result) {
        // Buscar todos os resultados
        $agendamentos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Log da consulta
        error_log("Agendamentos encontrados para associado {$cod_associado}: " . count($agendamentos));
        
        // Retornar sucesso com os dados
        echo json_encode([
            'success' => true,
            'data' => $agendamentos,
            'total' => count($agendamentos)
        ]);
    } else {
        throw new Exception('Erro ao buscar agendamentos no banco de dados');
    }
    
} catch (Exception $e) {
    error_log("Erro ao buscar agendamentos: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
```

## 🗄️ Estrutura da Tabela Required

Para que os arquivos funcionem, certifique-se de que a tabela existe:

```sql
-- Verificar se a tabela existe
SELECT * FROM information_schema.tables 
WHERE table_schema = 'sind' 
AND table_name = 'agendamento';

-- Exemplo de estrutura da tabela (se não existir)
CREATE TABLE sind.agendamento (
    id SERIAL PRIMARY KEY,
    cod_associado VARCHAR(50) NOT NULL,
    id_empregador INTEGER NOT NULL,
    data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cod_convenio VARCHAR(20) DEFAULT '1',
    status INTEGER DEFAULT 1
);

-- Índices para performance
CREATE INDEX idx_agendamento_associado_empregador 
ON sind.agendamento(cod_associado, id_empregador);

CREATE INDEX idx_agendamento_data 
ON sind.agendamento(data_solicitacao);
```

## 📋 Instruções de Instalação

1. **Upload dos arquivos**: Faça upload dos dois arquivos PHP para o servidor
   - Local: `https://sas.makecard.com.br/`
   - Certifique-se de que estão no mesmo diretório dos outros endpoints

2. **Verificar permissões**: Ambos arquivos devem ter permissão de execução

3. **Testar conexão**: Verifique se a classe `Banco` e o método `conectar_postgres()` estão funcionando

4. **Verificar tabela**: Confirme que a tabela `sind.agendamento` existe no PostgreSQL

5. **Testar endpoints**:
   ```bash
   # Teste de agendamento
   curl -X POST https://sas.makecard.com.br/grava_agendamento_app.php \
     -d "cod_associado=123456&id_empregador=1&cod_convenio=1"
   
   # Teste de listagem
   curl -X POST https://sas.makecard.com.br/lista_agendamentos_app.php \
     -d "cod_associado=123456&id_empregador=1"
   ```

## 🔧 Logs e Debug

Os arquivos fazem log automaticamente via `error_log()`. Para verificar:

1. **Logs de sucesso**: Agendamentos criados e buscas realizadas
2. **Logs de erro**: Problemas de conexão, validação ou SQL
3. **Local dos logs**: Normalmente em `/var/log/apache2/error.log` ou `/var/log/php/error.log`

## ⚠️ Importante

- Ajuste o caminho do `require_once 'Adm/php/banco.php'` conforme sua estrutura
- Certifique-se de que a classe `Banco` tem o método `conectar_postgres()`
- Teste sempre em ambiente de desenvolvimento antes de usar em produção 