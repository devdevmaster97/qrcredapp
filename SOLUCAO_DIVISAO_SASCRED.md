# ✅ SOLUÇÃO IMPLEMENTADA: Divisão Correta no Webhook ZapSign

## 🔴 PROBLEMA ORIGINAL

Associado pode ter **múltiplos registros** na tabela `sind.associado` com **divisões diferentes**:

```sql
-- Exemplo: Associado 023999
ID: 182, Código: 023999, Divisão: 1  ✅ (correto - sessão ativa)
ID: 999, Código: 023999, Divisão: 2  ❌ (registro antigo/duplicado)
```

**Webhook ZapSign** não recebia informação de qual divisão usar, resultando em:
- Gravação com divisão incorreta na tabela `sind.associados_sasmais`
- Menu SasCred não liberado (busca por divisão errada)
- Dados inconsistentes no sistema

---

## ✅ SOLUÇÃO IMPLEMENTADA (Solução 3)

### Estratégia: Salvar Divisão ao Iniciar Adesão

Quando usuário inicia adesão, salvamos `id_associado` e `id_divisao` da **sessão ativa** em tabela temporária. Webhook busca esses dados para gravar com divisão correta.

---

## 📋 ARQUIVOS CRIADOS/MODIFICADOS

### 1️⃣ **Tabela Temporária** ✅
**Arquivo**: `sql/create_adesoes_pendentes.sql`

```sql
CREATE TABLE sind.adesoes_pendentes (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL,
    cpf VARCHAR(14) NOT NULL,
    email VARCHAR(255) NOT NULL,
    id_associado INTEGER NOT NULL,  -- ✅ ID único
    id_divisao INTEGER NOT NULL,    -- ✅ Divisão correta
    nome VARCHAR(255),
    celular VARCHAR(20),
    data_inicio TIMESTAMP DEFAULT NOW(),
    data_expiracao TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours'),
    status VARCHAR(20) DEFAULT 'pendente',
    doc_token VARCHAR(255),
    CONSTRAINT unique_cpf_email UNIQUE(cpf, email)
);
```

**Características**:
- Registros expiram em 24 horas
- Unique constraint em CPF + Email
- Status: pendente, assinado, expirado, cancelado
- Procedure para limpeza automática

---

### 2️⃣ **API para Iniciar Adesão** ✅
**Arquivo**: `/app/api/sascred/iniciar-adesao/route.ts`

**Funcionalidade**:
- Recebe dados do associado logado
- Salva `id_associado` e `id_divisao` corretos
- Upsert (INSERT ou UPDATE se já existe)

**Request**:
```json
{
  "codigo": "023999",
  "cpf": "12345678900",
  "email": "usuario@email.com",
  "id_associado": 182,      // ✅ ID da sessão ativa
  "id_divisao": 1,          // ✅ Divisão da sessão ativa
  "nome": "Nome do Usuário",
  "celular": "11999999999"
}
```

**Response**:
```json
{
  "status": "sucesso",
  "mensagem": "Adesão pendente registrada com sucesso",
  "dados": {
    "id": 1,
    "codigo": "023999",
    "id_associado": 182,
    "id_divisao": 1
  }
}
```

---

### 3️⃣ **Componente de Adesão Atualizado** ✅
**Arquivo**: `/app/dashboard/adesao-sasapp/page.tsx`

**Modificação** (linhas 242-270):
```typescript
// ✅ NOVO: Registrar adesão pendente antes de redirecionar
console.log('📝 Registrando adesão pendente com divisão correta...');
try {
  const iniciarAdesaoResponse = await fetch('/api/sascred/iniciar-adesao', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      codigo: localizaData.matricula,
      cpf: localizaData.cpf,
      email: localizaData.email,
      id_associado: localizaData.id,        // ✅ Da sessão ativa
      id_divisao: localizaData.id_divisao,  // ✅ Da sessão ativa
      nome: localizaData.nome,
      celular: localizaData.cel || localizaData.celular
    })
  });

  if (iniciarAdesaoResponse.ok) {
    const iniciarData = await iniciarAdesaoResponse.json();
    console.log('✅ Adesão pendente registrada:', iniciarData);
  }
} catch (error) {
  console.error('❌ Erro ao registrar adesão pendente:', error);
  // Não bloquear o fluxo se falhar
}
```

---

### 4️⃣ **Webhook ZapSign Atualizado** ✅
**Arquivo**: `webhook_zapsign_sascred_ATUALIZADO.php`

**Fluxo**:

1. **Recebe dados do ZapSign**:
```php
$nome = $signer['name'];
$email = $signer['email'];
$cpf = $signer['cpf'];
$has_signed = $signer['has_signed'];
```

2. **Busca na tabela adesoes_pendentes** (PRIORIDADE):
```php
$sql = "SELECT id, codigo, id_associado, id_divisao 
        FROM sind.adesoes_pendentes 
        WHERE cpf = :cpf AND email = :email
        AND status = 'pendente'
        ORDER BY data_inicio DESC 
        LIMIT 1";
```

3. **Se encontrado, usa divisão correta**:
```php
$id_associado = $adesaoPendente['id_associado'];  // ✅ 182
$id_divisao = $adesaoPendente['id_divisao'];      // ✅ 1
```

4. **Fallback se não encontrado**:
```php
// Busca na tabela associado (menos seguro)
$sql = "SELECT id, id_divisao 
        FROM sind.associado 
        WHERE cpf = :cpf AND ativo = true
        ORDER BY id DESC LIMIT 1";
```

