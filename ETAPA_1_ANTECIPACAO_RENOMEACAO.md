# ETAPA 1: Renomeação `divisao` → `id_divisao` - Tabela `antecipacao`

## 📋 Estratégia: Abordagem Incremental

✅ **Vantagens desta abordagem:**
- Menor risco de downtime
- Mais fácil de testar e validar
- Rollback mais simples se necessário
- Identificação rápida de problemas

---

## 🎯 Escopo da ETAPA 1

**Tabela:** `sind.antecipacao`

**Coluna:** `divisao` → `id_divisao`

**Registros afetados:** 275 (45 NULL)

---

## 📁 Arquivos PHP que Precisam ser Atualizados

### **Total: 3 arquivos**

1. ✅ `historico_antecipacao_app_get.php` - **CRÍTICO**
2. ✅ `grava_antecipacao_app_fixed.php` - **CRÍTICO**
3. ✅ `grava_antecipacao_app_fixed_4.php` - **CRÍTICO**

---

## 🔧 ARQUIVO 1: `historico_antecipacao_app_get.php`

### **Modificações Necessárias:**

#### **Linha 72: WHERE clause**

**ANTES:**
```php
$sql = "SELECT id, matricula, empregador, mes as mes_corrente, 
        data_solicitacao, valor as valor_solicitado, aprovado as status, 
        data_aprovacao, celular, valor_taxa as taxa, valor_a_descontar, chave_pix
        FROM sind.antecipacao 
        WHERE matricula = ? AND empregador = ? AND id_associado = ? AND divisao = ? 
        ORDER BY data_solicitacao DESC";
```

**DEPOIS:**
```php
$sql = "SELECT id, matricula, empregador, mes as mes_corrente, 
        data_solicitacao, valor as valor_solicitado, aprovado as status, 
        data_aprovacao, celular, valor_taxa as taxa, valor_a_descontar, chave_pix
        FROM sind.antecipacao 
        WHERE matricula = ? AND empregador = ? AND id_associado = ? AND    = ? 
        ORDER BY data_solicitacao DESC";
```

**Mudança:** `AND divisao = ?` → `AND id_divisao = ?`

---

**⚠️ IMPORTANTE:** Manter o nome da variável `$divisao` nas linhas 43, 49, 55, 56, 59, 76, 84, 141

**NÃO ALTERAR:**
```php
$divisao = $_GET['divisao'] ?? '';  // ✅ MANTER
$divisao = $_POST['divisao'] ?? ''; // ✅ MANTER
$stmt->bindParam(4, $divisao, PDO::PARAM_INT); // ✅ MANTER
```

**Motivo:** A variável PHP `$divisao` é apenas um nome de variável local. O que importa é o nome da coluna no SQL.

---

## 🔧 ARQUIVO 2: `grava_antecipacao_app_fixed.php`

### **Modificações Necessárias:**

#### **Linha 192: Nome da coluna no INSERT**

**ANTES:**
```php
$stmt = $pdo->prepare("
    INSERT INTO sind.antecipacao (
        matricula,
        empregador,
        mes,
        data_solicitacao,
        valor,
        aprovado,
        celular,
        valor_taxa,
        valor_a_descontar,
        chave_pix,
        divisao,
        id_associado,
        hora
    ) VALUES (?, ?, ?, CURRENT_DATE, ?, null, ?, ?, ?, ?, ?, ?, CAST(CURRENT_TIME AS TIME(0)))
");
```

**DEPOIS:**
```php
$stmt = $pdo->prepare("
    INSERT INTO sind.antecipacao (
        matricula,
        empregador,
        mes,
        data_solicitacao,
        valor,
        aprovado,
        celular,
        valor_taxa,
        valor_a_descontar,
        chave_pix,
        id_divisao,
        id_associado,
        hora
    ) VALUES (?, ?, ?, CURRENT_DATE, ?, null, ?, ?, ?, ?, ?, ?, CAST(CURRENT_TIME AS TIME(0)))
");
```

**Mudança:** `divisao,` → `id_divisao,` (linha 192)

---

**⚠️ IMPORTANTE:** Manter o comentário e a variável `$id_divisao` na linha 220

**NÃO ALTERAR:**
```php
$id_divisao,          // divisao  ✅ MANTER COMENTÁRIO
```

**Motivo:** O comentário `// divisao` é apenas documentação. A variável `$id_divisao` já está correta.

---

## 🔧 ARQUIVO 3: `grava_antecipacao_app_fixed_4.php`

### **Modificações Necessárias:**

#### **Linha 213: Nome da coluna no INSERT**

**ANTES:**
```php
$stmt = $pdo->prepare("
    INSERT INTO sind.antecipacao (
        matricula,
        empregador,
        mes,
        data_solicitacao,
        valor,
        aprovado,
        celular,
        valor_taxa,
        valor_a_descontar,
        chave_pix,
        divisao,
        id_associado,
        hora
    ) VALUES (?, ?, ?, CURRENT_DATE, ?, null, ?, ?, ?, ?, ?, ?, CAST(CURRENT_TIME AS TIME(0)))
    RETURNING id
");
```

