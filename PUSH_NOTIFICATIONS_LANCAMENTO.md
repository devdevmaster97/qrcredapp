# 🔔 Sistema de Push Notifications para Lançamentos em Tempo Real

## 📋 Visão Geral

Sistema completo de notificações push que detecta **instantaneamente** quando um novo lançamento é inserido na tabela `sind.conta` e envia notificação **apenas para o usuário específico** daquele lançamento, em todos os seus dispositivos cadastrados.

### ✅ Características

- ⚡ **Tempo Real** - Notificação instantânea (sem delay de cron job)
- 🎯 **Específico** - Apenas o usuário do lançamento recebe a notificação
- 📱 **Multi-dispositivo** - Envia para todos os dispositivos do usuário
- 🔒 **Seguro** - Usa PostgreSQL Triggers + NOTIFY/LISTEN
- 📊 **Rastreável** - Logs detalhados de todas as notificações

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│  INSERT na tabela sind.conta                            │
│  (Novo lançamento para usuário X)                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  PostgreSQL Trigger (sind.notify_new_lancamento)        │
│  - Busca cartão do associado                            │
│  - Prepara payload JSON                                 │
│  - PERFORM pg_notify('new_lancamento', payload)         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Listener Node.js (push-notification-listener.js)       │
│  - Escuta canal 'new_lancamento'                        │
│  - Recebe payload em tempo real                         │
│  - Chama API Next.js                                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  API Next.js (/api/notify-lancamento)                   │
│  - Busca subscriptions do usuário X                     │
│  - Envia push notification via web-push                 │
│  - Registra log                                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Dispositivos do Usuário X                              │
│  - Celular Android                                      │
│  - Celular iOS                                          │
│  - Desktop Windows                                      │
│  - Tablet                                               │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Arquivos Criados

### 1. **Trigger PostgreSQL**
- **Arquivo:** `create_trigger_notify_lancamento.sql`
- **Função:** Detecta INSERT na tabela `sind.conta` e envia NOTIFY

### 2. **Listener Node.js**
- **Arquivo:** `scripts/push-notification-listener.js`
- **Função:** Escuta notificações do PostgreSQL e chama API

### 3. **API Next.js**
- **Arquivo:** `app/api/notify-lancamento/route.ts`
- **Função:** Envia push notifications para dispositivos do usuário

### 4. **Configuração**
- **Arquivo:** `package.json` (atualizado)
- **Adicionado:** Script `push-listener` e dependências `pg` e `@types/web-push`

---

## 🚀 Instalação e Configuração

### **Passo 1: Instalar Dependências**

```bash
npm install
```

Isso instalará:
- `pg@^8.11.3` - Cliente PostgreSQL
- `@types/web-push@^3.6.3` - Tipos TypeScript para web-push

### **Passo 2: Configurar Variáveis de Ambiente**

Crie ou atualize o arquivo `.env.local`:

```env
# PostgreSQL
DB_HOST=seu-host-postgres.com
DB_PORT=5432
DB_NAME=seu_banco
DB_USER=postgres
DB_PASSWORD=sua_senha_segura

# VAPID (Push Notifications)
VAPID_PRIVATE_KEY=sua-chave-privada-vapid

# URL do App
NEXT_PUBLIC_URL=https://seu-app.vercel.app
```

### **Passo 3: Executar Script SQL no PostgreSQL**

Execute o arquivo `create_trigger_notify_lancamento.sql` no seu banco PostgreSQL:

```bash
psql -h seu-host -U postgres -d seu_banco -f create_trigger_notify_lancamento.sql
```

Ou execute manualmente via pgAdmin/DBeaver.

### **Passo 4: Iniciar o Listener**

Em um terminal separado, execute:

```bash
npm run push-listener
```

Você verá:

```
╔═══════════════════════════════════════════════════╗
║   🔔 LISTENER DE PUSH NOTIFICATIONS EM TEMPO REAL ║
╚═══════════════════════════════════════════════════╝

✅ Conectado ao PostgreSQL
📡 Banco: seu_banco@seu-host:5432
👂 Aguardando notificações de novos lançamentos...

🔔 Canal "new_lancamento" ativo
```

### **Passo 5: Iniciar o App Next.js**

Em outro terminal:

```bash
npm run dev
```

---

## 🧪 Teste do Sistema

### **Teste 1: Inserir Lançamento Manualmente**

Execute no PostgreSQL:

```sql
INSERT INTO sind.conta (associado, valor, descricao, convenio, mes, data, hora)
VALUES (123, 150.00, 'Teste Push Notification', 221, '2025-01', CURRENT_DATE, CURRENT_TIME);
```

### **Resultado Esperado:**

**No terminal do listener:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔔 NOVA NOTIFICAÇÃO RECEBIDA!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ Timestamp: 01/10/2025 09:55:30
📢 Canal: new_lancamento

