# 🚨 PROBLEMA IDENTIFICADO - Variável de Ambiente Faltando na Vercel

## 🔍 **Causa do Problema**

A API Next.js na Vercel está retornando array vazio porque a variável de ambiente `PHP_BASE_URL` **NÃO está configurada**.

### **Teste Realizado:**
```bash
# PHP Direto (funciona):
curl "https://sas.makecard.com.br/api/seguro-beneficiarios/seguro_beneficiarios_listar.php?id_associado=174&id_divisao=1"
Resultado: {"success": true, "beneficiarios": [8, 9]}  ✅

# API Next.js na Vercel (não funciona):
curl "https://sasapp.tec.br/api/seguro-beneficiarios/listar?id_associado=174&id_divisao=1"
Resultado: {"success": true, "beneficiarios": []}  ❌
```

**Conclusão:** A API Next.js não está chamando o PHP corretamente porque `PHP_BASE_URL` está undefined.

---

## ✅ **SOLUÇÃO - Configurar Variável de Ambiente na Vercel**

### **Passo 1: Acessar o Dashboard da Vercel**

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **sasapp** (ou nome do seu projeto)
3. Clique em **Settings** (Configurações)

### **Passo 2: Adicionar Variável de Ambiente**

1. No menu lateral, clique em **Environment Variables**
2. Clique em **Add New**
3. Preencha os campos:

```
Name: PHP_BASE_URL
Value: https://sas.makecard.com.br/api/seguro-beneficiarios
Environment: Production, Preview, Development (marque todos)
```

4. Clique em **Save**

### **Passo 3: Fazer Redeploy**

Após adicionar a variável, você precisa fazer **redeploy** para aplicar:

**Opção A - Via Dashboard:**
1. Vá em **Deployments**
2. Clique nos 3 pontinhos do último deploy
3. Clique em **Redeploy**

**Opção B - Via Git:**
```bash
git commit --allow-empty -m "Trigger redeploy"
git push
```

---

## 🧪 **Verificar se Funcionou**

Após o redeploy, teste novamente:

```bash
curl "https://sasapp.tec.br/api/seguro-beneficiarios/listar?id_associado=174&id_divisao=1"
```

**Resultado Esperado:**
```json
{
  "success": true,
  "beneficiarios": [
    {
      "id_beneficiario": 8,
      "id_associado": 174,
      "status": "pendente",
      ...
    },
    {
      "id_beneficiario": 9,
      "id_associado": 174,
      "status": "pendente",
      ...
    }
  ]
}
```

---

## 📋 **Outras Variáveis que Podem Ser Necessárias**

Se houver outros problemas, verifique se estas variáveis também estão configuradas:

```
DATABASE_URL=sua_url_do_banco
NEXT_PUBLIC_API_URL=https://sasapp.tec.br
```

---

## 🎯 **Após Configurar**

1. ✅ Variável `PHP_BASE_URL` configurada na Vercel
2. ✅ Redeploy realizado
3. ✅ Teste a tela "Seguro Indicações"
4. ✅ Os beneficiários devem aparecer automaticamente

---

**Status:** Aguardando configuração da variável de ambiente na Vercel
**Data:** 20/05/2026