**DEPOIS:**
```php
$stmt = $pdo->prepare("
    INSERT INTO sind.antecipacao (
        matricula,
        empregador,
        mes,
        data_solicitacao,
        valor,
        aprovado,
        celular,
        valor_taxa,
        valor_a_descontar,
        chave_pix,
        id_divisao,
        id_associado,
        hora
    ) VALUES (?, ?, ?, CURRENT_DATE, ?, null, ?, ?, ?, ?, ?, ?, CAST(CURRENT_TIME AS TIME(0)))
    RETURNING id
");
```

**Mudança:** `divisao,` → `id_divisao,` (linha 213)

---

**⚠️ IMPORTANTE:** A variável `$id_divisao` na linha 242 já está correta

**NÃO ALTERAR:**
```php
$id_divisao,  // ✅ JÁ ESTÁ CORRETO
```

---

## 📝 RESUMO DAS MUDANÇAS

| Arquivo | Linha | Mudança |
|---------|-------|---------|
| `historico_antecipacao_app_get.php` | 72 | `WHERE ... AND divisao = ?` → `AND id_divisao = ?` |
| `grava_antecipacao_app_fixed.php` | 192 | `divisao,` → `id_divisao,` |
| `grava_antecipacao_app_fixed_4.php` | 213 | `divisao,` → `id_divisao,` |

**Total de mudanças:** 3 linhas em 3 arquivos

---

## 🗄️ SCRIPT SQL - ETAPA 1

```sql
-- ============================================
-- ETAPA 1: Renomear coluna divisao → id_divisao
-- TABELA: sind.antecipacao
-- ============================================

-- BACKUP RECOMENDADO ANTES DE EXECUTAR
-- pg_dump -U postgres -d seu_banco -t sind.antecipacao > backup_antecipacao.sql

BEGIN;

-- Renomear coluna
ALTER TABLE sind.antecipacao 
RENAME COLUMN divisao TO id_divisao;

-- Verificar se a renomeação foi bem-sucedida
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'sind' 
  AND table_name = 'antecipacao' 
  AND column_name = 'id_divisao';

-- Se o resultado acima mostrar a coluna id_divisao, está OK
-- Caso contrário, execute ROLLBACK;

-- Verificar registros
SELECT COUNT(*) as total_registros FROM sind.antecipacao;
SELECT COUNT(*) as registros_com_divisao FROM sind.antecipacao WHERE id_divisao IS NOT NULL;
SELECT COUNT(*) as registros_sem_divisao FROM sind.antecipacao WHERE id_divisao IS NULL;

-- Se tudo estiver OK, confirmar
COMMIT;

-- Se houver algum problema, reverter
-- ROLLBACK;
```

---

## 🧪 SCRIPT SQL DE ROLLBACK (Caso necessário)

```sql
-- ============================================
-- ROLLBACK ETAPA 1: Reverter renomeação
-- TABELA: sind.antecipacao
-- ============================================

BEGIN;

-- Reverter renomeação
ALTER TABLE sind.antecipacao 
RENAME COLUMN id_divisao TO divisao;

-- Verificar
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'sind' 
  AND table_name = 'antecipacao' 
  AND column_name = 'divisao';

COMMIT;
```

---

## ✅ CHECKLIST DE EXECUÇÃO - ETAPA 1

### **FASE 1: Preparação (ANTES de qualquer mudança)**

- [ ] Fazer backup completo do banco de dados
- [ ] Fazer backup específico da tabela antecipacao
- [ ] Copiar os 3 arquivos PHP originais para backup local
- [ ] Testar conexão com servidor PHP
- [ ] Verificar se há processos de antecipação em andamento

### **FASE 2: Atualização dos Arquivos PHP**

- [ ] **Arquivo 1:** `historico_antecipacao_app_get.php`
  - [ ] Linha 72: Alterar `AND divisao = ?` para `AND id_divisao = ?`
  - [ ] Salvar arquivo
  - [ ] Fazer upload para servidor

- [ ] **Arquivo 2:** `grava_antecipacao_app_fixed.php`
  - [ ] Linha 192: Alterar `divisao,` para `id_divisao,`
  - [ ] Salvar arquivo
  - [ ] Fazer upload para servidor

- [ ] **Arquivo 3:** `grava_antecipacao_app_fixed_4.php`
  - [ ] Linha 213: Alterar `divisao,` para `id_divisao,`
  - [ ] Salvar arquivo
  - [ ] Fazer upload para servidor

### **FASE 3: Verificação dos Arquivos no Servidor**

- [ ] Verificar se os 3 arquivos foram atualizados corretamente
- [ ] Comparar tamanho/data de modificação dos arquivos
- [ ] Fazer download dos arquivos do servidor e comparar com locais

