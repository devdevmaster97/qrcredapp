# Debug - Novos Campos de Agendamentos

## 📋 Resumo das Alterações

Foram adicionados 3 novos campos na tabela `sind.agendamento`:
- `profissional` (varchar)
- `especialidade` (varchar)  
- `convenio_nome` (varchar)

## ✅ Código Frontend Atualizado

### 1. API de Agendamento (`app/api/agendamento/route.ts`)
- ✅ Recebe os novos campos do frontend
- ✅ Envia para o backend PHP com logs detalhados
- ✅ Validação e limpeza dos dados

### 2. API de Listagem (`app/api/agendamentos-lista/route.ts`)
- ✅ Logs detalhados para verificar se o backend retorna os novos campos
- ✅ Debug completo dos dados recebidos

### 3. Interface de Exibição (`app/components/dashboard/AgendamentosContent.tsx`)
- ✅ Exibe todos os novos campos
- ✅ Tratamento para campos vazios ou nulos
- ✅ Logs para debug dos dados recebidos

## 🔍 Como Verificar se Está Funcionando

### 1. Verificar Logs no Console do Navegador

Quando criar um agendamento, procure por logs como:
```
📋 [requestId] API Agendamento chamada: {profissional: "Dr. João", especialidade: "Cardiologia", convenio_nome: "Convênio X"}
📤 [requestId] Enviando para grava_agendamento_app.php: {profissional: "Dr. João", especialidade: "Cardiologia", convenio_nome: "Convênio X"}
```

### 2. Verificar Logs ao Listar Agendamentos

Ao visualizar agendamentos, procure por:
```
📋 [requestId] Agendamento 1: {profissional: "Dr. João" | "NÃO INFORMADO", especialidade: "Cardiologia" | "NÃO INFORMADO", convenio_nome: "Convênio X" | "NÃO INFORMADO"}
```

## 🚨 Possíveis Problemas e Soluções

### Problema 1: Campos não aparecem na interface
**Sintoma:** Interface mostra "Profissional não informado" para todos os agendamentos

**Verificação:**
1. Abra o Console do Navegador (F12)
2. Vá em "Meus Agendamentos"
3. Procure pelos logs da API de listagem

**Possível Causa:** Backend PHP `lista_agendamentos_app.php` não está retornando os novos campos

### Problema 2: Dados não são gravados no banco
**Sintoma:** Agendamento é criado mas sem os novos campos

**Verificação:**
1. Abra o Console do Navegador (F12)
2. Crie um novo agendamento
3. Procure pelos logs da API de agendamento
4. Verifique se os dados estão sendo enviados corretamente

**Possível Causa:** Backend PHP `grava_agendamento_app.php` não está processando os novos campos

## 🔧 Verificações no Backend PHP

### Arquivo: `grava_agendamento_app.php`

Verificar se o arquivo está recebendo e gravando os novos campos:

```php
// Receber os novos campos
$profissional = $_POST['profissional'] ?? '';
$especialidade = $_POST['especialidade'] ?? '';
$convenio_nome = $_POST['convenio_nome'] ?? '';

// Incluir na query SQL de INSERT
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

### Arquivo: `lista_agendamentos_app.php`

Verificar se o arquivo está retornando os novos campos:

```php
// Incluir os novos campos no SELECT
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

## 📊 Estrutura da Tabela

```sql
-- Verificar se os campos foram criados corretamente
DESCRIBE sind.agendamento;

-- Verificar dados existentes
SELECT id, cod_associado, profissional, especialidade, convenio_nome 
FROM sind.agendamento 
ORDER BY id DESC 
LIMIT 10;
```

## 🧪 Teste Manual

1. **Criar Agendamento:**
   - Vá em Dashboard > Convênios
   - Clique em "Agendar" em algum profissional
   - Verifique os logs no console

2. **Visualizar Agendamentos:**
   - Vá em Dashboard > Agendamentos
   - Verifique se os novos campos aparecem
   - Verifique os logs no console

3. **Verificar Banco de Dados:**
   ```sql
   SELECT * FROM sind.agendamento ORDER BY id DESC LIMIT 5;
   ```

## 📞 Suporte

Se os problemas persistirem:

1. **Verifique os logs do console do navegador**
2. **Verifique os logs do servidor PHP**
3. **Confirme se a estrutura da tabela está correta**
4. **Teste a query SQL manualmente**

## 🎯 Status da Implementação

- ✅ Frontend completamente atualizado
- ✅ APIs com logs detalhados
- ✅ Interface preparada para novos campos
- ⚠️ **Verificar backend PHP** (grava_agendamento_app.php e lista_agendamentos_app.php) 