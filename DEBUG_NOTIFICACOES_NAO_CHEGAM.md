# 🔍 Debug: Notificações Não Chegam no App

## ❌ Problema Relatado

Você implementou a solução de notificação imediata no `agendamento_salvar.php`, mas **a notificação não chegou no app**.

---

## 🎯 Pontos Críticos a Verificar

A cadeia de notificação tem **5 pontos** que podem falhar. Vamos verificar cada um:

---

## 1️⃣ VERIFICAR: agendamento_salvar.php

### **O que verificar:**

**Arquivo no servidor:** `https://sas.makecard.com.br/Adm/pages/agendamento/agendamento_salvar.php`

#### **Checklist:**

- [ ] Código de notificação imediata foi adicionado (linhas 214-244)?
- [ ] Flags de notificação estão sendo resetadas (linhas 184-186)?
- [ ] Status está sendo definido como `2` (Confirmado)?
- [ ] `data_agendada` está sendo preenchida?

#### **Como testar:**

Adicione logs temporários no PHP:

```php
// Após o UPDATE bem-sucedido (linha ~213)
error_log("🔔 DEBUG: data_agendada = " . $_data_agendada);
error_log("🔔 DEBUG: status = " . $_status);
error_log("🔔 DEBUG: Vai disparar notificação? " . (!empty($_data_agendada) && $_status == 2 ? 'SIM' : 'NÃO'));
```

#### **Logs esperados:**

```
🔔 DEBUG: data_agendada = 2025-07-31 15:20:00
🔔 DEBUG: status = 2
🔔 DEBUG: Vai disparar notificação? SIM
🔔 Disparando notificação push imediata para agendamento ID: 123
```

---

## 2️⃣ VERIFICAR: check_agendamentos_notifications_final.php

### **O que verificar:**

**Arquivo no servidor:** `https://sas.makecard.com.br/check_agendamentos_notifications_final.php`

#### **Checklist:**

- [ ] Arquivo existe no servidor?
- [ ] Está retornando HTTP 200?
- [ ] Está buscando agendamentos com `notification_sent_confirmado = false`?
- [ ] Está encontrando o agendamento recém-salvo?

#### **Como testar:**

Acesse diretamente no navegador:

```
https://sas.makecard.com.br/check_agendamentos_notifications_final.php
```

#### **Resposta esperada:**

```json
{
  "success": true,
  "message": "Notificações processadas com sucesso",
  "results": {
    "total_processed": 1,
    "notifications_sent": 1,
    "errors": 0,
    "details": [...]
  }
}
```

#### **Se retornar erro:**

Verifique os logs do PHP no servidor (`error_log`).

---

## 3️⃣ VERIFICAR: manage_push_subscriptions_app.php

### **O que verificar:**

**Arquivo no servidor:** `https://sas.makecard.com.br/manage_push_subscriptions_app.php`

#### **Checklist:**

- [ ] Arquivo existe no servidor?
- [ ] Tabela `push_subscriptions` existe no banco?
- [ ] Usuário tem subscription ativa registrada?

#### **Como testar:**

Execute no banco de dados PostgreSQL:

```sql
-- Verificar se usuário tem subscription ativa
SELECT 
    id,
    user_card,
    endpoint,
    created_at,
    settings
FROM push_subscriptions
WHERE user_card = 'NUMERO_DO_CARTAO_DO_USUARIO'
  AND is_active = true;
```

#### **Resultado esperado:**

Deve retornar **pelo menos 1 registro** com:
- `user_card`: Número do cartão do usuário
- `endpoint`: URL do push service (começa com `https://fcm.googleapis.com/` ou similar)
- `is_active`: `true`

#### **Se não retornar nada:**

**Problema:** Usuário **NÃO ativou notificações no app**.

**Solução:** No app, ir em "Notificações de Agendamentos" e clicar em "Ativar Notificações".

---

## 4️⃣ VERIFICAR: Tabela agendamento

### **O que verificar:**

**Banco de dados:** PostgreSQL

#### **Query de verificação:**

```sql
-- Verificar se flags de notificação foram resetadas
SELECT 
    id,
    cod_associado,
    profissional,
    especialidade,
    data_agendada,
    status,
    notification_sent_confirmado,
    notification_sent_24h,
    notification_sent_1h
FROM sind.agendamento
WHERE id = SEU_ID_AGENDAMENTO;
```

#### **Resultado esperado:**

```
notification_sent_confirmado = false  ✅
notification_sent_24h = false         ✅
notification_sent_1h = false          ✅
data_agendada = '2025-07-31 15:20:00' ✅
status = 2                            ✅
```

#### **Se `notification_sent_confirmado = true`:**

**Problema:** Flag não foi resetada ou notificação já foi enviada antes.

**Solução:** Execute manualmente:

```sql
UPDATE sind.agendamento
SET notification_sent_confirmado = false,
    notification_sent_24h = false,
    notification_sent_1h = false
WHERE id = SEU_ID_AGENDAMENTO;
```

Depois salve o agendamento novamente no sistema admin.

---

## 5️⃣ VERIFICAR: Logs de Notificação

### **O que verificar:**

**Tabela:** `notification_log`

#### **Query de verificação:**

```sql
-- Verificar se notificação foi registrada
SELECT 
    id,
    user_card,
    notification_type,
    agendamento_id,
    sent_at,
    success,
    error_message
FROM notification_log
WHERE agendamento_id = SEU_ID_AGENDAMENTO
ORDER BY sent_at DESC
LIMIT 5;
```

#### **Resultado esperado:**

```
notification_type = 'agendamento_confirmado'
success = true
error_message = NULL
```

#### **Se não retornar nada:**

