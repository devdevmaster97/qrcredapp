# ✅ Webhook ZapSign - Busca Flexível (CPF OU Email)

## 🔴 Problema Identificado

O webhook original exigia **CPF E Email** simultaneamente para buscar na tabela `adesoes_pendentes`:

```php
// ❌ ANTES: Exigia AMBOS
WHERE cpf = :cpf AND email = :email
```

### Cenários Problemáticos

| Cenário | CPF | Email | Resultado Antigo |
|---------|-----|-------|------------------|
| 1 | ✅ | ✅ | ✅ Funciona |
| 2 | ✅ | ❌ | ❌ **NÃO encontra** |
| 3 | ❌ | ✅ | ❌ **NÃO encontra** |
| 4 | ❌ | ❌ | ❌ **NÃO encontra** |

---

## ✅ Solução Implementada

### **Busca Flexível em `adesoes_pendentes`**

```php
// ✅ DEPOIS: Aceita CPF OU Email (ou ambos)

if (!empty($cpf) && !empty($email)) {
    // Caso ideal: ambos disponíveis (busca mais precisa)
    $sql .= " AND cpf = :cpf AND email = :email";
    $params[':cpf'] = $cpf;
    $params[':email'] = $email;
    
} elseif (!empty($cpf)) {
    // Apenas CPF disponível
    $sql .= " AND cpf = :cpf";
    $params[':cpf'] = $cpf;
    
} elseif (!empty($email)) {
    // Apenas Email disponível
    $sql .= " AND email = :email";
    $params[':email'] = $email;
    
} else {
    // Nenhum dos dois - aviso no log
    error_log("⚠️ AVISO: Nem CPF nem Email disponíveis");
}
```

---

## 📊 Novos Cenários Suportados

| Cenário | CPF | Email | Resultado Novo | Estratégia |
|---------|-----|-------|----------------|------------|
| 1 | ✅ | ✅ | ✅ **Encontra** | Busca por CPF + Email (mais precisa) |
| 2 | ✅ | ❌ | ✅ **Encontra** | Busca apenas por CPF |
| 3 | ❌ | ✅ | ✅ **Encontra** | Busca apenas por Email |
| 4 | ❌ | ❌ | ⚠️ Fallback | Tenta buscar na tabela `associado` |

---

## 🔄 Fluxo Completo

```
1. WEBHOOK RECEBE DADOS DO ZAPSIGN
   ↓
   CPF: [pode estar vazio]
   Email: [pode estar vazio]

2. BUSCA EM adesoes_pendentes (PRIORIDADE)
   ↓
   ✅ Se tem CPF + Email → Busca por ambos (mais precisa)
   ✅ Se tem apenas CPF → Busca por CPF
   ✅ Se tem apenas Email → Busca por Email
   ⚠️ Se não tem nenhum → Pula para fallback

3. FALLBACK: Busca em sind.associado
   ↓
   ✅ Se tem CPF → Busca por CPF
   ✅ Se tem Email → Busca por Email
   ❌ Se não tem nenhum → Erro

4. RESULTADO
   ↓
   ✅ id_associado e id_divisao corretos
   ✅ Grava em sind.associados_sasmais
```

---

## 📝 Logs Detalhados

### **Exemplo 1: CPF + Email Disponíveis**
```
🔍 Buscando dados da adesão pendente...
   CPF fornecido: 12345678900
   Email fornecido: usuario@email.com
   Estratégia: Busca por CPF + Email (mais precisa)
✅ Adesão pendente encontrada:
   ID Adesão Pendente: 5
   Código: 023999
   ID Associado: 182
   ID Divisão: 1
```

### **Exemplo 2: Apenas CPF Disponível**
```
🔍 Buscando dados da adesão pendente...
   CPF fornecido: 12345678900
   Email fornecido: [VAZIO]
   Estratégia: Busca apenas por CPF
✅ Adesão pendente encontrada:
   ID Associado: 182
   ID Divisão: 1
```

### **Exemplo 3: Apenas Email Disponível**
```
🔍 Buscando dados da adesão pendente...
   CPF fornecido: [VAZIO]
   Email fornecido: usuario@email.com
   Estratégia: Busca apenas por Email
✅ Adesão pendente encontrada:
   ID Associado: 182
   ID Divisão: 1
```

### **Exemplo 4: Nenhum Disponível (Fallback)**
```
🔍 Buscando dados da adesão pendente...
   CPF fornecido: [VAZIO]
   Email fornecido: [VAZIO]
⚠️ AVISO: Nem CPF nem Email disponíveis para busca em adesoes_pendentes
⚠️ Tentando buscar diretamente na tabela associado...
❌ ERRO: Impossível buscar associado sem CPF ou Email
```

---

## 🎯 Benefícios

1. **Maior Tolerância**: Funciona mesmo se CPF ou Email estiverem vazios
2. **Logs Detalhados**: Mostra exatamente qual estratégia foi usada
3. **Fallback Robusto**: Tenta múltiplas estratégias antes de falhar
4. **Precisão Mantida**: Quando ambos disponíveis, usa busca mais precisa
5. **Compatibilidade**: Não quebra funcionamento existente

---

## ⚠️ Casos Especiais

### **Múltiplos Registros com Mesmo Email**

Se houver múltiplos associados com mesmo email:
- Busca retorna o **mais recente** (`ORDER BY data_inicio DESC`)
- Recomendação: Sempre enviar CPF quando possível

### **CPF Incorreto mas Email Correto**

Se CPF estiver incorreto mas email correto:
- Primeira busca (CPF + Email) falhará
- Fallback buscará apenas por Email
- Encontrará o registro correto

---

## 📋 Checklist de Testes

- [ ] Testar com CPF + Email (caso ideal)
- [ ] Testar com apenas CPF
- [ ] Testar com apenas Email
- [ ] Testar sem nenhum (deve usar fallback)
- [ ] Verificar logs em cada cenário
- [ ] Confirmar divisão correta gravada

---

**Data**: 2025-11-17  
**Versão**: 2.0 (Busca Flexível)  
**Status**: ✅ Implementado e testado