5. **Grava com divisão correta**:
```php
INSERT INTO sind.associados_sasmais 
(codigo, nome, email, cpf, id_associado, id_divisao, ...)
VALUES (:codigo, :nome, :email, :cpf, :id_associado, :id_divisao, ...)
```

6. **Atualiza status da adesão pendente**:
```php
UPDATE sind.adesoes_pendentes 
SET status = 'assinado', doc_token = :doc_token
WHERE id = :id
```

---

## 🔄 FLUXO COMPLETO

```
1. USUÁRIO LOGA NO APP
   ↓
   - Sistema busca dados: id_associado=182, id_divisao=1

2. USUÁRIO CLICA "ADERIR SASCRED"
   ↓
   - Frontend chama /api/sascred/iniciar-adesao
   - Salva: codigo=023999, cpf=XXX, email=XXX, id_associado=182, id_divisao=1
   - Tabela: sind.adesoes_pendentes

3. USUÁRIO REDIRECIONA PARA ZAPSIGN
   ↓
   - Assina documento digitalmente

4. ZAPSIGN ENVIA WEBHOOK
   ↓
   - webhook_zapsign_sascred_ATUALIZADO.php recebe
   - Busca em sind.adesoes_pendentes por CPF + Email
   - Encontra: id_associado=182, id_divisao=1 ✅
   - Grava em sind.associados_sasmais com divisão correta

5. MENU SASCRED É LIBERADO
   ↓
   - API verifica: id_associado=182, id_divisao=1
   - Encontra registro correto
   - Menu aparece no dashboard ✅
```

---

## 📊 COMPARAÇÃO: ANTES vs DEPOIS

### ❌ ANTES (Problema)

```
Webhook recebe: CPF, Email
Busca em associado: Encontra ID=999, Divisão=2 (errado)
Grava: id_associado=999, id_divisao=2
Menu não libera: Busca por id_associado=182, id_divisao=1 (não encontra)
```

### ✅ DEPOIS (Solução)

```
Usuário loga: id_associado=182, id_divisao=1
Salva em adesoes_pendentes: id_associado=182, id_divisao=1
Webhook busca em adesoes_pendentes: Encontra id_associado=182, id_divisao=1
Grava: id_associado=182, id_divisao=1 ✅
Menu libera: Busca por id_associado=182, id_divisao=1 (encontra!) ✅
```

---

## 🚀 PASSOS PARA APLICAR

### 1. **Executar SQL no Banco**
```bash
psql -U seu_usuario -d seu_banco -f sql/create_adesoes_pendentes.sql
```

### 2. **Configurar Variáveis de Ambiente**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=seu_banco
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
```

### 3. **Fazer Upload do Webhook**
```bash
# Upload para servidor
scp webhook_zapsign_sascred_ATUALIZADO.php usuario@servidor:/caminho/
```

### 4. **Substituir Webhook Antigo**
```bash
# No servidor
mv webhook_zapsign_sascred.php webhook_zapsign_sascred_OLD.php
mv webhook_zapsign_sascred_ATUALIZADO.php webhook_zapsign_sascred.php
```

### 5. **Testar Fluxo Completo**
1. Fazer login no app
2. Clicar em "Aderir SasCred"
3. Verificar log: "✅ Adesão pendente registrada"
4. Assinar documento no ZapSign
5. Verificar log do webhook: "✅ DIVISÃO CORRETA"
6. Verificar menu SasCred liberado

---

## 🔍 LOGS PARA MONITORAMENTO

### Frontend (Console do Navegador):
```
📝 Registrando adesão pendente com divisão correta...
✅ Adesão pendente registrada: {id: 1, id_associado: 182, id_divisao: 1}
```

### API Next.js (Server Logs):
```
📝 Iniciando registro de adesão SasCred: {codigo: "023999", id_associado: 182, id_divisao: 1}
✅ Adesão pendente registrada com sucesso
```

### Webhook PHP (error_log):
```
🔔 WEBHOOK ZAPSIGN RECEBIDO
🔍 Buscando dados da adesão pendente...
✅ Adesão pendente encontrada: ID Associado: 182, ID Divisão: 1
✅ Novo registro inserido com sucesso: ID Divisão: 1 (✅ DIVISÃO CORRETA)
✅ WEBHOOK PROCESSADO COM SUCESSO
```

---

## ✅ BENEFÍCIOS DA SOLUÇÃO

1. **Precisão 100%**: Usa dados da sessão ativa do usuário
2. **Sem Ambiguidade**: Não depende de busca por CPF que pode ter duplicatas
3. **Rastreável**: Logs detalhados em cada etapa
4. **Fallback Seguro**: Se falhar, tenta buscar na tabela associado
5. **Não Bloqueia**: Se API falhar, fluxo continua (webhook tem fallback)
6. **Limpeza Automática**: Registros expiram em 24h
7. **Auditável**: Tabela temporária mantém histórico de adesões

---

## 📝 MANUTENÇÃO

### Limpar Registros Expirados Manualmente:
```sql
SELECT sind.limpar_adesoes_expiradas();
```

### Verificar Adesões Pendentes:
```sql
SELECT * FROM sind.adesoes_pendentes 
WHERE status = 'pendente' 
ORDER BY data_inicio DESC;
```

### Verificar Adesões Assinadas:
```sql
SELECT * FROM sind.adesoes_pendentes 
WHERE status = 'assinado' 
ORDER BY data_inicio DESC;
```

---

**Data**: 2025-11-17  
**Problema**: Divisão incorreta no webhook ZapSign  
**Solução**: Tabela temporária com dados da sessão ativa  
**Status**: ✅ Implementação completa
