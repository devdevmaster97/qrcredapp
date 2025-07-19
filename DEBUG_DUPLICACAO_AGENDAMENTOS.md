# Debug - Duplicação de Agendamentos

## 🔍 Problema Reportado
Ao clicar no botão "Agendar" está gravando duas vezes, duplicando o registro de agendamento na tabela `sind.agendamento`.

## 🛡️ Proteções Implementadas

### 1. **Proteção no Frontend** ✅
- **Estado duplo**: `agendandoIds` (Set) + `processingRef` (useRef)
- **Verificação imediata**: Bloqueia cliques enquanto processa
- **Timeout automático**: Limpa estados órfãos após 30s
- **Logs detalhados**: Console logs para rastreamento

### 2. **Proteção na API** ✅
- **Logs de rastreamento**: Registra todas as chamadas à API
- **Validação de dados**: Verifica dados obrigatórios
- **Logs de resposta**: Rastreia sucesso/erro do backend

### 3. **Interface Visual** ✅
- **Botão desabilitado**: Fica cinza durante processamento
- **Spinner visual**: Mostra "Agendando..." com animação
- **Feedback imediato**: Usuário vê que está processando

## 🔧 Como Debugar

### Passo 1: Verificar Logs do Browser
Abra DevTools (F12) → Console e procure por:

```
🚀 Iniciando agendamento: [ID_PROFISSIONAL]
📋 API Agendamento chamada: {dados}
✅ Agendamento salvo com sucesso: [ID_REGISTRO]
✅ Finalizando agendamento: [ID_PROFISSIONAL]
```

**Se aparecer duas vezes cada log = Frontend está chamando a API duas vezes**

### Passo 2: Verificar Network Tab
DevTools → Network → Procure por:
- `/api/agendamento` (múltiplas chamadas = problema no frontend)
- `grava_agendamento_app.php` (múltiplas chamadas = problema na API)

### Passo 3: Verificar Banco de Dados
```sql
-- Ver agendamentos recentes
SELECT 
    id, 
    cod_associado, 
    data_solicitacao, 
    profissional,
    especialidade 
FROM sind.agendamento 
WHERE data_solicitacao >= NOW() - INTERVAL '1 hour'
ORDER BY data_solicitacao DESC;

-- Verificar duplicatas exatas
SELECT 
    cod_associado,
    profissional,
    especialidade,
    COUNT(*) as duplicatas
FROM sind.agendamento 
WHERE data_solicitacao >= NOW() - INTERVAL '1 hour'
GROUP BY cod_associado, profissional, especialidade
HAVING COUNT(*) > 1;
```

## 🚨 Possíveis Causas

### 1. **React Strict Mode** (Desenvolvimento)
- **Sintoma**: Dobra execuções em desenvolvimento
- **Solução**: Normal em dev, não acontece em produção

### 2. **Clique Duplo Muito Rápido**
- **Sintoma**: Usuário clica antes da proteção ativar
- **Solução**: ✅ Implementado (proteção imediata)

### 3. **Problema no Backend PHP**
- **Sintoma**: API chamada uma vez, mas grava duas vezes
- **Verificação**: Logs do servidor PHP
- **Solução**: Revisar `grava_agendamento_app.php`

### 4. **Timeout/Retry Automático**
- **Sintoma**: Axios retry em caso de erro
- **Verificação**: Ver Network Tab para retries
- **Solução**: Configurar axios timeout adequadamente

### 5. **Múltiplas Instâncias do Componente**
- **Sintoma**: Componente renderizado duas vezes
- **Verificação**: Console logs duplicados
- **Solução**: Verificar structure da aplicação

## 🔨 Soluções Avançadas

### Se o problema persistir, implementar:

#### 1. **Idempotência no Backend**
```php
// Em grava_agendamento_app.php
$sql_check = "SELECT id FROM sind.agendamento 
              WHERE cod_associado = :cod_associado 
              AND profissional = :profissional
              AND data_solicitacao >= NOW() - INTERVAL '5 minutes'";

// Se encontrar registro recente, não gravar novamente
```

#### 2. **Debounce no Frontend**
```typescript
// Adicionar debounce de 2 segundos
const debouncedHandleAgendar = useMemo(
  () => debounce(handleAgendar, 2000),
  []
);
```

#### 3. **Token Único por Requisição**
```typescript
// Gerar token único
const requestToken = crypto.randomUUID();
// Enviar com a requisição
// Backend verifica se token já foi usado
```

## 📊 Monitoramento

### Logs para Acompanhar:
1. **Browser Console**: Logs de 🚀, 📋, ✅
2. **Network Tab**: Quantidade de chamadas
3. **Server Logs**: Logs do PHP (error_log)
4. **Banco**: Registros duplicados

### Métricas:
- **Taxa de duplicação**: (Agendamentos duplicados / Total) * 100
- **Tempo médio de processamento**: Da chamada até o finally
- **Falhas de rede**: Timeouts e erros HTTP

## ⚡ Teste Rápido

Para testar se as proteções estão funcionando:

1. **Teste de clique duplo**: Clique rapidamente 5x no botão
   - ✅ **Esperado**: Apenas 1 agendamento gravado
   - ❌ **Problema**: Múltiplos agendamentos

2. **Teste de timing**: Clique, aguarde 1s, clique novamente
   - ✅ **Esperado**: Primeiro clique processa, segundo é ignorado
   - ❌ **Problema**: Ambos processam

3. **Teste de network lenta**: Simular rede lenta (DevTools)
   - ✅ **Esperado**: Botão fica desabilitado até completar
   - ❌ **Problema**: Permite novos cliques

## 📞 Se Tudo Falhar

1. **Adicionar constraint UNIQUE** na tabela:
```sql
ALTER TABLE sind.agendamento 
ADD CONSTRAINT uk_agendamento_recente 
UNIQUE (cod_associado, profissional, especialidade, 
        DATE_TRUNC('minute', data_solicitacao));
```

2. **Implementar queue/job** para processamento assíncrono

3. **Adicionar rate limiting** no backend (1 agendamento por minuto)

---

## 🎯 Status Atual
- ✅ **Proteção Frontend**: Implementada (dupla verificação)
- ✅ **Logs de Debug**: Implementados
- ✅ **Interface Visual**: Feedback claro
- ⏳ **Teste em Produção**: Aguardando validação

**Próximo passo**: Testar em produção e monitorar logs para identificar a causa raiz. 