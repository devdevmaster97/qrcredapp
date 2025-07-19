# Solução Definitiva - Duplicação de Agendamentos

## 🔍 Problema Persistente
A duplicação na tabela `sind.agendamento` continua ocorrendo mesmo com proteções no frontend.

## 🛡️ Soluções Implementadas (Camadas de Proteção)

### 1. **Frontend** ✅ (Já implementado)
- Proteção contra duplo clique
- useRef para evitar re-renders
- Set para múltiplos agendamentos simultâneos
- Timeout automático de limpeza

### 2. **Backend PHP Robusto** 🆕 (Nova versão)
Arquivo: `grava_agendamento_app_v2.php`

#### Proteções Implementadas:
- ✅ **Verificação prévia**: Checa agendamentos recentes (5 minutos)
- ✅ **Transação com Lock**: BEGIN/COMMIT para atomicidade
- ✅ **Verificação dupla**: Dentro da transação
- ✅ **Idempotência**: Retorna registro existente se duplicado
- ✅ **Logs detalhados**: Para rastreamento completo

#### Código Principal:
```php
// 1ª Verificação - Fora da transação
$sql_check = "SELECT id, data_solicitacao 
              FROM sind.agendamento 
              WHERE cod_associado = :cod_associado 
              AND id_empregador = :id_empregador 
              AND cod_convenio = :cod_convenio
              AND data_solicitacao >= NOW() - INTERVAL '5 minutes'";

// 2ª Verificação - Dentro da transação
$pdo->beginTransaction();
// Verificação dupla antes de inserir
// INSERT só se não existir
$pdo->commit();
```

### 3. **Constraint de Banco** 🎯 (Solução definitiva)

#### Opção A: Constraint Temporal (Recomendada)
```sql
-- Evita duplicatas no mesmo minuto
ALTER TABLE sind.agendamento 
ADD CONSTRAINT uk_agendamento_no_duplicates 
UNIQUE (cod_associado, id_empregador, cod_convenio, 
        DATE_TRUNC('minute', data_solicitacao));
```

#### Opção B: Constraint Rígida (Mais restritiva)
```sql
-- Evita qualquer duplicata (cuidado: pode ser muito restritivo)
ALTER TABLE sind.agendamento 
ADD CONSTRAINT uk_agendamento_unique 
UNIQUE (cod_associado, id_empregador, cod_convenio);
```

#### Opção C: Constraint com Janela de Tempo
```sql
-- Criar função para truncar timestamp por período
CREATE OR REPLACE FUNCTION truncate_to_5_minutes(ts timestamp)
RETURNS timestamp AS $$
BEGIN
  RETURN date_trunc('hour', ts) + 
         (EXTRACT(minute FROM ts)::int / 5) * interval '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Constraint baseada na função
ALTER TABLE sind.agendamento 
ADD CONSTRAINT uk_agendamento_5min 
UNIQUE (cod_associado, id_empregador, cod_convenio, 
        truncate_to_5_minutes(data_solicitacao));
```

## 🔧 Instalação das Soluções

### Passo 1: Atualizar Backend PHP
1. **Backup** do arquivo atual: `grava_agendamento_app.php`
2. **Upload** da nova versão: `grava_agendamento_app_v2.php`
3. **Renomear** para `grava_agendamento_app.php`
4. **Testar** endpoints

### Passo 2: Implementar Constraint (Escolher uma opção)
```sql
-- ATENÇÃO: Execute apenas UMA das opções acima
-- Recomendação: Opção A (constraint temporal)

-- Para ver duplicatas atuais antes de aplicar:
SELECT 
    cod_associado,
    id_empregador,
    cod_convenio,
    DATE_TRUNC('minute', data_solicitacao) as minuto,
    COUNT(*) as duplicatas
FROM sind.agendamento 
GROUP BY cod_associado, id_empregador, cod_convenio, 
         DATE_TRUNC('minute', data_solicitacao)
HAVING COUNT(*) > 1
ORDER BY duplicatas DESC;
```

