# 🔧 CORREÇÃO URGENTE - Campo mes_corrente não está vindo da API

## 🎯 Problema Identificado

O campo `mes_corrente` não está sendo retornado pela API `historico_antecipacao_app_get.php`, causando:
- Saldo disponível não subtrai antecipações do mês
- Filtro `solicitacao.mes_corrente === mesAtual` sempre retorna false
- Todas as solicitações são ignoradas no cálculo

## 📊 Evidências

Logs do usuário mostram:
```javascript
{valor_a_descontar: "522.5", ...}
// ❌ Campo mes_corrente AUSENTE
```

## 🔍 Causa Raiz

A query SQL usa alias:
```sql
SELECT mes as mes_corrente FROM sind.antecipacao
```

Mas o campo pode:
1. Não existir na tabela (coluna se chama diferente)
2. Alias não está funcionando
3. Campo está sendo removido na conversão UTF-8

## ✅ Solução Imediata

Adicionar fallback no código TypeScript para usar campo `mes` se `mes_corrente` não existir:

```typescript
const isMesCorrente = (solicitacao.mes_corrente || solicitacao.mes) === mesAtual;
```

## 📝 Passos para Correção

1. **Verificar resposta da API via Network tab**
   - F12 → Network → historico_antecipacao_app_get.php
   - Ver qual campo realmente vem (mes ou mes_corrente)

2. **Adicionar fallback no código**
   - Linha 524: `solicitacao.mes_corrente || solicitacao.mes`

3. **Adicionar log de debug**
   - Mostrar qual campo está sendo usado

4. **Testar com cartão 8074900243**
   - Verificar se saldo agora subtrai os R$ 522,50

## 🚨 Ação Necessária

Usuário precisa verificar a aba Network e me enviar o JSON de uma solicitação para eu ver exatamente quais campos estão vindo.
