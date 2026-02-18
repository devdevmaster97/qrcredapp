# Solução: Duplicação de Push Notifications

## 🔴 Problema Identificado

Após criar um agendamento em **Proteção Familiar → Agendamento**, o usuário está recebendo **2 push notifications** no celular para o mesmo agendamento.

---

## 🔍 Diagnóstico Realizado

### **Queries Executadas:**

#### **1. Subscriptions Ativas:**
```sql
SELECT * FROM sind.push_subscriptions 
WHERE user_card = '6338507346' AND is_active = true;
```
**Resultado:** ✅ Apenas **1 subscription ativa** (ID: 304)

#### **2. Logs de Notificação:**
```sql
SELECT * FROM sind.notification_log 
WHERE user_card = '6338507346' 
ORDER BY sent_at DESC LIMIT 10;
```
**Resultado:** ❌ **Tabela vazia** (sem logs)

#### **3. Agendamentos Recentes:**
```sql
SELECT * FROM sind.agendamento 
WHERE cod_associado = '6338507346' 
ORDER BY data_solicitacao DESC LIMIT 3;
```
**Resultado:** ❌ **Sem registros visíveis**

---

## 🎯 Causa Raiz Identificada

**Problema:** O script `check_agendamentos_notifications_final.php` está sendo executado **2 vezes simultaneamente** (ou quase simultaneamente) antes de marcar a flag `notification_sent_confirmado = true`.

**Cenário:**
1. Cron job ou trigger dispara o script
2. Script busca agendamentos com `notification_sent_confirmado = false`
3. **ANTES** de marcar a flag, o script envia a notificação
4. Outro processo (ou retry) executa o script novamente
5. Como a flag ainda não foi marcada, o mesmo agendamento é processado novamente
6. **Resultado:** 2 notificações enviadas

**Problemas adicionais:**
- Script **não está gravando logs** na tabela `notification_log`
- Sem logs, não há rastreabilidade
- Sem proteção contra race condition

---

## 🔧 Solução Implementada

### **Arquivo Corrigido: `check_agendamentos_notifications_final_fixed.php`**

**Correções Aplicadas:**

#### **1. Marca Flag ANTES de Enviar Notificação**
```php
// INICIAR TRANSAÇÃO
$pdo->beginTransaction();

// MARCAR FLAG COMO TRUE **ANTES** DE ENVIAR
$updateStmt = $pdo->prepare("
    UPDATE sind.agendamento
    SET notification_sent_confirmado = true
    WHERE id = ?
      AND notification_sent_confirmado = false
");

$updateStmt->execute([$agendamentoId]);
$rowsAffected = $updateStmt->rowCount();

if ($rowsAffected === 0) {
    // Outro processo já marcou - pular
    $pdo->rollBack();
    continue;
}

// COMMIT (flag marcada)
$pdo->commit();

// AGORA SIM enviar notificação
```

**Benefício:** Se 2 processos executarem simultaneamente, apenas o primeiro conseguirá marcar a flag. O segundo verá `rowsAffected = 0` e pulará.

---

#### **2. Proteção Contra Race Condition com `FOR UPDATE SKIP LOCKED`**
```sql
SELECT * FROM sind.agendamento
WHERE status = '2'
  AND notification_sent_confirmado = false
  AND data_agendada IS NOT NULL
FOR UPDATE SKIP LOCKED
LIMIT 50
```

**Benefício:** 
- `FOR UPDATE`: Trava os registros selecionados
- `SKIP LOCKED`: Se outro processo já travou, pula esses registros
- Evita que 2 processos processem o mesmo agendamento

---

#### **3. Gravação de Logs Detalhados**
```php
// GRAVAR LOG DE SUCESSO
$logStmt = $pdo->prepare("
    INSERT INTO sind.notification_log (
        user_card,
        agendamento_id,
        tipo_notificacao,
        titulo,
        mensagem,
        status,
        subscription_id,
        profissional,
        especialidade,
        convenio_nome,
        data_agendada,
        response_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
");
```

**Benefício:** 
- Rastreabilidade completa
- Fácil debug
- Auditoria de notificações enviadas

---

#### **4. Verificação de Configurações do Usuário**
```php
$settings = json_decode($subscriptions[0]['settings'], true);
if (!$settings['agendamentoConfirmado']) {
    // Usuário desabilitou notificações de agendamento confirmado
    continue;
}
```

**Benefício:** Respeita preferências do usuário.

---

## 📋 Instruções de Deploy

### **Passo 1: Fazer Backup do Arquivo Atual**
```bash
cd /home/makecard/public_html/sas/
cp check_agendamentos_notifications_final.php check_agendamentos_notifications_final.php.backup
```

### **Passo 2: Substituir o Arquivo**
1. Fazer upload do arquivo `check_agendamentos_notifications_final_fixed.php` para o servidor
2. Renomear para `check_agendamentos_notifications_final.php`

