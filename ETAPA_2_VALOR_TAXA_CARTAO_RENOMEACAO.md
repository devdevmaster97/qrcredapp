# ETAPA 2: Renomeação `divisao` → `id_divisao` - Tabela `valor_taxa_cartao`

## 📋 Estratégia: Começar pelas Tabelas Mais Simples

✅ **Por que esta tabela primeiro:**
- Menos arquivos afetados (4 arquivos PHP)
- Mudanças simples e diretas
- Baixo risco de impacto
- Fácil de testar e validar
- Deixar tabela `conta` (mais complexa) para o final

---

## 🎯 Escopo da ETAPA 2

**Tabela:** `sind.valor_taxa_cartao`

**Coluna:** `divisao` → `id_divisao`

**Registros afetados:** Não especificado (tabela de configuração)

**Uso:** Armazena o valor da taxa de manutenção do cartão por divisão

---

## 📁 Arquivos PHP que Precisam ser Atualizados

### **Total: 4 arquivos**

1. ✅ `grava_venda_app_com_taxa_FINAL.php` - **CRÍTICO**
2. ✅ `grava_venda_app_com_taxa_v2_corrigido.php` - **CRÍTICO**
3. ✅ `grava_venda_app_com_taxa_compativel.php` - **CRÍTICO**
4. ✅ `grava_venda_app_com_taxa.php` - **CRÍTICO**

---

## 🔧 ARQUIVO 1: `grava_venda_app_com_taxa_FINAL.php`

### **Modificações Necessárias:**

#### **Linha 113: SELECT com WHERE divisao**

**ANTES:**
```php
// Buscar valor da taxa
$sql_taxa_valor = "SELECT valor FROM sind.valor_taxa_cartao WHERE divisao = :divisao ORDER BY id DESC LIMIT 1";
$stmt_taxa_valor = $pdo->prepare($sql_taxa_valor);
$stmt_taxa_valor->bindParam(':divisao', $divisao, PDO::PARAM_INT);
```

**DEPOIS:**
```php
// Buscar valor da taxa
$sql_taxa_valor = "SELECT valor FROM sind.valor_taxa_cartao WHERE id_divisao = :id_divisao ORDER BY id DESC LIMIT 1";
$stmt_taxa_valor = $pdo->prepare($sql_taxa_valor);
$stmt_taxa_valor->bindParam(':id_divisao', $divisao, PDO::PARAM_INT);
```

**Mudanças:**
- Linha 113: `WHERE divisao = :divisao` → `WHERE id_divisao = :id_divisao`
- Linha 115: `bindParam(':divisao'` → `bindParam(':id_divisao'`

---

## 🔧 ARQUIVO 2: `grava_venda_app_com_taxa_v2_corrigido.php`

### **Modificações Necessárias:**

#### **Linha 113: SELECT com WHERE divisao**

**ANTES:**
```php
// Buscar valor da taxa
$sql_taxa_valor = "SELECT valor FROM sind.valor_taxa_cartao WHERE divisao = :divisao ORDER BY id DESC LIMIT 1";
$stmt_taxa_valor = $pdo->prepare($sql_taxa_valor);
$stmt_taxa_valor->bindParam(':divisao', $divisao, PDO::PARAM_INT);
```

**DEPOIS:**
```php
// Buscar valor da taxa
$sql_taxa_valor = "SELECT valor FROM sind.valor_taxa_cartao WHERE id_divisao = :id_divisao ORDER BY id DESC LIMIT 1";
$stmt_taxa_valor = $pdo->prepare($sql_taxa_valor);
$stmt_taxa_valor->bindParam(':id_divisao', $divisao, PDO::PARAM_INT);
```

**Mudanças:**
- Linha 113: `WHERE divisao = :divisao` → `WHERE id_divisao = :id_divisao`
- Linha 115: `bindParam(':divisao'` → `bindParam(':id_divisao'`

---

## 🔧 ARQUIVO 3: `grava_venda_app_com_taxa_compativel.php`

### **Modificações Necessárias:**

#### **Linha 244: SELECT com WHERE divisao**