**Problema:** Notificação **NÃO foi enviada**.

Verifique os passos anteriores (1-4).

#### **Se `success = false`:**

**Problema:** Notificação foi tentada mas **falhou**.

Verifique `error_message` para identificar o erro.

---

## 🔧 Checklist de Debug Completo

Execute na ordem:

### **Passo 1: Verificar Subscription do Usuário**

```sql
SELECT * FROM push_subscriptions 
WHERE user_card = 'NUMERO_CARTAO' 
  AND is_active = true;
```

**Se vazio:** Usuário precisa ativar notificações no app.

---

### **Passo 2: Verificar Agendamento no Banco**

```sql
SELECT 
    id,
    data_agendada,
    status,
    notification_sent_confirmado
FROM sind.agendamento
WHERE id = ID_AGENDAMENTO;
```

**Esperado:**
- `data_agendada`: Preenchida
- `status`: `2` (Confirmado)
- `notification_sent_confirmado`: `false`

---

### **Passo 3: Testar Script de Notificação Manualmente**

Acesse no navegador:

```
https://sas.makecard.com.br/check_agendamentos_notifications_final.php
```

**Esperado:** JSON com `success: true` e `notifications_sent > 0`

---

### **Passo 4: Verificar Logs de Notificação**

```sql
SELECT * FROM notification_log
WHERE agendamento_id = ID_AGENDAMENTO
ORDER BY sent_at DESC;
```

**Esperado:** Registro com `success = true`

---

### **Passo 5: Verificar Logs do Servidor**

No servidor, verifique `error_log` do PHP:

```bash
tail -f /var/log/php_errors.log
# ou
tail -f error_log
```

**Procure por:**
- `🔔 Disparando notificação push imediata`
- `✅ Sistema de notificação chamado com sucesso`
- Erros relacionados a cURL ou HTTP

---

## 🚨 Problemas Comuns e Soluções

### **Problema 1: Usuário não tem subscription ativa**

**Sintoma:** Query em `push_subscriptions` retorna vazio.

**Solução:**
1. No app, vá em "Notificações de Agendamentos"
2. Clique em "Ativar Notificações"
3. Permita no navegador
4. Verifique se subscription foi registrada:

```sql
SELECT * FROM push_subscriptions 
WHERE user_card = 'NUMERO_CARTAO';
```

---

### **Problema 2: Script PHP não está sendo chamado**

**Sintoma:** Logs do PHP não mostram `🔔 Disparando notificação`.

**Solução:**

Verifique se o código foi adicionado corretamente no `agendamento_salvar.php`:

```php
// Após o UPDATE bem-sucedido (linha ~213)
if (!empty($_data_agendada) && $_status == 2) {
    error_log("🔔 Disparando notificação push imediata para agendamento ID: {$id}");
    
    $notificationUrl = 'https://sas.makecard.com.br/check_agendamentos_notifications_final.php';
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $notificationUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $notificationResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    error_log("✅ Sistema de notificação chamado - HTTP {$httpCode}");
}
```

---

### **Problema 3: check_agendamentos_notifications_final.php não existe**

**Sintoma:** cURL retorna HTTP 404.

**Solução:**

Verifique se o arquivo existe no servidor:

```bash
ls -la /var/www/html/check_agendamentos_notifications_final.php
# ou
ls -la /home/usuario/public_html/check_agendamentos_notifications_final.php
```

Se não existir, você precisa criar este arquivo no servidor.

---

### **Problema 4: Flags de notificação não foram resetadas**

**Sintoma:** `notification_sent_confirmado = true` no banco.

**Solução:**

Execute manualmente:

```sql
UPDATE sind.agendamento
SET notification_sent_confirmado = false
WHERE id = ID_AGENDAMENTO;
```

Depois salve o agendamento novamente no admin.

---

### **Problema 5: Service Worker não está registrado**

**Sintoma:** Notificação é enviada mas não aparece no dispositivo.

**Solução:**

No app (console do navegador):

```javascript
// Verificar se Service Worker está ativo
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker:', reg ? 'ATIVO' : 'INATIVO');
});

// Verificar subscription
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub ? 'ATIVA' : 'INATIVA');
  });
});
```

**Esperado:**
- Service Worker: `ATIVO`
- Subscription: `ATIVA`

---

## 📊 Fluxo Completo de Debug

```
1. USUÁRIO ATIVA NOTIFICAÇÕES NO APP
   ↓
   ✅ Subscription registrada em push_subscriptions
   
2. OPERADOR SALVA AGENDAMENTO
   ↓
   ✅ data_agendada definida
   ✅ status = 2 (Confirmado)
   ✅ Flags resetadas (notification_sent_* = false)
   
3. agendamento_salvar.php DISPARA NOTIFICAÇÃO
   ↓
   ✅ cURL chama check_agendamentos_notifications_final.php
   
4. check_agendamentos_notifications_final.php PROCESSA
   ↓
   ✅ Busca agendamentos não notificados
   ✅ Encontra o agendamento recém-salvo
   ✅ Busca subscription do usuário
   ✅ Envia push notification
   
5. NOTIFICAÇÃO CHEGA NO APP
   ↓
   ✅ Service Worker recebe
   ✅ Notificação exibida no dispositivo
```

---

## 🎯 Próximos Passos

Execute os passos de debug na ordem:

1. ✅ Verificar se usuário tem subscription ativa
2. ✅ Verificar se agendamento tem flags corretas
3. ✅ Testar `check_agendamentos_notifications_final.php` manualmente
4. ✅ Verificar logs do servidor PHP
5. ✅ Verificar `notification_log` no banco

**Depois de identificar o ponto de falha, me informe qual foi para eu propor a solução específica!** 🚀
