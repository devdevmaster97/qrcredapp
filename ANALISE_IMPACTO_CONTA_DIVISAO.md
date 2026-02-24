# 📊 Análise de Impacto: Renomeação `conta.divisao` → `id_divisao`

## 🎯 Objetivo
Renomear a coluna `divisao` para `id_divisao` na tabela `sind.conta` e atualizar todos os arquivos afetados.

---

## 📋 Resumo Executivo

**Impacto:** ❌ **CRÍTICO - ALTO IMPACTO**

- **Total de arquivos PHP afetados:** 8 arquivos
- **Total de ocorrências:** ~50+ referências
- **Triggers afetadas:** 1 (fn_insere_taxa_cartao_automatica)
- **APIs TypeScript:** Nenhuma (apenas passam parâmetros)

---

## 🔴 ARQUIVOS PHP CRÍTICOS - PRECISAM ATUALIZAÇÃO

### **1. grava_venda_app_com_taxa_FINAL.php**
**Impacto:** ❌ CRÍTICO - Script quebra completamente

**Linhas afetadas:**
- **Linha 113:** `SELECT valor FROM sind.valor_taxa_cartao WHERE divisao = :divisao`
- **Linha 115:** `$stmt_taxa_valor->bindParam(':divisao', $divisao, PDO::PARAM_INT);`
- **Linha 142:** `$stmt_verifica->bindParam(':divisao', $divisao, PDO::PARAM_INT);`
- **Linhas 175-176:** `INSERT INTO sind.conta (...,divisao) VALUES (...,:divisao)`
- **Linha 200:** `$stmt->bindParam(':divisao', $divisao, PDO::PARAM_INT);`
- **Linhas 244-245:** `INSERT INTO sind.conta (...,divisao) VALUES (...,:divisao)`
- **Linha 267:** `$stmt->bindParam(':divisao', $divisao, PDO::PARAM_INT);`
- **Linhas 308-309:** `INSERT INTO sind.conta (...,divisao,aprovado) VALUES (...,:divisao,:aprovado)`
- **Linha 330:** `$stmt_taxa_insert->bindParam(':divisao', $divisao, PDO::PARAM_INT);`

**Correções necessárias:**
```php
// ANTES
INSERT INTO sind.conta (...,divisao) VALUES (...,:divisao)
$stmt->bindParam(':divisao', $divisao, PDO::PARAM_INT);

// DEPOIS
INSERT INTO sind.conta (...,id_divisao) VALUES (...,:id_divisao)
$stmt->bindParam(':id_divisao', $divisao, PDO::PARAM_INT);
```

---

### **2. grava_venda_app_com_taxa_v2_corrigido.php**
**Impacto:** ❌ CRÍTICO - Script quebra completamente

**Linhas afetadas:**
- **Linha 113:** `SELECT valor FROM sind.valor_taxa_cartao WHERE divisao = :divisao`
- **Linha 115:** `$stmt_taxa_valor->bindParam(':divisao', $divisao, PDO::PARAM_INT);`
- **Linha 141:** `$stmt_verifica->bindParam(':divisao', $divisao, PDO::PARAM_INT);`
- **Linhas 173-174:** `INSERT INTO sind.conta (...,divisao) VALUES (...,:divisao)`
- **Linha 198:** `$stmt->bindParam(':divisao', $divisao, PDO::PARAM_INT);`
- **Linhas 242-243:** `INSERT INTO sind.conta (...,divisao) VALUES (...,:divisao)`
- **Linha 265:** `$stmt->bindParam(':divisao', $divisao, PDO::PARAM_INT);`
- **Linhas 305-306:** `INSERT INTO sind.conta (...,divisao) VALUES (...,:divisao)`
- **Linha 326:** `$stmt_taxa_insert->bindParam(':divisao', $divisao, PDO::PARAM_INT);`

**Correções:** Mesmas do arquivo acima

---

### **3. grava_venda_app_com_taxa_compativel.php**
**Impacto:** ❌ CRÍTICO - Script quebra completamente

**Linhas afetadas:**
- **Linhas 115-116:** `INSERT INTO sind.conta (...,divisao) VALUES (...,:divisao)`
- **Linha 141:** `$stmt_verifica->bindParam(':divisao', $divisao, PDO::PARAM_INT);`
- **Linhas 184-185:** `INSERT INTO sind.conta (...,divisao) VALUES (...,:divisao)`
- **Linha 207:** `$stmt->bindParam(':divisao', $divisao, PDO::PARAM_INT);`
- **Linhas 282-283:** `INSERT INTO sind.conta (...,divisao,aprovado) VALUES (...,:divisao,:aprovado)`
- **Linha 305:** `$stmt_taxa_insert->bindParam(':divisao', $divisao, PDO::PARAM_INT);`
- **Linha 331:** UPDATE com divisao

**Correções:** Mesmas do arquivo 1

---

