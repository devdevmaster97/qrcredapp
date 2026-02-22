# Análise de Impacto: Renomeação `divisao` → `id_divisao`

## 📊 Tabelas Afetadas

| Tabela | Coluna Atual | Nova Coluna | Registros | Prioridade |
|--------|--------------|-------------|-----------|------------|
| `antecipacao` | `divisao` | `id_divisao` | 275 (45 NULL) | ALTA |
| `conta` | `divisao` | `id_divisao` | 754 | ALTA |
| `convenio` | `divisao` | `id_divisao` | 249 (1 NULL) | ALTA |
| `empregador` | `divisao` | `id_divisao` | ✅ Já tem FK | ALTA |
| `solicitacao_bloqueio` | `divisao` | `id_divisao` | - | ALTA |
| `valor_taxa_cartao` | `divisao` | `id_divisao` | - | ALTA |

---

## 🔴 IMPACTO CRÍTICO - Arquivos que DEVEM ser Atualizados

### **1. Tabela: `sind.antecipacao`**

#### **Arquivos PHP Afetados:**

**a) `historico_antecipacao_app_get.php`**
- **Linhas:** 49, 55, 59, 72, 76, 84
- **Impacto:** ❌ CRÍTICO - Script quebra completamente
- **Uso:** 
  - Recebe parâmetro `divisao` via GET/POST
  - Usa em WHERE clause: `WHERE ... AND divisao = ?`
- **Correção necessária:**
  ```php
  // ANTES
  $divisao = $_GET['divisao'] ?? '';
  WHERE matricula = ? AND empregador = ? AND id_associado = ? AND divisao = ?
  
  // DEPOIS
  $divisao = $_GET['divisao'] ?? ''; // Manter nome da variável
  WHERE matricula = ? AND empregador = ? AND id_associado = ? AND id_divisao = ?
  ```

**b) `grava_antecipacao_app_fixed.php`**
- **Linhas:** 181-230 (INSERT INTO sind.antecipacao)
- **Impacto:** ⚠️ MÉDIO - Precisa verificar se usa coluna divisao
- **Ação:** Revisar INSERT statement

**c) `grava_antecipacao_app_fixed_4.php`**
- **Linhas:** 202-250 (INSERT INTO sind.antecipacao)
- **Impacto:** ⚠️ MÉDIO - Precisa verificar se usa coluna divisao
- **Ação:** Revisar INSERT statement

#### **APIs TypeScript Afetadas:**

**a) `app/api/verificar-antecipacao-sasmais/route.ts`**
- **Linhas:** 12, 25, 27, 39
- **Impacto:** ✅ SEM IMPACTO DIRETO
- **Motivo:** Envia `id_divisao` para PHP, não usa nome de coluna SQL
- **Ação:** Nenhuma (PHP já recebe `id_divisao`)

**b) `app/api/verificar-adesao-antecipacao-simples/route.ts`**
- **Linhas:** 13, 26, 28, 40
- **Impacto:** ✅ SEM IMPACTO DIRETO
- **Motivo:** Envia `id_divisao` para PHP
- **Ação:** Nenhuma

**c) `app/api/test-historico-debug/route.ts`**
- **Linhas:** 13, 25
- **Impacto:** ⚠️ TESTE - Usa `divisao` como parâmetro
- **Ação:** Manter (é parâmetro de requisição, não nome de coluna)

---

### **2. Tabela: `sind.conta`**

#### **Arquivos PHP Afetados:**

**a) `grava_venda_app_com_taxa_v2_corrigido.php`**
- **Linhas:** 56, 115, 141, 173-174, 198, 242-243, 265, 305-306, 326
- **Impacto:** ❌ CRÍTICO - Script quebra completamente
- **Uso:**
  - INSERT: `INSERT INTO sind.conta (..., divisao) VALUES (..., :divisao)`
  - Bind: `$stmt->bindParam(':divisao', $divisao, PDO::PARAM_INT)`
