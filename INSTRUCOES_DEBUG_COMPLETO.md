# 🔍 Debug Completo - Relatórios Sem Dados

## 🚨 Problema
O relatório não está mostrando dados mesmo após a correção da API PHP.

## 📋 Passos para Diagnóstico

### **1. Execute o Script de Teste**
```powershell
# No PowerShell, execute:
.\teste_api_debug.ps1
```

Este script vai:
- ✅ Testar login no app
- ✅ Buscar lançamentos via app  
- ✅ Testar API PHP diretamente
- ✅ Mostrar resultados detalhados

### **2. Verifique Console do Navegador**
1. Acesse **Convênio → Dashboard → Relatórios**
2. Abra **F12 → Console**
3. Procure mensagens que começam com **"🔍"**

**O que analisar:**
```javascript
🔍 RESPOSTA COMPLETA DA API: {...}     // Dados recebidos
🔍 SUCCESS: true/false                  // Se API funcionou
🔍 DATA: [...]                          // Array de lançamentos  
🔍 TOTAL ITENS: X                       // Quantidade
🔍 MESES EXTRAÍDOS: [...]               // Meses únicos
🔍 FILTRO - Lançamentos filtrados: X    // Após aplicar filtro
```

### **3. Verifique Logs do Servidor**
No terminal onde o Next.js está rodando, procure:
```
🔍 RESPOSTA BRUTA PHP: {...}
🔍 SUCCESS PHP: true/false
🔍 LANÇAMENTOS PHP: X
```

## 🎯 Cenários Possíveis

### **Cenário 1: API PHP não retorna dados**
```
Sintomas:
- Script PowerShell mostra "total: 0"
- Logs mostram "LANÇAMENTOS PHP: 0"

Causa: Problema na consulta SQL ou código do convênio

Solução: Verificar logs do PHP no servidor
```

### **Cenário 2: API PHP retorna, mas Next.js não recebe**
```
Sintomas:
- Script direto funciona
- Logs Next.js mostram erro ou dados vazios

Causa: Problema na comunicação entre Next.js e PHP

Solução: Verificar headers, CORS, formato da resposta
```

### **Cenário 3: Frontend recebe dados mas não exibe**
```
Sintomas:
- Console mostra "TOTAL ITENS: X" (X > 0)
- Mas "Lançamentos filtrados: 0"

Causa: Problema no filtro ou mês selecionado

Solução: Verificar lógica de filtro e mês corrente
```

### **Cenário 4: Dados chegam mas interface não renderiza**
```
Sintomas:
- Console mostra dados corretos
- Mas tabela aparece vazia

Causa: Problema na renderização React

Solução: Verificar estrutura dos dados vs interface
```

## 🔧 Verificações Diretas

### **Teste 1: Consulta SQL Direta**
```sql
-- Execute no banco:
SELECT 
    c.lancamento,
    c.associado,
    c.convenio,
    c.valor,
    c.data,
    c.mes,
    c.empregador
FROM sind.conta c
WHERE c.convenio = [SEU_CODIGO_CONVENIO]
ORDER BY c.data DESC
LIMIT 10;
```

### **Teste 2: API PHP Via Navegador**
```
Acesse no navegador:
https://sas.makecard.com.br/listar_lancamentos_convenio_app.php?cod_convenio=[CODIGO]
```

### **Teste 3: Token do Convênio**
```javascript
// No console do navegador (após login):
document.cookie.split(';').find(c => c.includes('convenioToken'))
```

## 🎯 Possíveis Soluções

### **Solução 1: Problema de CORS/Headers**
```php
// Adicionar no topo do PHP:
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=utf-8");
```

### **Solução 2: Formato de Resposta Inconsistente**
```php
// Garantir resposta JSON válida:
header('Content-Type: application/json');
echo json_encode($response, JSON_UNESCAPED_UNICODE);
```

### **Solução 3: Código do Convênio Incorreto**
```javascript
// Verificar se o token tem o código correto
// Pode ser que esteja enviando string em vez de número
```

### **Solução 4: Campo mes com espaços/caracteres extras**
```sql
-- Verificar se há caracteres invisíveis:
SELECT 
    mes,
    LENGTH(mes) as tamanho,
    TRIM(mes) as mes_limpo
FROM sind.conta 
WHERE mes LIKE '%2025%';
```

## 📊 Interpretando Resultados

### **✅ Cenário Ideal**
```
Script PowerShell:
✅ Login realizado com sucesso!
✅ Total de lançamentos: 150
✅ Lançamentos AGO/2025: 25

Console Navegador:
🔍 SUCCESS: true
🔍 TOTAL ITENS: 150  
🔍 MESES EXTRAÍDOS: ["DEZ/2024", "AGO/2025", ...]
🔍 FILTRO - Lançamentos filtrados: 25
```

### **❌ Problemas Comuns**
```
Problema: Total 0
🔍 TOTAL ITENS: 0
→ API PHP não está retornando dados

Problema: Filtro vazio  
🔍 TOTAL ITENS: 150
🔍 FILTRO - Lançamentos filtrados: 0
→ Mês selecionado não existe nos dados

Problema: Erro de parsing
🔍 ERRO CATCH: SyntaxError
→ API PHP retornando HTML em vez de JSON
```

## 🎯 Próximos Passos

1. **Execute o script PowerShell**
2. **Analise os logs do console**  
3. **Compare os resultados**
4. **Identifique onde está a falha**
5. **Aplique a solução correspondente**

## ⚠️ Limpeza

Após resolver, **remover**:
- Logs de debug do frontend
- Logs de debug da API Next.js
- Script PowerShell temporário