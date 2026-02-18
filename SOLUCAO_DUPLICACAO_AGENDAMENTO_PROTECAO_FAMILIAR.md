# Solução: Duplicação de Agendamentos em Proteção Familiar

## 🔴 Problema Identificado

Ao registrar um novo agendamento em **Proteção Familiar → Agendamento**, o sistema estava gravando o mesmo agendamento **2 vezes**, criando registros duplicados no banco de dados.

---

## 🔍 Análise da Causa Raiz

### **Frontend: Proteção Existente** ✅
O componente `ConveniosContent.tsx` já possui **proteção tripla** contra duplicação:

1. **Verificação de processamento ativo** (linha 225-229)
2. **Verificação de requisição recente** (< 3 segundos) (linha 232-237)
3. **Proteção no modal** contra duplo clique (linha 158-161)

**Conclusão:** O frontend está correto e bem protegido.

### **Backend PHP: SEM Proteção** ❌
O arquivo `grava_agendamento_app.php` no servidor **NÃO possui proteção contra duplicação**.

**Cenários que causam duplicação:**
1. Duas requisições simultâneas chegam ao PHP antes da primeira terminar
2. Race condition no banco de dados
3. Usuário clica rapidamente antes do frontend bloquear
4. Problemas de rede causam retry automático

---

## 🔧 Solução Implementada

### **Arquivo Corrigido: `grava_agendamento_app_fixed.php`**

**Correções Aplicadas:**
1. ✅ Proteção tripla contra duplicação
2. ✅ Mapeamento correto de `data_pretendida` (campo do usuário) vs `data_agendada` (campo da central)

**Proteção Tripla no Backend:**

#### **1. Verificação de Duplicação Recente (5 minutos)**
```sql
SELECT id FROM sind.agendamento 
WHERE cod_associado = ? 
  AND id_empregador = ?
  AND profissional = ?
  AND especialidade = ?
  AND convenio_nome = ?
  AND data_solicitacao >= NOW() - INTERVAL '5 minutes'
  AND status IN ('1', '2')
```

Se encontrar: retorna o ID existente e bloqueia inserção.

#### **2. Verificação de Agendamento Ativo**
```sql
SELECT id FROM sind.agendamento 
WHERE cod_associado = ? 
  AND id_empregador = ?
  AND profissional = ?
  AND especialidade = ?
  AND status IN ('1', '2')
```

Se encontrar: retorna mensagem "Você já possui um agendamento ativo para este profissional".

#### **3. Transação Atômica**
```php
$pdo->beginTransaction();
try {
    // Verificações + INSERT
    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    throw $e;
}
```

Garante que verificação + inserção sejam atômicas (sem race condition).

---

## 📋 Instruções de Deploy

### **Passo 1: Fazer Backup do Arquivo Atual**
```bash
# No servidor de produção
cd /home/makecard/public_html/sas/
cp grava_agendamento_app.php grava_agendamento_app.php.backup
```

### **Passo 2: Substituir o Arquivo**
1. Fazer upload do arquivo `grava_agendamento_app_fixed.php` para o servidor
2. Renomear para `grava_agendamento_app.php`

**OU via linha de comando:**
```bash
# Upload via FTP/SFTP do arquivo local para o servidor
# Depois renomear:
mv grava_agendamento_app_fixed.php grava_agendamento_app.php
```

### **Passo 3: Verificar Permissões**
```bash
chmod 644 grava_agendamento_app.php
chown makecard:makecard grava_agendamento_app.php
```

---

## 🧪 Como Testar

### **Teste 1: Agendamento Único**
1. Ir em **Proteção Familiar → Agendamento**
2. Selecionar um profissional
3. Informar data e hora
4. Clicar em **Confirmar**
5. Verificar no banco:
```sql
SELECT id, cod_associado, profissional, especialidade, data_solicitacao
FROM sind.agendamento
WHERE cod_associado = 'SEU_COD_ASSOCIADO'
ORDER BY data_solicitacao DESC
LIMIT 5;
```
**Resultado esperado:** Apenas 1 registro criado.

### **Teste 2: Proteção Contra Duplicação**
1. Criar um agendamento
2. Tentar criar o mesmo agendamento novamente (mesmo profissional/especialidade)
3. Verificar mensagem: "Você já possui um agendamento ativo para este profissional"
4. Verificar no banco: apenas 1 registro

### **Teste 3: Clique Rápido (Duplo Clique)**
1. Selecionar profissional
2. Informar data/hora
3. Clicar **DUAS VEZES RAPIDAMENTE** no botão Confirmar
4. Verificar no banco: apenas 1 registro

---

## 📊 Logs de Debug

O script PHP gera logs detalhados em `/var/log/php-errors.log`:

```
=== INÍCIO GRAVA_AGENDAMENTO_APP.PHP ===
Dados recebidos:
  cod_associado: 123456
  profissional: Dr. João Silva
  especialidade: Cardiologia
⚠️ DUPLICAÇÃO BLOQUEADA - Agendamento recente encontrado: ID 789
=== FIM GRAVA_AGENDAMENTO_APP.PHP ===
```

**Verificar logs:**
```bash
tail -f /var/log/php-errors.log | grep "GRAVA_AGENDAMENTO"
```

---

## 🎯 Benefícios da Solução

✅ **Proteção Tripla:** 3 camadas de verificação  
✅ **Transação Atômica:** Sem race conditions  
✅ **Logs Detalhados:** Fácil debug  
✅ **Mensagens Claras:** Usuário entende o que aconteceu  
✅ **Compatível:** Funciona com proteção do frontend  
✅ **Performance:** Verificações rápidas com índices  

---

## 🔍 Verificação de Duplicatas Existentes

Para limpar duplicatas já criadas:

```sql
-- Identificar duplicatas
SELECT 
    cod_associado,
    profissional,
    especialidade,
    convenio_nome,
    COUNT(*) as total,
    ARRAY_AGG(id ORDER BY data_solicitacao) as ids
FROM sind.agendamento
WHERE status IN ('1', '2')
GROUP BY cod_associado, profissional, especialidade, convenio_nome
HAVING COUNT(*) > 1;

-- Manter apenas o mais recente e cancelar os outros
-- CUIDADO: Execute apenas após confirmar os IDs
UPDATE sind.agendamento
SET status = '3' -- 3 = Cancelado
WHERE id IN (
    -- IDs das duplicatas mais antigas
    SELECT id 
    FROM (
        SELECT id, 
               ROW_NUMBER() OVER (
                   PARTITION BY cod_associado, profissional, especialidade, convenio_nome 
                   ORDER BY data_solicitacao DESC
               ) as rn
        FROM sind.agendamento
        WHERE status IN ('1', '2')
    ) sub
    WHERE rn > 1
);
```

---

## 📝 Resumo da Correção

| Item | Antes | Depois |
|------|-------|--------|
| Proteção Backend | ❌ Nenhuma | ✅ Tripla |
| Transação | ❌ Não | ✅ Sim |
| Logs | ⚠️ Básicos | ✅ Detalhados |
| Duplicação | 🔴 Ocorre | ✅ Bloqueada |

---

## 🚀 Status

- [x] Problema identificado
- [x] Solução implementada
- [x] Arquivo corrigido criado
- [ ] Deploy para produção
- [ ] Testes em produção
- [ ] Limpeza de duplicatas existentes

---

**Arquivo criado:** `c:/sasapp/grava_agendamento_app_fixed.php`  
**Próximo passo:** Fazer upload para `https://sas.makecard.com.br/grava_agendamento_app.php`