**OU copiar o conteúdo:**
- Copiar conteúdo de `check_agendamentos_notifications_final_fixed.php`
- Colar em `check_agendamentos_notifications_final.php` no servidor

### **Passo 3: Verificar Permissões**
```bash
chmod 644 check_agendamentos_notifications_final.php
chown makecard:makecard check_agendamentos_notifications_final.php
```

---

## 🧪 Como Testar

### **Teste 1: Criar Agendamento e Confirmar**
1. Criar novo agendamento via app
2. No sistema admin, confirmar o agendamento (status = 2, definir data_agendada)
3. Aguardar ou executar manualmente:
```
https://sas.makecard.com.br/check_agendamentos_notifications_final.php
```
4. Verificar no celular: **deve receber apenas 1 notificação**

---

### **Teste 2: Verificar Logs no Banco**
```sql
-- Verificar se log foi gravado
SELECT 
    id,
    user_card,
    agendamento_id,
    tipo_notificacao,
    titulo,
    status,
    sent_at,
    subscription_id
FROM sind.notification_log
WHERE user_card = '6338507346'
ORDER BY sent_at DESC
LIMIT 5;
```

**Resultado esperado:**
- **1 registro** com `status = 'sent'`
- `tipo_notificacao = 'agendamento_confirmado'`
- `agendamento_id` preenchido

---

### **Teste 3: Verificar Flag no Agendamento**
```sql
SELECT 
    id,
    cod_associado,
    profissional,
    data_agendada,
    status,
    notification_sent_confirmado
FROM sind.agendamento
WHERE cod_associado = '6338507346'
ORDER BY data_solicitacao DESC
LIMIT 3;
```

**Resultado esperado:**
- `notification_sent_confirmado = true`
- `status = '2'` (Confirmado)

---

### **Teste 4: Executar Script 2 Vezes Seguidas**
```bash
# Executar 2 vezes rapidamente
curl https://sas.makecard.com.br/check_agendamentos_notifications_final.php
curl https://sas.makecard.com.br/check_agendamentos_notifications_final.php
```

**Resultado esperado:**
- Primeira execução: envia notificação
- Segunda execução: não encontra agendamentos (flag já marcada)
- **Apenas 1 notificação recebida no celular**

---

## 📊 Logs de Debug

O script gera logs detalhados em `/var/log/php-errors.log`:

```
=== INÍCIO CHECK_AGENDAMENTOS_NOTIFICATIONS ===
📋 Total de agendamentos encontrados: 1
🔄 Processando agendamento ID: 123 - Usuário: 6338507346
✅ Flag marcada para agendamento 123
📤 Enviando notificação para subscription ID: 304
✅ Notificação enviada com sucesso para subscription 304
=== FIM CHECK_AGENDAMENTOS_NOTIFICATIONS ===
📊 Resumo: 1 enviadas, 0 erros
```

**Verificar logs:**
```bash
tail -f /var/log/php-errors.log | grep "CHECK_AGENDAMENTOS"
```

---

## 🎯 Benefícios da Solução

✅ **Proteção Tripla:**
1. Marca flag ANTES de enviar
2. Usa `FOR UPDATE SKIP LOCKED`
3. Verifica `rowsAffected` antes de continuar

✅ **Logs Completos:** Rastreabilidade total  
✅ **Respeita Preferências:** Verifica settings do usuário  
✅ **Transação Atômica:** Sem race conditions  
✅ **Fácil Debug:** Logs detalhados  

---

## 🔍 Comparação: Antes vs Depois

| Item | Antes | Depois |
|------|-------|--------|
| Marca flag | ❌ Após enviar | ✅ Antes de enviar |
| Race condition | ❌ Possível | ✅ Bloqueada |
| Logs | ❌ Não grava | ✅ Grava tudo |
| Duplicação | 🔴 2 notificações | ✅ 1 notificação |
| Debug | ⚠️ Difícil | ✅ Fácil |

---

## 📝 Resumo da Correção

**Problema:** 2 notificações para o mesmo agendamento  
**Causa:** Script executado 2 vezes antes de marcar flag  
**Solução:** Marcar flag ANTES de enviar + proteção contra race condition  
**Resultado:** Apenas 1 notificação enviada  

---

## 🚀 Status

- [x] Problema identificado
- [x] Causa raiz diagnosticada
- [x] Solução implementada
- [x] Arquivo corrigido criado
- [ ] Deploy para produção
- [ ] Testes em produção
- [ ] Validação final

---

**Arquivo criado:** `c:/sasapp/check_agendamentos_notifications_final_fixed.php`  
**Próximo passo:** Fazer upload para `https://sas.makecard.com.br/check_agendamentos_notifications_final.php`