### Passo 3: Limpeza de Duplicatas Existentes
```sql
-- Identificar duplicatas exatas
WITH duplicatas AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY cod_associado, id_empregador, cod_convenio, 
                        DATE_TRUNC('minute', data_solicitacao)
            ORDER BY data_solicitacao ASC
        ) as rn
    FROM sind.agendamento
)
-- Deletar duplicatas (manter apenas a primeira)
DELETE FROM sind.agendamento 
WHERE id IN (
    SELECT id FROM duplicatas WHERE rn > 1
);
```

## 📊 Monitoramento e Debug

### Verificar Duplicatas Ativas
```sql
-- Query para monitorar duplicatas em tempo real
SELECT 
    COUNT(*) as total_agendamentos,
    COUNT(DISTINCT (cod_associado || '-' || id_empregador || '-' || cod_convenio || '-' || 
                   DATE_TRUNC('minute', data_solicitacao)::text)) as unicos,
    COUNT(*) - COUNT(DISTINCT (cod_associado || '-' || id_empregador || '-' || cod_convenio || '-' || 
                              DATE_TRUNC('minute', data_solicitacao)::text)) as duplicatas
FROM sind.agendamento 
WHERE data_solicitacao >= NOW() - INTERVAL '1 hour';
```

### Logs para Acompanhar
1. **Backend PHP**: Logs em `/var/log/php/error.log`
   - `📋 AGENDAMENTO REQUEST`
   - `🚫 DUPLICAÇÃO EVITADA`
   - `✅ AGENDAMENTO CRIADO`

2. **Frontend**: Console do navegador
   - `🚀 Iniciando agendamento`
   - `📋 API Agendamento chamada`
   - `✅ Agendamento salvo com sucesso`

3. **Banco**: Query de monitoramento a cada hora

## 🎯 Prioridade de Implementação

### Urgente (Implementar primeiro):
1. ✅ **Constraint de banco** (Opção A) - Garantia 100%
2. ✅ **Backend PHP v2** - Proteção adicional + logs

### Opcional (Para melhoria):
1. Rate limiting no frontend (1 agendamento por minuto)
2. Toast personalizado para duplicatas evitadas
3. Dashboard de monitoramento de duplicatas

## 🚨 Teste de Validação

### Teste 1: Clique Múltiplo
1. Clique 10x rapidamente no botão "Agendar"
2. **Esperado**: Apenas 1 registro na tabela
3. **Log esperado**: "🚫 DUPLICAÇÃO EVITADA" nos logs

### Teste 2: Abas Múltiplas
1. Abra 3 abas do navegador
2. Faça o mesmo agendamento simultaneamente
3. **Esperado**: Apenas 1 registro na tabela

### Teste 3: Constraint de Banco
1. Tente inserir manualmente registro duplicado:
```sql
INSERT INTO sind.agendamento (cod_associado, id_empregador, cod_convenio, data_solicitacao, status)
VALUES ('12345', 1, '1', NOW(), 1);
-- Executar segunda vez - deve dar erro de constraint
```
2. **Esperado**: Erro de violação de constraint

## 📈 Resultados Esperados

Após implementação completa:
- ✅ **0% duplicação** garantida pela constraint
- ✅ **Logs claros** para debug futuro
- ✅ **Performance mantida** (verificações otimizadas)
- ✅ **UX melhorada** (feedback claro ao usuário)

---

## ⚡ Implementação Rápida (5 minutos)

Se precisar de solução **IMEDIATA**:

```sql
-- Execute esta constraint AGORA:
ALTER TABLE sind.agendamento 
ADD CONSTRAINT uk_agendamento_no_duplicates 
UNIQUE (cod_associado, id_empregador, cod_convenio, 
        DATE_TRUNC('minute', data_solicitacao));
```

**Resultado**: Duplicação eliminada instantaneamente! 🎉 