- **Correção necessária:**
  ```php
  // ANTES
  INSERT INTO sind.conta (..., divisao) VALUES (..., :divisao)
  
  // DEPOIS
  INSERT INTO sind.conta (..., id_divisao) VALUES (..., :id_divisao)
  $stmt->bindParam(':id_divisao', $divisao, PDO::PARAM_INT);
  ```

**b) `grava_venda_app_com_taxa_FINAL.php`**
- **Linhas:** 56, 115, 143, 175-176, 200, 244-245, 267, 308-309, 328, 357
- **Impacto:** ❌ CRÍTICO
- **Uso:** Igual ao arquivo acima
- **Correção:** Mesma correção

**c) `grava_venda_app_com_taxa_compativel.php`**
- **Linhas:** 50, 115-116, 184-185, 207, 282-283, 305, 331
- **Impacto:** ❌ CRÍTICO
- **Uso:** INSERT e UPDATE statements
- **Correção:** Renomear coluna em todos os SQLs

**d) `grava_venda_app_com_taxa.php`**
- **Linhas:** 111-112 (INSERT INTO sind.conta)
- **Impacto:** ❌ CRÍTICO
- **Correção:** Renomear coluna no INSERT

**e) `test_conta_debug.php`**
- **Linhas:** 39-40, 63-64
- **Impacto:** ⚠️ TESTE - Script de debug
- **Ação:** Atualizar para manter funcionalidade de debug

---

### **3. Tabela: `sind.convenio`**

#### **Arquivos PHP Afetados:**

**a) `grava_venda_app_com_taxa_v2_corrigido.php`**
- **Linhas:** 69
- **Impacto:** ✅ SEM IMPACTO
- **Motivo:** Usa `SELECT * FROM sind.convenio WHERE codigo = ...`
- **Ação:** Nenhuma (SELECT * pega todas as colunas)

**b) `grava_venda_app_com_taxa_FINAL.php`**
- **Linhas:** 69
- **Impacto:** ✅ SEM IMPACTO
- **Motivo:** SELECT *
- **Ação:** Nenhuma

**c) `grava_venda_app_com_taxa_compativel.php`**
- **Linhas:** 63
- **Impacto:** ✅ SEM IMPACTO
- **Motivo:** SELECT *
- **Ação:** Nenhuma

---

### **4. Tabela: `sind.valor_taxa_cartao`**

#### **Arquivos PHP Afetados:**

**a) `grava_venda_app_com_taxa_v2_corrigido.php`**
- **Linhas:** 113, 115
- **Impacto:** ❌ CRÍTICO
- **Uso:**
  ```php
  SELECT valor FROM sind.valor_taxa_cartao WHERE divisao = :divisao
  $stmt_taxa_valor->bindParam(':divisao', $divisao, PDO::PARAM_INT);
  ```
- **Correção:**
  ```php
  SELECT valor FROM sind.valor_taxa_cartao WHERE id_divisao = :id_divisao
  $stmt_taxa_valor->bindParam(':id_divisao', $divisao, PDO::PARAM_INT);
  ```

**b) `grava_venda_app_com_taxa_FINAL.php`**
- **Linhas:** 113, 115
- **Impacto:** ❌ CRÍTICO
- **Correção:** Mesma correção

---

### **5. Tabela: `sind.empregador`**

#### **Status:**
✅ **JÁ TEM FK** - Não precisa de alteração

---

### **6. Tabela: `sind.solicitacao_bloqueio`**

#### **Status:**
⚠️ **NÃO ENCONTRADO** - Nenhum arquivo PHP ou API usa esta tabela
- **Ação:** Renomear coluna sem impacto no código

---

## 📋 RESUMO DE ARQUIVOS A ATUALIZAR

### **CRÍTICO (Quebra Funcionalidade):**

1. ✅ `historico_antecipacao_app_get.php` - WHERE clause com `divisao`
2. ✅ `grava_venda_app_com_taxa_v2_corrigido.php` - INSERT e SELECT com `divisao`
3. ✅ `grava_venda_app_com_taxa_FINAL.php` - INSERT e SELECT com `divisao`
4. ✅ `grava_venda_app_com_taxa_compativel.php` - INSERT e UPDATE com `divisao`
5. ✅ `grava_venda_app_com_taxa.php` - INSERT com `divisao`

