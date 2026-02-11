# 🔧 Solução: Saldo Não Considera Solicitações Pendentes

## 📋 Problema Identificado

Quando um associado faz uma solicitação de antecipação pendente, o saldo disponível na guia "Nova Solicitação" **não está sendo deduzido**.

**Exemplo:**
- Limite: R$ 510,00
- Solicitação pendente: R$ 300,00
- **Saldo mostrado:** R$ 510,00 ❌
- **Saldo correto:** R$ 210,00 ✅

---

## 🔍 Causa Raiz

O cálculo de saldo em `AntecipacaoContent.tsx` (linha 495-497) apenas deduz os gastos do mês, mas **não deduz as solicitações de antecipação pendentes**:

```typescript
// 4. Calcular saldo
const limite = parseFloat(associadoData.limite || '0');
const saldo = limite - total;  // ❌ Não considera antecipações pendentes
```

---

## ✅ Solução

Modificar a função `loadSaldoData` para deduzir as solicitações pendentes do saldo disponível.

### **Arquivo:** `app/components/dashboard/AntecipacaoContent.tsx`

### **Localização:** Linha 495-515 (aproximadamente)

### **Código Atual:**
```typescript
// 4. Calcular saldo
const limite = parseFloat(associadoData.limite || '0');
const saldo = limite - total;

// 5. Atualizar o estado
setSaldoData({
  saldo,
  limite,
  total,
  mesCorrente: mesAtual,
  porcentagem
});

console.log('✅ SALDO RECALCULADO PARA O MÊS CORRENTE:', {
  mesCorrente: mesAtual,
  limite: limite,
  totalGastoNoMes: total,
  saldoDisponivel: saldo,
  porcentagem: porcentagem,
  idDivisao: associadoData.id_divisao
});
```

### **Código Corrigido:**
```typescript
// 4. Calcular total de solicitações pendentes do mês corrente
const solicitacoesPendentes = ultimasSolicitacoes.filter(solicitacao => {
  // Considerar apenas solicitações do mês corrente que estão pendentes
  const isPendente = solicitacao.status === false || 
                    solicitacao.status === 'false' || 
                    solicitacao.status === null ||
                    solicitacao.status === 'Pendente' ||
                    solicitacao.status === 'pendente';
  const isMesCorrente = solicitacao.mes_corrente === mesAtual;
  return isPendente && isMesCorrente;
});

const totalSolicitacoesPendentes = solicitacoesPendentes.reduce((acc, solicitacao) => {
  // Usar valor_descontar ou valor_a_descontar (ambos podem vir da API)
  const valorDescontar = parseFloat(solicitacao.valor_descontar || solicitacao.valor_a_descontar || '0');
  return acc + valorDescontar;
}, 0);

console.log('💰 Solicitações pendentes encontradas:', {
  quantidade: solicitacoesPendentes.length,
  totalPendente: totalSolicitacoesPendentes,
  solicitacoes: solicitacoesPendentes.map(s => ({
    id: s.id,
    valor: s.valor_descontar || s.valor_a_descontar,
    status: s.status,
    mes: s.mes_corrente
  }))
});

// 5. Calcular saldo deduzindo gastos E solicitações pendentes
const limite = parseFloat(associadoData.limite || '0');
const saldo = limite - total - totalSolicitacoesPendentes;

// 6. Atualizar o estado
setSaldoData({
  saldo,
  limite,
  total,
  mesCorrente: mesAtual,
  porcentagem
});

console.log('✅ SALDO RECALCULADO PARA O MÊS CORRENTE:', {
  mesCorrente: mesAtual,
  limite: limite,
  totalGastoNoMes: total,
  totalSolicitacoesPendentes: totalSolicitacoesPendentes,
  saldoDisponivel: saldo,
  porcentagem: porcentagem,
  idDivisao: associadoData.id_divisao
});
```

---

## 📝 Passos para Implementar

1. ✅ Abra o arquivo: `app/components/dashboard/AntecipacaoContent.tsx`
2. ✅ Localize a função `loadSaldoData` (linha ~460)
3. ✅ Encontre o comentário `// 4. Calcular saldo` (linha ~495)
4. ✅ Substitua o código atual pelo código corrigido acima
5. ✅ Salve o arquivo
6. ✅ Teste fazendo uma solicitação de antecipação

---

## 🧪 Como Testar

### **Cenário de Teste:**
1. Associado com limite de R$ 510,00
2. Fazer solicitação de R$ 300,00
3. Verificar saldo na guia "Nova Solicitação"

### **Resultado Esperado:**
- ✅ Saldo disponível: R$ 210,00 (510 - 300)
- ✅ Não permite solicitar mais de R$ 210,00
- ✅ Após aprovação da solicitação, saldo volta ao normal

### **Logs no Console:**
```
💰 Solicitações pendentes encontradas: {
  quantidade: 1,
  totalPendente: 300,
  solicitacoes: [{
    id: "123",
    valor: "300.00",
    status: false,
    mes: "FEV/2026"
  }]
}

✅ SALDO RECALCULADO PARA O MÊS CORRENTE: {
  mesCorrente: "FEV/2026",
  limite: 510,
  totalGastoNoMes: 0,
  totalSolicitacoesPendentes: 300,
  saldoDisponivel: 210
}
```

---

## 🎯 Benefícios da Correção

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Saldo mostrado** | ❌ Não deduz pendentes | ✅ Deduz pendentes |
| **Duplicação** | ❌ Permite | ✅ Bloqueia |
| **Validação** | ❌ Incorreta | ✅ Correta |
| **Experiência** | ❌ Confusa | ✅ Clara |

---

## ⚠️ Observações Importantes

1. A correção considera **apenas solicitações pendentes do mês corrente**
2. Solicitações aprovadas ou rejeitadas **não são deduzidas**
3. O cálculo usa `valor_descontar` ou `valor_a_descontar` (compatível com ambos os campos da API)
4. A função `loadSaldoData` é chamada automaticamente após cada solicitação bem-sucedida

---

## 📊 Fluxo Completo

```
1. Usuário abre "Nova Solicitação"
   ↓
2. loadSaldoData() é chamado
   ↓
3. Busca gastos do mês (sind.conta)
   ↓
4. Busca solicitações pendentes (ultimasSolicitacoes)
   ↓
5. Calcula: saldo = limite - gastos - pendentes
   ↓
6. Atualiza interface com saldo correto
   ↓
7. Valida valor solicitado contra saldo real
```

---

## ✅ Conclusão

Esta correção garante que o saldo disponível reflita **corretamente** a situação real do associado, evitando duplicação de solicitações e melhorando a experiência do usuário.