### **FASE 4: Renomeação no Banco de Dados**

- [ ] Conectar ao banco de dados PostgreSQL
- [ ] Executar `BEGIN;`
- [ ] Executar `ALTER TABLE sind.antecipacao RENAME COLUMN divisao TO id_divisao;`
- [ ] Executar queries de verificação
- [ ] Se OK, executar `COMMIT;`
- [ ] Se erro, executar `ROLLBACK;`

### **FASE 5: Testes Funcionais**

- [ ] **Teste 1:** Consultar histórico de antecipação
  - [ ] Abrir app no celular
  - [ ] Ir para tela de Antecipação
  - [ ] Verificar se histórico carrega corretamente
  - [ ] Verificar se dados estão corretos

- [ ] **Teste 2:** Criar nova antecipação
  - [ ] Preencher formulário de antecipação
  - [ ] Submeter solicitação
  - [ ] Verificar se foi gravada no banco
  - [ ] Verificar se aparece no histórico

- [ ] **Teste 3:** Verificar logs do servidor
  - [ ] Checar logs de erro do PHP
  - [ ] Verificar se há erros relacionados a "divisao"
  - [ ] Confirmar que não há erros 500

### **FASE 6: Monitoramento Pós-Deploy**

- [ ] Monitorar por 1 hora após deploy
- [ ] Verificar se usuários conseguem usar antecipação
- [ ] Checar se há reclamações ou erros reportados
- [ ] Validar que tudo está funcionando normalmente

### **FASE 7: Documentação**

- [ ] Registrar data/hora da mudança
- [ ] Documentar problemas encontrados (se houver)
- [ ] Atualizar documentação técnica
- [ ] Marcar ETAPA 1 como concluída

---

## ⚠️ PROBLEMAS COMUNS E SOLUÇÕES

### **Problema 1: Erro "column divisao does not exist"**

**Causa:** Arquivos PHP não foram atualizados antes da renomeação no banco

**Solução:**
1. Executar ROLLBACK no banco
2. Atualizar arquivos PHP
3. Fazer upload para servidor
4. Executar renomeação novamente

---

### **Problema 2: Histórico não carrega**

**Causa:** Arquivo `historico_antecipacao_app_get.php` não foi atualizado

**Solução:**
1. Verificar linha 72 do arquivo no servidor
2. Confirmar que está usando `id_divisao`
3. Se não, fazer upload do arquivo correto

---

### **Problema 3: Nova antecipação não grava**

**Causa:** Arquivos `grava_antecipacao_app_fixed*.php` não foram atualizados

**Solução:**
1. Verificar linhas 192/213 dos arquivos no servidor
2. Confirmar que estão usando `id_divisao`
3. Se não, fazer upload dos arquivos corretos

---

## 📊 ESTIMATIVA DE TEMPO - ETAPA 1

| Fase | Tempo Estimado |
|------|----------------|
| Preparação e backup | 15 minutos |
| Atualização arquivos PHP | 10 minutos |
| Upload para servidor | 5 minutos |
| Renomeação no banco | 5 minutos |
| Testes funcionais | 20 minutos |
| Monitoramento | 60 minutos |
| **TOTAL** | **~2 horas** |

---

## 🎯 CRITÉRIOS DE SUCESSO

✅ **ETAPA 1 será considerada bem-sucedida se:**

1. Coluna `divisao` foi renomeada para `id_divisao` na tabela `sind.antecipacao`
2. Histórico de antecipação carrega corretamente no app
3. Novas antecipações são gravadas com sucesso
4. Não há erros nos logs do servidor
5. Usuários não reportam problemas
6. Todos os 275 registros continuam acessíveis

---

## 📞 CONTATOS DE EMERGÊNCIA

**Em caso de problema crítico:**

1. Executar ROLLBACK imediatamente
2. Restaurar arquivos PHP originais
3. Verificar se sistema voltou ao normal
4. Analisar logs para identificar causa
5. Corrigir problema antes de tentar novamente

---

## 🚀 PRÓXIMA ETAPA

**Após ETAPA 1 concluída com sucesso:**

- Aguardar 24-48 horas de monitoramento
- Confirmar estabilidade do sistema
- Iniciar **ETAPA 2:** Tabela `sind.conta`

---

## 📝 NOTAS IMPORTANTES

1. **Horário recomendado:** Madrugada ou horário de baixo tráfego
2. **Comunicação:** Avisar equipe sobre manutenção programada
3. **Backup:** Essencial ter backup antes de iniciar
4. **Rollback:** Ter plano de rollback pronto e testado
5. **Monitoramento:** Não considerar concluído até 24h de estabilidade

---

**Status:** 📋 PRONTO PARA EXECUÇÃO

**Criado em:** {{ data_atual }}

**Próxima revisão:** Após conclusão da ETAPA 1
