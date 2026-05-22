# 📤 INSTRUÇÕES - Upload do PHP Atualizado para Servidor

## 🎯 Objetivo

Fazer upload do arquivo `historico_antecipacao_app_get.php` atualizado com logs detalhados para identificar por que o campo `mes_corrente` não está sendo retornado pela API.

---

## 📁 Arquivo a Enviar

**Arquivo local:**
```
c:\sasapp\historico_antecipacao_app_get.php
```

**Destino no servidor:**
```
/home/makecard/public_html/sas/api/seguro-beneficiarios/historico_antecipacao_app_get.php
```

**ATENÇÃO:** O caminho pode ser diferente. Verifique onde o arquivo está atualmente no servidor.

---

## 🔧 Como Fazer Upload

### **Opção 1: Via FileZilla/SFTP**
1. Conecte em: `sas.makecard.com.br`
2. Navegue até a pasta onde o arquivo está
3. Faça upload do `historico_antecipacao_app_get.php`
4. Sobrescreva o arquivo existente

### **Opção 2: Via cPanel**
1. Acesse o cPanel do servidor
2. File Manager → Navegue até a pasta do arquivo
3. Upload do arquivo
4. Sobrescreva o existente

---

## 🧪 Testar Após Upload

1. Acesse: https://sasapp.tec.br/dashboard/antecipacao
2. Faça login com cartão 8074900243
3. Abra o console (F12)
4. Recarregue a página (Ctrl+Shift+R)

---

## 📊 Verificar Logs do Servidor PHP

Após o upload, acesse os logs do servidor PHP (error_log) e procure por:

```
📋 Dados brutos encontrados (primeiros 3 registros):
Registro 1: {...}
  ✅ Campo mes_corrente presente: JUN/2026
  
OU

  ❌ Campo mes_corrente AUSENTE
  📋 Campos disponíveis: id, matricula, empregador, valor_solicitado, ...
```

Isso vai mostrar se:
1. O campo `mes_corrente` está vindo do banco de dados
2. Quais campos estão realmente disponíveis
3. Se o campo está sendo perdido na conversão UTF-8

---

## 🚨 Próximos Passos

Após fazer o upload e verificar os logs, me envie:
1. Os logs do servidor PHP (error_log)
2. Os logs do console do navegador

Com essas informações, vou poder identificar exatamente onde o campo está sendo perdido e corrigir definitivamente.