### **4. grava_venda_app_com_taxa.php**
**Impacto:** ❌ CRÍTICO - Script quebra completamente

**Linhas afetadas:**
- **Linhas 111-112:** `INSERT INTO sind.conta (...,divisao) VALUES (...,:divisao)`

**Correções:** Mesmas do arquivo 1

---

### **5. grava_antecipacao_app_fixed_4.php**
**Impacto:** ❌ CRÍTICO - Script de antecipação quebra

**Linhas afetadas:**
- **Linha 268:** `INSERT INTO sind.conta` com coluna `divisao`
- **Linha 289:** Log menciona 'divisao'
- **Linha 301:** Parâmetro `$id_divisao` sendo passado

**Correções necessárias:**
```php
// ANTES
INSERT INTO sind.conta (
    associado,
    convenio,
    valor,
    descricao,
    mes,
    empregador,
    tipo,
    divisao,  // ❌
    id_associado
)

// DEPOIS
INSERT INTO sind.conta (
    associado,
    convenio,
    valor,
    descricao,
    mes,
    empregador,
    tipo,
    id_divisao,  // ✅
    id_associado
)
```

---

### **6. grava_antecipacao_app_fixed_4_CORRIGIDO.php**
**Impacto:** ❌ CRÍTICO

**Linhas afetadas:**
- **Linha 268:** `INSERT INTO sind.conta` com coluna `divisao`
- Comentário na linha 266: "USA divisao (NÃO RENOMEADA)"

**Correções:** Mesmas do arquivo 5

---

### **7. grava_antecipacao_app_fixed_CORRIGIDO.php**
**Impacto:** ❌ CRÍTICO

**Linhas afetadas:**
- **Linha 283:** `INSERT INTO sind.conta` com coluna `divisao`
- Comentário na linha 281: "USA divisao (NÃO RENOMEADA)"

**Correções:** Mesmas do arquivo 5

---

### **8. test_antecipacao_completo.php**
**Impacto:** ⚠️ MÉDIO - Script de teste

**Linhas afetadas:**
- **Linha 154:** `INSERT INTO sind.conta` com coluna `divisao`

**Correções:** Mesmas do arquivo 5

---

### **9. test_conta_debug.php**
**Impacto:** ⚠️ BAIXO - Script de debug

**Linhas afetadas:**
- **Linhas 39-40:** SELECT com divisao
- **Linhas 63-64:** SELECT sem mês

**Correções:** Atualizar WHERE clauses se usarem divisao

---

## 🔧 TRIGGER AFETADA

### **fn_insere_taxa_cartao_automatica()**

**Arquivo:** `TRIGGER_FINAL_CORRIGIDA.sql`

**Linhas afetadas:**
- **Linha 34:** `AND divisao = NEW.divisao`
- **Linha 47:** `WHERE id_divisao = NEW.divisao`

**Status:** ⚠️ **ATENÇÃO ESPECIAL**

A trigger é disparada por INSERT na tabela `conta`, então:
- `NEW.divisao` precisa ser alterado para `NEW.id_divisao`
- A linha 47 já está correta (busca em valor_taxa_cartao com id_divisao)

**Correção necessária:**
```sql
-- ANTES (linha 34)
AND divisao = NEW.divisao

-- DEPOIS
AND id_divisao = NEW.id_divisao

-- A linha 47 permanece igual (já usa id_divisao da tabela valor_taxa_cartao)
WHERE id_divisao = NEW.id_divisao
```

---

## ✅ ARQUIVOS SEM IMPACTO

### **APIs TypeScript/Next.js:**
- Nenhuma API acessa `conta.divisao` diretamente
- APIs apenas passam parâmetros para PHP
- Nenhuma alteração necessária

---

## 📝 CHECKLIST DE ATUALIZAÇÃO

### **ANTES de Renomear no Banco:**

- [ ] Fazer backup completo do banco de dados
- [ ] Testar script SQL em ambiente de desenvolvimento
- [ ] Atualizar TODOS os arquivos PHP listados

### **Atualizar Arquivos PHP (ORDEM RECOMENDADA):**

**1. Arquivos de Venda/Lançamento (CRÍTICO):**
- [ ] `grava_venda_app_com_taxa_FINAL.php`
  - Atualizar 9 ocorrências de `divisao` para `id_divisao`
  - Atualizar todos os `bindParam(':divisao'` para `bindParam(':id_divisao'`
  
- [ ] `grava_venda_app_com_taxa_v2_corrigido.php`
  - Atualizar 9 ocorrências de `divisao` para `id_divisao`
  - Atualizar todos os `bindParam(':divisao'` para `bindParam(':id_divisao'`
  
- [ ] `grava_venda_app_com_taxa_compativel.php`
  - Atualizar 7 ocorrências de `divisao` para `id_divisao`
  - Atualizar todos os `bindParam(':divisao'` para `bindParam(':id_divisao'`
  
- [ ] `grava_venda_app_com_taxa.php`
  - Atualizar INSERT statement