📦 Dados do Lançamento:
   👤 Cartão: 123456
   📝 Associado: João Silva (123)
   💰 Valor: R$ 150.00
   📄 Descrição: Teste Push Notification
   🏢 Convênio: 221
   📅 Data: 01/10/2025 09:55
   🆔 ID Lançamento: 12345

📤 Enviando para API de Push Notifications...
✅ Push Notification enviado com sucesso!
   📊 Resultado: Notificação enviada para 2 dispositivo(s)
   📱 Dispositivos notificados: 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Nos dispositivos do usuário:**

Notificação push aparece:
```
💳 Novo Lançamento na Conta
Teste Push Notification: R$ 150,00
```

---

## 🔧 Manutenção em Produção

### **Opção 1: PM2 (Recomendado)**

Instalar PM2 globalmente:

```bash
npm install -g pm2
```

Iniciar listener:

```bash
pm2 start scripts/push-notification-listener.js --name push-listener
```

Configurar para iniciar no boot:

```bash
pm2 startup
pm2 save
```

Comandos úteis:

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs push-listener

# Reiniciar
pm2 restart push-listener

# Parar
pm2 stop push-listener

# Remover
pm2 delete push-listener
```

### **Opção 2: Systemd (Linux)**

Criar arquivo `/etc/systemd/system/push-listener.service`:

```ini
[Unit]
Description=Push Notification Listener
After=network.target postgresql.service

[Service]
Type=simple
User=seu-usuario
WorkingDirectory=/caminho/para/sasapp
ExecStart=/usr/bin/node scripts/push-notification-listener.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=DB_HOST=seu-host
Environment=DB_PORT=5432
Environment=DB_NAME=seu_banco
Environment=DB_USER=postgres
Environment=DB_PASSWORD=sua_senha

[Install]
WantedBy=multi-user.target
```

Ativar:

```bash
sudo systemctl enable push-listener
sudo systemctl start push-listener
sudo systemctl status push-listener
```

---

## 📊 Monitoramento

### **Logs do Listener**

```bash
# PM2
pm2 logs push-listener --lines 100

# Systemd
sudo journalctl -u push-listener -f
```

### **Verificar Trigger no PostgreSQL**

```sql
-- Ver se trigger está ativo
SELECT 
  tgname AS trigger_name,
  tgenabled AS enabled
FROM pg_trigger 
WHERE tgname = 'trigger_notify_new_lancamento';

-- Ver últimas notificações (se tiver tabela de log)
SELECT * FROM sind.push_notification_log 
ORDER BY sent_at DESC 
LIMIT 10;
```

### **Testar Conexão LISTEN**

Em uma sessão PostgreSQL:

```sql
LISTEN new_lancamento;
```

Em outra sessão, insira um lançamento. Você deve ver a notificação.

---

## 🐛 Troubleshooting

### **Problema: Listener não conecta ao banco**

**Solução:**
1. Verificar credenciais no `.env.local`
2. Verificar se PostgreSQL está acessível
3. Verificar firewall/portas

```bash
# Testar conexão
psql -h seu-host -U postgres -d seu_banco
```

### **Problema: Notificações não chegam nos dispositivos**

**Solução:**
1. Verificar se usuário tem subscriptions ativas
2. Verificar VAPID_PRIVATE_KEY configurada
3. Ver logs da API `/api/notify-lancamento`

```sql
-- Ver subscriptions do usuário
SELECT * FROM sind.push_subscriptions 
WHERE user_card = '123456' 
AND is_active = true;
```

### **Problema: Listener para de funcionar**

**Solução:**
1. Usar PM2 para restart automático
2. Verificar logs de erro
3. Verificar conexão com banco

---

## 🎯 Regra de Negócio Garantida

✅ **Apenas o usuário específico do lançamento recebe a notificação**

O sistema garante isso através de:

1. **Trigger SQL** - Busca o cartão do associado específico do lançamento
2. **API** - Busca subscriptions apenas daquele cartão
3. **Push** - Envia apenas para os dispositivos daquele usuário

**Outros usuários NÃO recebem a notificação.**

---

## 📝 Próximos Passos (Opcional)

- [ ] Implementar remoção automática de subscriptions expiradas (410)
- [ ] Adicionar dashboard de monitoramento de notificações
- [ ] Implementar retry automático em caso de falha
- [ ] Adicionar métricas (quantas notificações enviadas por dia)
- [ ] Implementar notificações por email como fallback

---

## ✅ Checklist de Implementação

- [x] Criar trigger PostgreSQL
- [x] Criar listener Node.js
- [x] Criar API Next.js
- [x] Atualizar package.json
- [x] Documentar sistema
- [ ] Executar SQL no banco de produção
- [ ] Configurar variáveis de ambiente
- [ ] Instalar dependências (`npm install`)
- [ ] Iniciar listener em produção (PM2)
- [ ] Testar com lançamento real

---

**Sistema pronto para uso! 🎉**
