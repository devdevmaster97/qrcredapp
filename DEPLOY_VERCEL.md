# 🚀 Deploy na Vercel - Configuração Completa

## 📋 Checklist de Deploy

### ✅ 1. Configurar Variáveis de Ambiente na Vercel

Acesse: **Settings** → **Environment Variables**

Adicione as seguintes variáveis:

```
DB_HOST=seu_host_postgres
DB_PORT=5432
DB_NAME=seu_banco
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
```

**Importante**: Marque para todos os ambientes (Production, Preview, Development)

---

### ✅ 2. Instalar Dependência `pg`

Certifique-se que o `package.json` tem a dependência:

```json
{
  "dependencies": {
    "pg": "^8.11.0"
  }
}
```

Se não tiver, instale:
```bash
npm install pg
```

---

### ✅ 3. Configuração do PostgreSQL

#### 🔴 **Problema Comum na Vercel**
- Vercel usa **serverless functions** (sem estado)
- Conexões PostgreSQL tradicionais podem ter timeout
- Limite de conexões simultâneas

#### ✅ **Soluções Recomendadas**

##### **Opção 1: Usar Supabase (Recomendado)**
```env
# No painel da Vercel
DB_HOST=db.xxxxxxxxxxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=sua_senha_supabase
```

##### **Opção 2: Usar Neon (Serverless PostgreSQL)**
```env
DB_HOST=ep-xxxxx.us-east-2.aws.neon.tech
DB_PORT=5432
DB_NAME=neondb
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
```

##### **Opção 3: PostgreSQL com PgBouncer**
Configure um connection pooler entre Vercel e seu PostgreSQL.

---

### ✅ 4. Arquivos Modificados para Vercel

#### **API Next.js** (`/app/api/sascred/iniciar-adesao/route.ts`)
✅ Já configurado com:
- `max: 1` - Uma conexão por função
- `idleTimeoutMillis: 0` - Não mantém conexões idle
- `connectionTimeoutMillis: 10000` - Timeout de 10s

#### **Frontend** (`/app/dashboard/adesao-sasapp/page.tsx`)
✅ Já configurado para chamar a API

---

### ✅ 5. Webhook PHP (Servidor Separado)

O webhook **NÃO roda na Vercel**. Ele deve estar em um servidor PHP separado:

```
Vercel (Next.js)  →  PostgreSQL  ←  Servidor PHP (Webhook)
```

**Passos**:
1. Upload do `webhook_zapsign_sascred_ATUALIZADO.php` para servidor PHP
2. Configurar URL do webhook no ZapSign
3. Webhook usa `Banco::conectar_postgres()` do PHP

---

## 🔄 Fluxo Completo

```
1. Usuário acessa app na Vercel
   ↓
2. Clica "Aderir SasCred"
   ↓
3. Frontend chama /api/sascred/iniciar-adesao (Vercel)
   ↓
4. API conecta no PostgreSQL (usando variáveis da Vercel)
   ↓
5. Salva em sind.adesoes_pendentes
   ↓
6. Usuário redireciona para ZapSign
   ↓
7. Assina documento
   ↓
8. ZapSign chama webhook PHP (servidor separado)
   ↓
9. Webhook busca em sind.adesoes_pendentes
   ↓
10. Grava em sind.associados_sasmais com divisão correta ✅
```

---

## 🚀 Passos para Deploy

### 1. **Commit e Push**
```bash
git add .
git commit -m "feat: adicionar solução de divisão correta SasCred"
git push origin main
```

### 2. **Configurar Variáveis na Vercel**
- Acesse projeto na Vercel
- Settings → Environment Variables
- Adicione todas as variáveis do banco

### 3. **Redeploy**
- Deployments → Redeploy
- Ou push automático se conectado ao Git

### 4. **Upload Webhook PHP**
```bash
scp webhook_zapsign_sascred_ATUALIZADO.php usuario@servidor:/caminho/webhook/
```

### 5. **Executar SQL no Banco**
```bash
psql -U seu_usuario -d seu_banco -f sql/create_adesoes_pendentes.sql
```

---

## 🧪 Testar

### 1. **Testar API Next.js**
```bash
curl -X POST https://seu-app.vercel.app/api/sascred/iniciar-adesao \
  -H "Content-Type: application/json" \
  -d '{
    "codigo": "023999",
    "cpf": "12345678900",
    "email": "teste@email.com",
    "id_associado": 182,
    "id_divisao": 1,
    "nome": "Teste"
  }'
```

### 2. **Verificar Logs na Vercel**
- Acesse: Deployments → Function Logs
- Procure por: "✅ Adesão pendente registrada"

### 3. **Testar Fluxo Completo**
1. Login no app
2. Aderir SasCred
3. Assinar documento
4. Verificar menu liberado

---

## 🔍 Troubleshooting

### ❌ Erro: "Connection timeout"
**Solução**: Use Supabase ou Neon (serverless PostgreSQL)

### ❌ Erro: "Too many connections"
**Solução**: Configure `max: 1` no pool (já configurado)

### ❌ Erro: "Cannot find module 'pg'"
**Solução**: 
```bash
npm install pg
git add package.json package-lock.json
git commit -m "add pg dependency"
git push
```

### ❌ Webhook não grava divisão correta
**Solução**: Verificar se tabela `sind.adesoes_pendentes` existe e tem dados

---

## 📊 Monitoramento

### **Logs da Vercel**
```
Function Logs → /api/sascred/iniciar-adesao
```

### **Logs do Webhook PHP**
```bash
# No servidor PHP
tail -f /var/log/php-errors.log
```

### **Verificar Tabela**
```sql
-- Ver adesões pendentes
SELECT * FROM sind.adesoes_pendentes 
WHERE status = 'pendente' 
ORDER BY data_inicio DESC;

-- Ver adesões assinadas
SELECT * FROM sind.adesoes_pendentes 
WHERE status = 'assinado' 
ORDER BY data_inicio DESC;
```

---

## ✅ Checklist Final

- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Dependência `pg` instalada
- [ ] Código commitado e pushed
- [ ] Deploy realizado na Vercel
- [ ] Tabela `sind.adesoes_pendentes` criada no banco
- [ ] Webhook PHP atualizado no servidor
- [ ] Teste completo realizado
- [ ] Logs verificados (Vercel + PHP)

---

**Data**: 2025-11-17  
**Plataforma**: Vercel (Next.js) + Servidor PHP (Webhook)  
**Status**: ✅ Pronto para produção
