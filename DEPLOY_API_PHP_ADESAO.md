# 🚀 Deploy da API PHP de Adesão Pendente

## ✅ Solução Implementada

Em vez de usar **Vercel + PostgreSQL** (que estava dando problema), agora usamos **API PHP direta no servidor** (igual às outras APIs que já funcionam).

---

## 📁 Arquivos Criados

### **1. API PHP no Servidor**
```
api_registrar_adesao_pendente.php
```

**Localização no servidor**: 
```
https://sas.makecard.com.br/api_registrar_adesao_pendente.php
```

### **2. Componente Next.js Atualizado**
```
/app/dashboard/adesao-sasapp/page.tsx
```

**Mudança**: Agora chama a API PHP em vez da API Next.js da Vercel

---

## 📋 Passos para Deploy

### **1. Upload do Arquivo PHP**

Fazer upload do arquivo `api_registrar_adesao_pendente.php` para o servidor:

```bash
# Via FTP/SFTP
Origem: c:\sasapp\api_registrar_adesao_pendente.php
Destino: /public_html/api_registrar_adesao_pendente.php
```

**Ou via SSH**:
```bash
scp api_registrar_adesao_pendente.php usuario@sas.makecard.com.br:/caminho/do/servidor/
```

---

### **2. Verificar Permissões**

No servidor, ajustar permissões:

```bash
chmod 644 api_registrar_adesao_pendente.php
chown www-data:www-data api_registrar_adesao_pendente.php
```

---

### **3. Testar API PHP Diretamente**

Testar se a API está acessível:

```bash
curl -X POST https://sas.makecard.com.br/api_registrar_adesao_pendente.php \
  -H "Content-Type: application/json" \
  -d '{
    "codigo": "023999",
    "cpf": "12345678900",
    "email": "teste@email.com",
    "id_associado": 182,
    "id_divisao": 1,
    "nome": "Teste Usuario",
    "celular": "(11) 98765-4321"
  }'
```

**Resposta esperada**:
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

### **4. Deploy do Next.js na Vercel**

Fazer commit e push das mudanças:

```bash
git add app/dashboard/adesao-sasapp/page.tsx
git commit -m "feat: usar API PHP para adesão pendente"
git push origin main
```

A Vercel vai fazer deploy automaticamente.

---

### **5. Verificar Tabela no Banco**

Garantir que a tabela existe:

```sql
-- Verificar se existe
SELECT tablename FROM pg_tables 
WHERE schemaname = 'sind' 
AND tablename = 'adesoes_pendentes';

-- Se não existir, criar
-- Executar: sql/create_adesoes_pendentes.sql
```

---

## 🧪 Teste Completo

### **1. Acessar App em Produção**
```
https://seu-dominio.vercel.app/dashboard/adesao-sasapp
```

### **2. Abrir DevTools (F12)**

### **3. Clicar em "Aderir SasCred"**

### **4. Verificar Console**

**Sucesso**:
```javascript
📝 Registrando adesão pendente com divisão correta...
✅ Adesão pendente registrada: {
  status: "sucesso",
  dados: {
    id: 1,
    codigo: "023999",
    id_associado: 182,
    id_divisao: 1
  }
}
```

### **5. Verificar Banco de Dados**

```sql
SELECT * FROM sind.adesoes_pendentes 
ORDER BY data_inicio DESC 
LIMIT 1;
```

Deve mostrar:
- `codigo`: 023999
- `id_associado`: 182
- `id_divisao`: 1 (✅ CORRETO!)
- `status`: pendente

---

## 🎯 Vantagens da Solução PHP

### ✅ **Mais Simples**
- Não precisa configurar variáveis de ambiente na Vercel
- Usa conexão de banco existente (`Adm/php/banco.php`)
- Mesma estrutura das outras APIs PHP

### ✅ **Mais Confiável**
- Conexão direta com PostgreSQL (sem limitações serverless)
- Sem timeout de 10 segundos da Vercel
- Sem problemas de pool de conexões

### ✅ **Mais Rápido**
- Servidor PHP já otimizado
- Sem cold start de função serverless
- Resposta imediata

---

## 🔧 Troubleshooting

### **Erro: CORS**
```
Access to fetch at '...' has been blocked by CORS policy
```

**Solução**: Verificar headers no PHP (já incluídos):
```php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
```

---

### **Erro: 404 Not Found**
```
GET https://sas.makecard.com.br/api_registrar_adesao_pendente.php 404
```

**Solução**: Verificar se arquivo foi enviado para o servidor

---

### **Erro: Tabela não existe**
```
relation "sind.adesoes_pendentes" does not exist
```

**Solução**: Executar script SQL:
```bash
psql -h HOST -U USER -d DATABASE -f sql/create_adesoes_pendentes.sql
```

---

### **Erro: Conexão com banco**
```
SQLSTATE[08006] Connection refused
```

**Solução**: Verificar arquivo `Adm/php/banco.php` no servidor

---

## 📊 Fluxo Completo

```
1. USUÁRIO CLICA "ADERIR SASCRED"
   ↓
2. NEXT.JS CHAMA API PHP
   https://sas.makecard.com.br/api_registrar_adesao_pendente.php
   ↓
3. API PHP GRAVA NA TABELA
   sind.adesoes_pendentes
   ↓
4. WEBHOOK ZAPSIGN BUSCA DADOS
   SELECT * FROM sind.adesoes_pendentes WHERE cpf = ...
   ↓
5. WEBHOOK GRAVA COM DIVISÃO CORRETA
   INSERT INTO sind.associados_sasmais (id_divisao = 1) ✅
```

---

## ✅ Checklist Final

- [ ] Arquivo `api_registrar_adesao_pendente.php` enviado para servidor
- [ ] Permissões ajustadas (644)
- [ ] Teste direto da API PHP funcionando
- [ ] Tabela `sind.adesoes_pendentes` existe no banco
- [ ] Deploy do Next.js feito na Vercel
- [ ] Teste completo realizado em produção
- [ ] Verificação no banco confirmada

---

**Data**: 2025-11-17  
**Status**: ✅ Pronto para deploy  
**Solução**: API PHP (mais simples e confiável que Vercel + PostgreSQL)