**ANTES:**
```php
// 1. Buscar valor da taxa
$sql_taxa = "SELECT valor FROM sind.valor_taxa_cartao WHERE divisao = :divisao ORDER BY id DESC LIMIT 1";
$stmt_taxa = $pdo->prepare($sql_taxa);
$stmt_taxa->bindParam(':divisao', $divisao, PDO::PARAM_INT);
```

**DEPOIS:**
```php
// 1. Buscar valor da taxa
$sql_taxa = "SELECT valor FROM sind.valor_taxa_cartao WHERE id_divisao = :id_divisao ORDER BY id DESC LIMIT 1";
$stmt_taxa = $pdo->prepare($sql_taxa);
$stmt_taxa->bindParam(':id_divisao', $divisao, PDO::PARAM_INT);
```

**Mudanças:**
- Linha 244: `WHERE divisao = :divisao` → `WHERE id_divisao = :id_divisao`
- Linha 246: `bindParam(':divisao'` → `bindParam(':id_divisao'`

---

## 🔧 ARQUIVO 4: `grava_venda_app_com_taxa.php`

### **Modificações Necessárias:**

#### **Linha 153-154: SELECT com WHERE divisao**

**ANTES:**
```php
$sql_taxa = "SELECT valor FROM sind.valor_taxa_cartao 
             WHERE divisao = ? 
             ORDER BY id DESC 
             LIMIT 1";
```

**DEPOIS:**
```php
$sql_taxa = "SELECT valor FROM sind.valor_taxa_cartao 
             WHERE id_divisao = ? 
             ORDER BY id DESC 
             LIMIT 1";
```

**Mudança:**
- Linha 154: `WHERE divisao = ?` → `WHERE id_divisao = ?`

**⚠️ IMPORTANTE:** Este arquivo usa placeholders `?` em vez de named parameters (`:divisao`). A variável `$divisao` no `bindParam` continua igual.

---

## 📝 RESUMO DAS MUDANÇAS

| Arquivo | Linhas | Mudança |
|---------|--------|---------|
| `grava_venda_app_com_taxa_FINAL.php` | 113, 115 | `WHERE divisao = :divisao` → `WHERE id_divisao = :id_divisao`<br>`bindParam(':divisao'` → `bindParam(':id_divisao'` |
| `grava_venda_app_com_taxa_v2_corrigido.php` | 113, 115 | `WHERE divisao = :divisao` → `WHERE id_divisao = :id_divisao`<br>`bindParam(':divisao'` → `bindParam(':id_divisao'` |
| `grava_venda_app_com_taxa_compativel.php` | 244, 246 | `WHERE divisao = :divisao` → `WHERE id_divisao = :id_divisao`<br>`bindParam(':divisao'` → `bindParam(':id_divisao'` |
| `grava_venda_app_com_taxa.php` | 154 | `WHERE divisao = ?` → `WHERE id_divisao = ?` |

**Total de mudanças:** 7 linhas em 4 arquivos

---

## 🗄️ SCRIPT SQL - ETAPA 2

```sql
-- ============================================
-- ETAPA 2: Renomear coluna divisao → id_divisao
-- TABELA: sind.valor_taxa_cartao
-- ============================================

-- BACKUP RECOMENDADO ANTES DE EXECUTAR
-- pg_dump -U postgres -d seu_banco -t sind.valor_taxa_cartao > backup_valor_taxa_cartao.sql

BEGIN;

-- Renomear coluna
ALTER TABLE sind.valor_taxa_cartao 
RENAME COLUMN divisao TO id_divisao;

-- Verificar se a renomeação foi bem-sucedida
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'sind' 
  AND table_name = 'valor_taxa_cartao' 
  AND column_name = 'id_divisao';

-- Se o resultado acima mostrar a coluna id_divisao, está OK
-- Caso contrário, execute ROLLBACK;

-- Verificar registros
SELECT COUNT(*) as total_registros FROM sind.valor_taxa_cartao;
SELECT COUNT(*) as registros_com_divisao FROM sind.valor_taxa_cartao WHERE id_divisao IS NOT NULL;
SELECT COUNT(*) as registros_sem_divisao FROM sind.valor_taxa_cartao WHERE id_divisao IS NULL;

-- Visualizar alguns registros
SELECT id, id_divisao, valor FROM sind.valor_taxa_cartao ORDER BY id DESC LIMIT 5;

-- Se tudo estiver OK, confirmar
COMMIT;

-- Se houver algum problema, reverter
-- ROLLBACK;
```