### **MÉDIO (Precisa Verificação):**

6. ⚠️ `grava_antecipacao_app_fixed.php` - Verificar INSERT statement
7. ⚠️ `grava_antecipacao_app_fixed_4.php` - Verificar INSERT statement

### **BAIXO (Scripts de Teste/Debug):**

8. 🔧 `test_conta_debug.php` - Script de debug
9. 🔧 `app/api/test-historico-debug/route.ts` - API de teste

### **SEM IMPACTO:**

- ✅ Todos os arquivos que usam `SELECT *`
- ✅ APIs TypeScript que apenas passam parâmetros (não usam nomes de colunas SQL)

---

## 🔧 SCRIPT SQL PARA RENOMEAÇÃO SEGURA

```sql
-- ============================================
-- SCRIPT DE RENOMEAÇÃO: divisao → id_divisao
-- ============================================

-- IMPORTANTE: Executar em TRANSAÇÃO para rollback em caso de erro
BEGIN;

-- 1. TABELA: sind.antecipacao
ALTER TABLE sind.antecipacao 
RENAME COLUMN divisao TO id_divisao;

-- 2. TABELA: sind.conta
ALTER TABLE sind.conta 
RENAME COLUMN divisao TO id_divisao;

-- 3. TABELA: sind.convenio
ALTER TABLE sind.convenio 
RENAME COLUMN divisao TO id_divisao;

-- 4. TABELA: sind.solicitacao_bloqueio
ALTER TABLE sind.solicitacao_bloqueio 
RENAME COLUMN divisao TO id_divisao;

-- 5. TABELA: sind.valor_taxa_cartao
ALTER TABLE sind.valor_taxa_cartao 
RENAME COLUMN divisao TO id_divisao;

-- VERIFICAR SE TUDO ESTÁ OK
SELECT 
    'antecipacao' as tabela,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'sind' 
  AND table_name = 'antecipacao' 
  AND column_name = 'id_divisao'

UNION ALL

SELECT 
    'conta' as tabela,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'sind' 
  AND table_name = 'conta' 
  AND column_name = 'id_divisao'

UNION ALL

SELECT 
    'convenio' as tabela,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'sind' 
  AND table_name = 'convenio' 
  AND column_name = 'id_divisao'

UNION ALL

SELECT 
    'solicitacao_bloqueio' as tabela,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'sind' 
  AND table_name = 'solicitacao_bloqueio' 
  AND column_name = 'id_divisao'

UNION ALL

SELECT 
    'valor_taxa_cartao' as tabela,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'sind' 
  AND table_name = 'valor_taxa_cartao' 
  AND column_name = 'id_divisao';

-- Se tudo estiver OK, COMMIT
-- Se houver erro, ROLLBACK
COMMIT;
-- ROLLBACK;
```

---

## 📝 CHECKLIST DE ATUALIZAÇÃO

### **ANTES de Renomear no Banco:**

- [ ] Fazer backup completo do banco de dados
- [ ] Testar script SQL em ambiente de desenvolvimento
- [ ] Verificar se há views ou stored procedures que usam essas colunas

### **Atualizar Arquivos PHP (ORDEM RECOMENDADA):**

**1. Arquivos Críticos de Venda/Conta:**
- [ ] `grava_venda_app_com_taxa_FINAL.php`
  - Linha 113: `WHERE divisao = :divisao` → `WHERE id_divisao = :id_divisao`
  - Linha 115: `bindParam(':divisao'` → `bindParam(':id_divisao'`
  - Linhas 175-176: `INSERT ... divisao) VALUES ... :divisao)` → `id_divisao ... :id_divisao`
  - Linha 200: `bindParam(':divisao'` → `bindParam(':id_divisao'`
  - Linhas 244-245: Mesma correção
  - Linha 267: `bindParam(':divisao'` → `bindParam(':id_divisao'`
  - Linhas 308-309: Mesma correção
  - Linha 328: `bindParam(':divisao'` → `bindParam(':id_divisao'`
  - Linha 357: `UPDATE ... WHERE ... AND divisao =` → `AND id_divisao =`

