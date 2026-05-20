# 📦 INSTRUÇÕES PARA UPLOAD - SISTEMA SEGURO BENEFICIÁRIOS

## 🔴 PROBLEMA ATUAL

O sistema está retornando erro 500 porque os arquivos PHP no servidor `https://sas.makecard.com.br/api/seguro-beneficiarios/` ainda estão com a **versão antiga** que contém bugs críticos.

## ✅ ARQUIVOS LOCAIS CORRIGIDOS

Os seguintes arquivos locais estão **prontos e corrigidos** com todas as melhorias:

1. **`c:\sasapp\seguro_beneficiarios_listar.php`** ✅
2. **`c:\sasapp\seguro_beneficiarios_criar.php`** ✅
3. **`c:\sasapp\seguro_beneficiarios_excluir.php`** ✅
4. **`c:\sasapp\webhook_seguro_beneficiarios.php`** ✅

## 🎯 DESTINO NO SERVIDOR

Faça upload dos 4 arquivos PHP para o seguinte caminho no servidor:

```
https://sas.makecard.com.br/api/seguro-beneficiarios/
├── seguro_beneficiarios_listar.php
├── seguro_beneficiarios_criar.php
├── seguro_beneficiarios_excluir.php
└── webhook_seguro_beneficiarios.php (se ainda não existir)
```

## 📋 CORREÇÕES APLICADAS NOS ARQUIVOS

### 1️⃣ **seguro_beneficiarios_listar.php**
- ✅ Usa `id_beneficiario` em vez de `id` (schema correto)
- ✅ Retorna `beneficiarios` em vez de `data` (compatível com frontend)
- ✅ Conexão PDO padronizada com `Banco::conectar_postgres()`
- ✅ Logs detalhados para debug
- ✅ Segurança: erros genéricos para o cliente

### 2️⃣ **seguro_beneficiarios_criar.php**
- ✅ Insere apenas campos essenciais (id_associado, id_divisao, status, data_criacao)
- ✅ Não tenta inserir em colunas `nome`, `cpf` que não existem
- ✅ Transação completa com rollback em caso de erro
- ✅ Validação de quantidade (máximo 4 beneficiários)
- ✅ Logs detalhados para debug
- ✅ Segurança: erros genéricos para o cliente

### 3️⃣ **seguro_beneficiarios_excluir.php**
- ✅ Validação de existência do beneficiário
- ✅ Validação de status (só exclui se pendente)
- ✅ Conexão PDO padronizada
- ✅ Segurança: erros genéricos para o cliente

### 4️⃣ **webhook_seguro_beneficiarios.php**
- ✅ Transaction locking com `FOR UPDATE` (evita race condition)
- ✅ Transação completa com commit/rollback
- ✅ Segurança: erros genéricos para o cliente

## 🔍 COMO VERIFICAR SE FUNCIONOU

Após fazer o upload, recarregue a página e verifique:

### ✅ **Logs no Console do Navegador (F12)**

Você verá logs da API Next.js mostrando a comunicação com o PHP:
```
📋 API LISTAR - Iniciando (via PHP)...
📋 Parâmetros recebidos: {id_associado: 174, id_divisao: 1}
🔌 Chamando PHP: https://sas.makecard.com.br/api/seguro-beneficiarios/seguro_beneficiarios_listar.php?...
📊 Status da resposta PHP: 200
✅ JSON parseado com sucesso
```

### ✅ **Logs no Error Log do Servidor PHP**

No servidor, você verá logs detalhados no `error_log`:
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
📝 Query preparada, executando...
✅ Query executada com sucesso! Total de beneficiários: 0
✅ Resposta JSON enviada com sucesso
========================================
```

### ❌ **Se Houver Erro, os Logs Mostrarão:**

```
❌ ERRO ao incluir banco.php: ...
❌ ERRO ao conectar ao banco: ...
❌ ERRO PDO: ...
```

## 🚀 RESULTADO ESPERADO

Após o upload correto:

1. ✅ Erro 500 será eliminado
2. ✅ Lista de beneficiários carregará corretamente
3. ✅ Criação de beneficiários funcionará
4. ✅ Exclusão de beneficiários funcionará
5. ✅ Webhook processará assinaturas sem race condition

## 📞 SUPORTE

Se após o upload ainda houver erro:

1. Verifique os logs do error_log do servidor PHP
2. Verifique se os arquivos foram enviados para o caminho correto
3. Verifique se a tabela `sind.seguro_beneficiarios` existe no banco
4. Verifique se o arquivo `Adm/php/banco.php` existe no servidor

---

**Data de criação:** 19/05/2026  
**Versão dos arquivos:** Corrigida com todas as melhorias aplicadas
