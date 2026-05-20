# ✅ CHECKLIST - Arquivos PHP no Servidor Remoto

## 📍 **Localização no Servidor**
```
/home/makecard/public_html/sas/api/seguro-beneficiarios/
```

## 📦 **Arquivos que DEVEM estar atualizados:**

### 1️⃣ **seguro_beneficiarios_listar.php**
- ✅ Linha 18: `require '../../Adm/php/banco.php';`
- ✅ Linha 28: `include "../../Adm/php/funcoes.php";`
- ✅ Logs detalhados adicionados
- ✅ Query SQL usando `id_beneficiario` (não `id`)

### 2️⃣ **seguro_beneficiarios_criar.php**
- ✅ Linha 18: `require '../../Adm/php/banco.php';`
- ✅ Linha 28: `include "../../Adm/php/funcoes.php";`
- ✅ Insere apenas campos essenciais (id_associado, id_divisao, status, data_criacao)
- ✅ Não tenta inserir em colunas `nome`, `cpf` que não existem

### 3️⃣ **seguro_beneficiarios_excluir.php**
- ✅ Linha 12: `require '../../Adm/php/banco.php';`
- ✅ Linha 13: `include "../../Adm/php/funcoes.php";`
- ✅ Validação de status antes de excluir

### 4️⃣ **webhook_seguro_beneficiarios.php**
- ✅ Linha 114: `include "../../Adm/php/banco.php";`
- ✅ Transaction locking com `FOR UPDATE`

---

## 🧪 **Como Testar se Arquivos Estão Corretos**

### **Teste 1: Listar Beneficiários**
```bash
curl "https://sas.makecard.com.br/api/seguro-beneficiarios/seguro_beneficiarios_listar.php?id_associado=174&id_divisao=1"
```

**Resposta Esperada:**
```json
{
  "success": true,
  "beneficiarios": [
    {
      "id_beneficiario": 8,
      "id_associado": 174,
      "id_divisao": 1,
      "status": "pendente",
      ...
    }
  ]
}
```

### **Teste 2: Criar Beneficiário**
```bash
curl -X POST "https://sas.makecard.com.br/api/seguro-beneficiarios/seguro_beneficiarios_criar.php" \
  -H "Content-Type: application/json" \
  -d '{"id_associado":174,"id_divisao":1,"quantidade":1}'
```

**Resposta Esperada:**
```json
{
  "success": true,
  "data": [...],
  "message": "1 beneficiário(s) criado(s) com sucesso"
}
```

---

## 🔍 **Verificar Logs do Servidor PHP**

Após fazer upload dos arquivos, verifique o **error_log** do servidor PHP para ver:

```
========================================
📋 SEGURO BENEFICIÁRIOS LISTAR - INICIANDO
========================================
🔧 Tentando incluir arquivos...
✅ banco.php incluído com sucesso
✅ funcoes.php incluído com sucesso
🔌 Tentando conectar ao banco...
✅ Conexão com banco estabelecida
📥 Parâmetros recebidos: id_associado=174, id_divisao=1
🔍 Preparando query SQL...
✅ Query executada com sucesso! Total de beneficiários: 4
```

---

## ⚠️ **Se Ainda Houver Erro**

Se após atualizar os arquivos PHP ainda houver erro, verifique:

1. **Permissões dos arquivos:** `chmod 644 *.php`
2. **Caminho do banco.php:** Confirme que existe em `/home/makecard/public_html/sas/Adm/php/banco.php`
3. **Error log do PHP:** Verifique mensagens de erro detalhadas

---

## 📤 **Arquivos Locais Prontos para Upload**

Os arquivos corretos estão em:
- `c:\sasapp\seguro_beneficiarios_listar.php`
- `c:\sasapp\seguro_beneficiarios_criar.php`
- `c:\sasapp\seguro_beneficiarios_excluir.php`
- `c:\sasapp\webhook_seguro_beneficiarios.php`

**Faça upload via FTP/SFTP para o servidor remoto!**

---

**Data:** 20/05/2026  
**Status:** Aguardando upload dos arquivos PHP para o servidor
