# 🧪 Teste: Adesão Pendente Não Gravada

## 🔍 Diagnóstico

### **Possíveis Causas**

1. ❌ **Variáveis de ambiente não configuradas**
2. ❌ **Tabela `sind.adesoes_pendentes` não existe**
3. ❌ **Erro de conexão com banco**
4. ❌ **Campos obrigatórios faltando**

---

## 🧪 Teste Manual

### **1. Verificar Tabela no Banco**

```sql
-- Verificar se tabela existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'sind' 
   AND table_name = 'adesoes_pendentes'
);

-- Se existir, verificar estrutura
\d sind.adesoes_pendentes

-- Verificar registros existentes
SELECT * FROM sind.adesoes_pendentes ORDER BY data_inicio DESC LIMIT 5;
```

---

### **2. Testar API Diretamente**

Abra o **DevTools** (F12) e execute no Console:

```javascript
// Teste direto da API
fetch('/api/sascred/iniciar-adesao', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    codigo: '023999',
    cpf: '12345678900',
    email: 'teste@email.com',
    id_associado: 182,
    id_divisao: 1,
    nome: 'Teste Usuario',
    celular: '(11) 98765-4321'
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Resposta da API:', data);
})
.catch(error => {
  console.error('❌ Erro:', error);
});
```

---

### **3. Verificar Variáveis de Ambiente**

Crie arquivo `.env.local` na raiz do projeto:

```env
# Banco de Dados PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=seu_banco_de_dados
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
```

**IMPORTANTE**: Substitua pelos valores corretos do seu banco!

---

### **4. Verificar Logs no Console**

Ao clicar em "Aderir SasCred", abra o **DevTools** (F12) e procure por:

#### ✅ **Logs de Sucesso**
```
📝 Registrando adesão pendente com divisão correta...
✅ Adesão pendente registrada: {id: 1, codigo: "023999", ...}
```

#### ❌ **Logs de Erro**
```
⚠️ ERRO ao registrar adesão pendente: {status: "erro", mensagem: "..."}
⚠️ Status HTTP: 500
⚠️ Dados enviados: {...}
```

ou

```
❌ EXCEÇÃO ao registrar adesão pendente: Error: ...
❌ Tipo do erro: ...
```

---

## 🔧 Soluções por Tipo de Erro

### **Erro 1: Tabela Não Existe**

```
❌ relation "sind.adesoes_pendentes" does not exist
```

**Solução**: Criar tabela usando o script:

```bash
psql -U seu_usuario -d seu_banco -f sql/create_adesoes_pendentes.sql
```

---

### **Erro 2: Variáveis de Ambiente**

```
❌ connection refused
❌ password authentication failed
```

**Solução**: Configurar `.env.local` com credenciais corretas

---

### **Erro 3: Campos Obrigatórios**

```
❌ Campos obrigatórios: codigo, cpf, email, id_associado, id_divisao
```

**Solução**: Verificar se `localizaData` contém todos os campos:

```javascript
console.log('Dados do associado:', {
  codigo: localizaData.matricula,
  cpf: localizaData.cpf,
  email: localizaData.email,
  id_associado: localizaData.id,
  id_divisao: localizaData.id_divisao
});
```

---

### **Erro 4: Conexão com Banco**

```
❌ Error: connect ECONNREFUSED
```

**Solução**: Verificar se PostgreSQL está rodando:

```bash
# Windows
sc query postgresql-x64-14

# Linux/Mac
sudo systemctl status postgresql
```

---

## 📋 Checklist de Verificação

- [ ] Tabela `sind.adesoes_pendentes` existe no banco
- [ ] Arquivo `.env.local` configurado com credenciais corretas
- [ ] PostgreSQL está rodando
- [ ] Servidor Next.js reiniciado após criar `.env.local`
- [ ] Console do navegador aberto (F12) ao testar
- [ ] Logs aparecem no console ao clicar em "Aderir"

---

## 🎯 Teste Completo

### **Passo a Passo**

1. **Abrir DevTools** (F12)
2. **Ir para aba Console**
3. **Clicar em "Aderir SasCred"**
4. **Observar logs**:
   - ✅ Se aparecer "✅ Adesão pendente registrada" → **FUNCIONOU!**
   - ❌ Se aparecer "⚠️ ERRO" ou "❌ EXCEÇÃO" → **Ver mensagem de erro**

5. **Verificar no banco**:
```sql
SELECT * FROM sind.adesoes_pendentes 
WHERE codigo = '023999' 
ORDER BY data_inicio DESC 
LIMIT 1;
```

---

## 📞 Próximos Passos

Se após verificar todos os itens ainda não funcionar:

1. Copie a mensagem de erro completa do console
2. Copie o resultado da query SQL de verificação da tabela
3. Informe se o arquivo `.env.local` está configurado
4. Informe se o PostgreSQL está rodando

---

**Data**: 2025-11-17  
**Status**: 🧪 Aguardando teste