---

## 🧪 SCRIPT SQL DE ROLLBACK (Caso necessário)

```sql
-- ============================================
-- ROLLBACK ETAPA 2: Reverter renomeação
-- TABELA: sind.valor_taxa_cartao
-- ============================================

BEGIN;

-- Reverter renomeação
ALTER TABLE sind.valor_taxa_cartao 
RENAME COLUMN id_divisao TO divisao;

-- Verificar
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'sind' 
  AND table_name = 'valor_taxa_cartao' 
  AND column_name = 'divisao';

COMMIT;
```

---

## ✅ CHECKLIST DE EXECUÇÃO - ETAPA 2

### **FASE 1: Preparação (ANTES de qualquer mudança)**

- [ ] Fazer backup completo do banco de dados
- [ ] Fazer backup específico da tabela valor_taxa_cartao
- [ ] Copiar os 4 arquivos PHP originais para backup local
- [ ] Verificar se há processos de venda em andamento
- [ ] Escolher horário de baixo tráfego

### **FASE 2: Atualização dos Arquivos PHP**

- [ ] **Arquivo 1:** `grava_venda_app_com_taxa_FINAL.php`
  - [ ] Linha 113: Alterar `WHERE divisao = :divisao` para `WHERE id_divisao = :id_divisao`
  - [ ] Linha 115: Alterar `bindParam(':divisao'` para `bindParam(':id_divisao'`
  - [ ] Salvar arquivo
  - [ ] Fazer upload para servidor

- [ ] **Arquivo 2:** `grava_venda_app_com_taxa_v2_corrigido.php`
  - [ ] Linha 113: Alterar `WHERE divisao = :divisao` para `WHERE id_divisao = :id_divisao`
  - [ ] Linha 115: Alterar `bindParam(':divisao'` para `bindParam(':id_divisao'`
  - [ ] Salvar arquivo
  - [ ] Fazer upload para servidor

- [ ] **Arquivo 3:** `grava_venda_app_com_taxa_compativel.php`
  - [ ] Linha 244: Alterar `WHERE divisao = :divisao` para `WHERE id_divisao = :id_divisao`
  - [ ] Linha 246: Alterar `bindParam(':divisao'` para `bindParam(':id_divisao'`
  - [ ] Salvar arquivo
  - [ ] Fazer upload para servidor

- [ ] **Arquivo 4:** `grava_venda_app_com_taxa.php`
  - [ ] Linha 154: Alterar `WHERE divisao = ?` para `WHERE id_divisao = ?`
  - [ ] Salvar arquivo
  - [ ] Fazer upload para servidor

### **FASE 3: Verificação dos Arquivos no Servidor**

- [ ] Verificar se os 4 arquivos foram atualizados corretamente
- [ ] Comparar tamanho/data de modificação dos arquivos
- [ ] Fazer download dos arquivos do servidor e comparar com locais

### **FASE 4: Renomeação no Banco de Dados**

- [ ] Conectar ao banco de dados PostgreSQL
- [ ] Executar `BEGIN;`
- [ ] Executar `ALTER TABLE sind.valor_taxa_cartao RENAME COLUMN divisao TO id_divisao;`
- [ ] Executar queries de verificação
- [ ] Se OK, executar `COMMIT;`
- [ ] Se erro, executar `ROLLBACK;`

### **FASE 5: Testes Funcionais**

- [ ] **Teste 1:** Criar novo lançamento (venda) no app
  - [ ] Abrir app no celular
  - [ ] Ir para tela de Lançamentos
  - [ ] Criar novo lançamento
  - [ ] Verificar se foi gravado corretamente
  - [ ] Verificar se taxa foi aplicada (se aplicável)