**2. Arquivos de Antecipação (CRÍTICO):**
- [ ] `grava_antecipacao_app_fixed_4.php`
  - Linha 268: `divisao,` → `id_divisao,`
  - Atualizar comentários e logs
  
- [ ] `grava_antecipacao_app_fixed_4_CORRIGIDO.php`
  - Linha 268: `divisao,` → `id_divisao,`
  - Remover comentário "NÃO RENOMEADA"
  
- [ ] `grava_antecipacao_app_fixed_CORRIGIDO.php`
  - Linha 283: `divisao,` → `id_divisao,`
  - Remover comentário "NÃO RENOMEADA"

**3. Trigger (CRÍTICO):**
- [ ] Atualizar `fn_insere_taxa_cartao_automatica()`
  - Linha 34: `divisao = NEW.divisao` → `id_divisao = NEW.id_divisao`
  - Linha 47: Manter `WHERE id_divisao = NEW.id_divisao`

**4. Scripts de Teste/Debug:**
- [ ] `test_antecipacao_completo.php`
- [ ] `test_conta_debug.php`

### **Após Atualizar Arquivos:**

- [ ] Fazer deploy dos arquivos PHP atualizados no servidor
- [ ] Executar script SQL de renomeação no banco
- [ ] Atualizar trigger no banco
- [ ] Testar funcionalidades críticas:
  - [ ] Criar novo lançamento (venda)
  - [ ] Verificar taxa de manutenção automática
  - [ ] Criar nova antecipação
  - [ ] Verificar histórico de lançamentos
- [ ] Monitorar logs de erro do PHP
- [ ] Verificar se há erros 500 nas APIs

---

## 🎯 SCRIPT SQL DE RENOMEAÇÃO

```sql
-- ============================================
-- RENOMEAÇÃO: conta.divisao → id_divisao
-- ============================================

BEGIN;

-- Renomear coluna
ALTER TABLE sind.conta 
RENAME COLUMN divisao TO id_divisao;

-- Verificar sucesso
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'sind' 
  AND table_name = 'conta' 
  AND column_name = 'id_divisao';

-- Se tudo OK, COMMIT
COMMIT;
-- ROLLBACK;
```

---

## ⚠️ RISCOS E MITIGAÇÕES

### **Riscos:**

1. **Downtime durante deploy:** Scripts PHP quebram até atualização
2. **Trigger quebrada:** Taxa de manutenção não será inserida automaticamente
3. **Dados inconsistentes:** Se renomear banco antes de atualizar PHP
4. **Rollback complexo:** Precisa reverter banco + arquivos + trigger

### **Mitigações:**

1. **Deploy em horário de baixo tráfego** (madrugada)
2. **Ordem correta:**
   - ✅ 1º: Atualizar TODOS os arquivos PHP
   - ✅ 2º: Atualizar trigger no banco
   - ✅ 3º: Fazer deploy no servidor
   - ✅ 4º: Renomear coluna no banco
3. **Backup completo antes de iniciar**
4. **Testar em ambiente de desenvolvimento primeiro**
5. **Ter script de rollback pronto**

---

## 📊 RESUMO EXECUTIVO

**Total de arquivos a atualizar:** 9 arquivos (8 PHP + 1 trigger)

**Impacto:**
- ❌ **CRÍTICO:** 7 arquivos (quebra funcionalidade)
- ⚠️ **MÉDIO:** 1 arquivo (script de teste)
- 🔧 **BAIXO:** 1 arquivo (script de debug)
- 🔥 **TRIGGER:** 1 função (taxa automática quebra)

**Tempo estimado:**
- Atualização de código: 2-3 horas
- Atualização de trigger: 30 minutos
- Testes: 1-2 horas
- Deploy: 30 minutos
- **Total:** 4-6 horas

**Recomendação:**
✅ **PROSSEGUIR** com a renomeação, mas seguir rigorosamente a ordem de atualização e fazer backup completo antes.

---

## 🚨 ATENÇÃO ESPECIAL

### **Variável PHP vs Coluna SQL:**

Em todos os arquivos, a **variável PHP** `$divisao` **NÃO precisa ser renomeada**.

Apenas os nomes de **colunas SQL** e **placeholders** precisam mudar:

```php
// ✅ CORRETO:
$divisao = $_POST['divisao'];  // Variável PHP mantém o nome
INSERT INTO sind.conta (..., id_divisao) VALUES (..., :id_divisao)  // Coluna SQL renomeada
$stmt->bindParam(':id_divisao', $divisao, PDO::PARAM_INT);  // Placeholder renomeado, variável mantém nome
```

---

**Próximos passos:**
1. Revisar este documento
2. Fazer backup do banco
3. Atualizar arquivos PHP conforme checklist
4. Atualizar trigger
5. Testar em desenvolvimento
6. Agendar deploy para horário de baixo tráfego
7. Executar renomeação no banco
8. Monitorar logs e funcionalidades
