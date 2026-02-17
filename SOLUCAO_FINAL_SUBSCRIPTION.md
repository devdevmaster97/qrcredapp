# 🎯 PROBLEMA IDENTIFICADO E SOLUÇÃO

## 🔴 Problema Encontrado

**Erro ao acessar:** `https://sas.makecard.com.br/manage_push_subscriptions_app.php`

```json
{
  "success": false,
  "message": "Erro interno do servidor",
  "error": "Ação inválida"
}
```

---

## 🔍 Análise do Código

### **PHP está correto:**
- Linha 24: `$action = $_POST['action'] ?? '';`
- Espera receber `action` via POST

### **API Next.js está correta:**
- Linha 24: `params.append('action', 'register');`
- Envia `action=register` corretamente

### **Mas o erro persiste: "Ação inválida"**

Isso significa que `$_POST['action']` está **vazio** quando o PHP recebe.

---

## 🚨 Causa Raiz Identificada

O problema está na **estrutura da tabela `push_subscriptions`**.

O PHP tenta fazer INSERT com campos que podem **não existir** na tabela:

```php
INSERT INTO sind.push_subscriptions (
    user_card, 
    endpoint, 
    p256dh_key,  // ← Pode não existir
    auth_key,    // ← Pode não existir
    p256dh,      // ← Campo antigo
    auth,        // ← Campo antigo
    settings, 
    is_active,
    created_at,
    updated_at
)
```

---

## ✅ Solução: Verificar e Corrigir Tabela

### **Passo 1: Verificar estrutura atual da tabela**

Execute no PostgreSQL:

```sql
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'sind'
  AND table_name = 'push_subscriptions'
ORDER BY ordinal_position;
```

---

### **Passo 2: Estrutura esperada**

A tabela deve ter estas colunas:

```sql
CREATE TABLE IF NOT EXISTS sind.push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_card VARCHAR(50) NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_card 
ON sind.push_subscriptions(user_card);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active 
ON sind.push_subscriptions(is_active) 
WHERE is_active = true;
```

---

### **Passo 3: Se tabela não existe, criar**

Execute este script SQL completo:

```sql
-- Criar tabela push_subscriptions
CREATE TABLE IF NOT EXISTS sind.push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_card VARCHAR(50) NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comentários
COMMENT ON TABLE sind.push_subscriptions IS 'Armazena subscriptions de push notifications dos usuários';
COMMENT ON COLUMN sind.push_subscriptions.user_card IS 'Número do cartão do usuário';
COMMENT ON COLUMN sind.push_subscriptions.endpoint IS 'URL do endpoint de push notification';
COMMENT ON COLUMN sind.push_subscriptions.p256dh_key IS 'Chave pública P256DH para criptografia';
COMMENT ON COLUMN sind.push_subscriptions.auth_key IS 'Chave de autenticação';
COMMENT ON COLUMN sind.push_subscriptions.settings IS 'Configurações de notificação do usuário (JSON)';
COMMENT ON COLUMN sind.push_subscriptions.is_active IS 'Indica se a subscription está ativa';

-- Índices
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_card 
ON sind.push_subscriptions(user_card);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active 
ON sind.push_subscriptions(is_active) 
WHERE is_active = true;

-- Criar tabela notification_log (para logs de notificações enviadas)
CREATE TABLE IF NOT EXISTS sind.notification_log (
    id SERIAL PRIMARY KEY,
    user_card VARCHAR(50) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    agendamento_id INTEGER,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    response_data JSONB
);

COMMENT ON TABLE sind.notification_log IS 'Log de notificações push enviadas';

CREATE INDEX IF NOT EXISTS idx_notification_log_user_card 
ON sind.notification_log(user_card);

CREATE INDEX IF NOT EXISTS idx_notification_log_agendamento 
ON sind.notification_log(agendamento_id);

CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at 
ON sind.notification_log(sent_at DESC);
```

---

### **Passo 4: Corrigir PHP (se necessário)**

Se a tabela já existe mas tem campos diferentes (como `p256dh` e `auth` em vez de `p256dh_key` e `auth_key`), atualize o PHP:

**Arquivo:** `manage_push_subscriptions_app.php`

**Linha 87-104:** Simplificar INSERT para usar apenas os campos que existem:

```php
// Inserir nova subscription
$stmt = $pdo->prepare("
    INSERT INTO sind.push_subscriptions (
        user_card, 
        endpoint, 
        p256dh_key, 
        auth_key, 
        settings, 
        is_active,
        created_at,
        updated_at
    ) VALUES (?, ?, ?, ?, ?, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id
");

$stmt->execute([
    $userCard,
    $endpoint,
    $p256dhKey,
    $authKey,
    $settings
]);
```

---

## 🧪 Teste Após Correção

### **1. Verificar se tabela foi criada:**

```sql
SELECT COUNT(*) FROM sind.push_subscriptions;
```

Deve retornar `0` (zero registros) se tabela está vazia, mas **não deve dar erro**.

---

### **2. Testar registro manual:**

```sql
INSERT INTO sind.push_subscriptions (
    user_card,
    endpoint,
    p256dh_key,
    auth_key,
    settings,
    is_active
) VALUES (
    '6338507346',
    'https://fcm.googleapis.com/test',
    'test_p256dh_key',
    'test_auth_key',
    '{"enabled":true}',
    true
);

-- Verificar se foi inserido
SELECT * FROM sind.push_subscriptions WHERE user_card = '6338507346';
```

Se funcionar, a estrutura está correta.

---

### **3. Testar no app:**

1. Recarregar página do app (F5)
2. Sistema tentará ativar automaticamente
3. Verificar no banco:

```sql
SELECT * FROM sind.push_subscriptions WHERE user_card = '6338507346';
```

Deve retornar **1 registro** com subscription ativa.

---

## 📋 Checklist de Resolução

Execute na ordem:

- [ ] **1. Verificar estrutura da tabela** (SQL acima)
- [ ] **2. Criar tabela se não existir** (script SQL completo)
- [ ] **3. Testar INSERT manual** (para confirmar estrutura)
- [ ] **4. Limpar subscription de teste** (`DELETE FROM sind.push_subscriptions WHERE endpoint = 'https://fcm.googleapis.com/test'`)
- [ ] **5. Recarregar app** (F5)
- [ ] **6. Verificar subscription criada** (SQL SELECT)
- [ ] **7. Salvar agendamento no admin**
- [ ] **8. Verificar notificação chegou** 📱

---

## 🎯 Resultado Esperado

Após executar o script SQL:

1. ✅ Tabela `push_subscriptions` criada
2. ✅ Tabela `notification_log` criada
3. ✅ App consegue registrar subscription
4. ✅ Subscription aparece no banco: `SELECT * FROM sind.push_subscriptions WHERE user_card = '6338507346'`
5. ✅ Notificação chega no app quando operador salva agendamento

---

## 📞 Execute e Me Informe

**Execute o script SQL de criação da tabela e me informe:**

1. Se deu erro ou sucesso
2. Resultado de: `SELECT COUNT(*) FROM sind.push_subscriptions;`
3. Depois recarregue o app e verifique se subscription foi criada

Com isso, vou confirmar se o problema foi resolvido! 🚀