- [ ] **Teste 2:** Verificar valor da taxa
  - [ ] Consultar tabela valor_taxa_cartao
  - [ ] Confirmar que valores estão corretos
  - [ ] Verificar se sistema busca taxa corretamente

- [ ] **Teste 3:** Verificar logs do servidor
  - [ ] Checar logs de erro do PHP
  - [ ] Verificar se há erros relacionados a "divisao"
  - [ ] Confirmar que não há erros 500

### **FASE 6: Monitoramento Pós-Deploy**

- [ ] Monitorar por 1 hora após deploy
- [ ] Verificar se usuários conseguem criar lançamentos
- [ ] Checar se há reclamações ou erros reportados
- [ ] Validar que taxa está sendo aplicada corretamente

### **FASE 7: Documentação**

- [ ] Registrar data/hora da mudança
- [ ] Documentar problemas encontrados (se houver)
- [ ] Atualizar documentação técnica
- [ ] Marcar ETAPA 2 como concluída

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

### **Problema 2: Taxa não é aplicada em novos lançamentos**

**Causa:** Query não encontra valor da taxa devido ao nome da coluna errado

**Solução:**
1. Verificar linhas 113/244/154 dos arquivos no servidor
2. Confirmar que estão usando `id_divisao`
3. Se não, fazer upload dos arquivos corretos

---

### **Problema 3: Erro ao criar lançamento**

**Causa:** Um dos 4 arquivos PHP não foi atualizado

**Solução:**
1. Verificar logs de erro do PHP para identificar qual arquivo
2. Atualizar o arquivo específico
3. Fazer upload para servidor
4. Testar novamente

---

## 📊 ESTIMATIVA DE TEMPO - ETAPA 2

| Fase | Tempo Estimado |
|------|----------------|
| Preparação e backup | 10 minutos |
| Atualização arquivos PHP | 15 minutos |
| Upload para servidor | 5 minutos |
| Renomeação no banco | 5 minutos |
| Testes funcionais | 15 minutos |
| Monitoramento | 60 minutos |
| **TOTAL** | **~2 horas** |

---

## 🎯 CRITÉRIOS DE SUCESSO

✅ **ETAPA 2 será considerada bem-sucedida se:**

1. Coluna `divisao` foi renomeada para `id_divisao` na tabela `sind.valor_taxa_cartao`
2. Novos lançamentos são criados com sucesso
3. Taxa de cartão é aplicada corretamente (quando aplicável)
4. Sistema busca valor da taxa sem erros
5. Não há erros nos logs do servidor
6. Usuários não reportam problemas

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

**Após ETAPA 2 concluída com sucesso:**

- Aguardar 24-48 horas de monitoramento
- Confirmar estabilidade do sistema
- Iniciar **ETAPA 3:** Tabela `sind.convenio` (também simples)
- Deixar **tabela `conta`** para o final (mais complexa)

---

## 📝 ORDEM RECOMENDADA DAS PRÓXIMAS ETAPAS

1. ✅ **ETAPA 1:** `antecipacao` (concluída)
2. ✅ **ETAPA 2:** `valor_taxa_cartao` (atual)
3. 📋 **ETAPA 3:** `convenio` (simples - SELECT *)
4. 📋 **ETAPA 4:** `solicitacao_bloqueio` (simples - sem uso encontrado)
5. 📋 **ETAPA 5:** `conta` (complexa - muitos arquivos)

---

## 📝 NOTAS IMPORTANTES

1. **Horário recomendado:** Madrugada ou horário de baixo tráfego
2. **Comunicação:** Avisar equipe sobre manutenção programada
3. **Backup:** Essencial ter backup antes de iniciar
4. **Rollback:** Ter plano de rollback pronto e testado
5. **Monitoramento:** Não considerar concluído até 24h de estabilidade
6. **Variáveis PHP:** Manter nomes de variáveis `$divisao` (apenas mudar nomes de colunas SQL)

---

**Status:** 📋 PRONTO PARA EXECUÇÃO

**Criado em:** {{ data_atual }}

**Próxima revisão:** Após conclusão da ETAPA 2