- [ ] `grava_venda_app_com_taxa_v2_corrigido.php` (mesmas correções)
- [ ] `grava_venda_app_com_taxa_compativel.php` (mesmas correções)
- [ ] `grava_venda_app_com_taxa.php` (INSERT statement)

**2. Arquivos de Antecipação:**
- [ ] `historico_antecipacao_app_get.php`
  - Linha 72: `WHERE ... AND divisao = ?` → `AND id_divisao = ?`
  - Manter variável `$divisao` (é nome de variável, não coluna)

- [ ] `grava_antecipacao_app_fixed.php` (verificar INSERT)
- [ ] `grava_antecipacao_app_fixed_4.php` (verificar INSERT)

**3. Scripts de Teste/Debug:**
- [ ] `test_conta_debug.php` (atualizar para manter funcionalidade)

### **Após Atualizar Arquivos:**

- [ ] Fazer deploy dos arquivos PHP atualizados no servidor
- [ ] Executar script SQL de renomeação no banco
- [ ] Testar funcionalidades críticas:
  - [ ] Criar novo lançamento (venda)
  - [ ] Verificar taxa de manutenção
  - [ ] Consultar histórico de antecipação
  - [ ] Criar nova antecipação
- [ ] Monitorar logs de erro do PHP
- [ ] Verificar se há erros 500 nas APIs

---

## ⚠️ RISCOS E MITIGAÇÕES

### **Riscos:**

1. **Downtime durante deploy:** Scripts PHP quebram até atualização
2. **Dados inconsistentes:** Se renomear banco antes de atualizar PHP
3. **Rollback complexo:** Precisa reverter banco + arquivos

### **Mitigações:**

1. **Deploy em horário de baixo tráfego** (madrugada)
2. **Ordem correta:**
   - ✅ 1º: Atualizar TODOS os arquivos PHP
   - ✅ 2º: Fazer deploy no servidor
   - ✅ 3º: Renomear colunas no banco
3. **Backup completo antes de iniciar**
4. **Testar em ambiente de desenvolvimento primeiro**
5. **Ter script de rollback pronto:**
   ```sql
   BEGIN;
   ALTER TABLE sind.antecipacao RENAME COLUMN id_divisao TO divisao;
   ALTER TABLE sind.conta RENAME COLUMN id_divisao TO divisao;
   ALTER TABLE sind.convenio RENAME COLUMN id_divisao TO divisao;
   ALTER TABLE sind.solicitacao_bloqueio RENAME COLUMN id_divisao TO divisao;
   ALTER TABLE sind.valor_taxa_cartao RENAME COLUMN id_divisao TO divisao;
   COMMIT;
   ```

---

## 📊 RESUMO EXECUTIVO

**Total de arquivos a atualizar:** 8 arquivos críticos + 2 de teste

**Impacto:**
- ❌ **CRÍTICO:** 5 arquivos (quebra funcionalidade)
- ⚠️ **MÉDIO:** 2 arquivos (precisa verificação)
- 🔧 **BAIXO:** 2 arquivos (scripts de teste)

**Tempo estimado:**
- Atualização de código: 1-2 horas
- Testes: 1 hora
- Deploy: 30 minutos
- **Total:** 2.5 - 3.5 horas

**Recomendação:**
✅ **PROSSEGUIR** com a renomeação, mas seguir rigorosamente a ordem de atualização e fazer backup completo antes.

---

**Próximos passos:**
1. Revisar este documento
2. Fazer backup do banco
3. Atualizar arquivos PHP conforme checklist
4. Testar em desenvolvimento
5. Agendar deploy para horário de baixo tráfego
6. Executar renomeação no banco
7. Monitorar logs e funcionalidades
