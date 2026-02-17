-- =====================================================
-- Script SQL: Adicionar campo data_agendada na tabela de agendamentos
-- Database: PostgreSQL
-- Descrição: Adiciona campo para armazenar a data/hora desejada do agendamento
-- Data: 2026-02-17
-- =====================================================

-- Verificar se a tabela de agendamentos existe
-- (Assumindo que a tabela está no schema 'sind' e se chama 'agendamentos')
-- Ajuste o nome da tabela conforme necessário

-- Passo 1: Adicionar coluna data_agendada (TIMESTAMP WITH TIME ZONE)
-- Este campo armazenará a data e hora que o usuário deseja para o agendamento
ALTER TABLE sind.agendamentos 
ADD COLUMN IF NOT EXISTS data_agendada TIMESTAMP WITH TIME ZONE;

-- Passo 2: Adicionar comentário na coluna para documentação
COMMENT ON COLUMN sind.agendamentos.data_agendada IS 
'Data e hora desejada pelo usuário para o agendamento. Formato ISO 8601 com timezone.';

-- Passo 3: Criar índice para melhorar performance de consultas por data
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_agendada 
ON sind.agendamentos(data_agendada);

-- Passo 4: Adicionar índice composto para consultas por associado e data
CREATE INDEX IF NOT EXISTS idx_agendamentos_associado_data 
ON sind.agendamentos(cod_associado, data_agendada);

-- =====================================================
-- VERIFICAÇÕES E CONSULTAS ÚTEIS
-- =====================================================

-- Verificar se a coluna foi criada corretamente
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'sind' 
  AND table_name = 'agendamentos' 
  AND column_name = 'data_agendada';

-- Verificar índices criados
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'sind' 
  AND tablename = 'agendamentos'
  AND indexname LIKE '%data_agendada%';

-- Exemplo de consulta: Agendamentos futuros
SELECT 
    id,
    cod_associado,
    profissional,
    especialidade,
    data_solicitacao,
    data_agendada,
    status
FROM sind.agendamentos
WHERE data_agendada IS NOT NULL
  AND data_agendada > NOW()
ORDER BY data_agendada ASC;

-- Exemplo de consulta: Agendamentos de hoje
SELECT 
    id,
    cod_associado,
    profissional,
    especialidade,
    data_agendada,
    status
FROM sind.agendamentos
WHERE data_agendada::DATE = CURRENT_DATE
ORDER BY data_agendada ASC;

-- =====================================================
-- ROLLBACK (caso necessário desfazer as alterações)
-- =====================================================

-- ATENÇÃO: Execute apenas se precisar reverter as alterações!
-- Descomentar as linhas abaixo para executar o rollback:

-- DROP INDEX IF EXISTS sind.idx_agendamentos_data_agendada;
-- DROP INDEX IF EXISTS sind.idx_agendamentos_associado_data;
-- ALTER TABLE sind.agendamentos DROP COLUMN IF EXISTS data_agendada;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

/*
1. TIPO DE DADOS:
   - TIMESTAMP WITH TIME ZONE: Armazena data/hora com informação de timezone
   - Ideal para aplicações que podem ter usuários em diferentes fusos horários
   - O JavaScript envia em formato ISO 8601: "2026-02-17T14:30:00.000Z"

2. NULLABLE:
   - Campo é NULLABLE (permite NULL)
   - Agendamentos antigos não terão data_agendada preenchida
   - Novos agendamentos podem ou não ter data_agendada (opcional)

3. ÍNDICES:
   - idx_agendamentos_data_agendada: Para consultas por data
   - idx_agendamentos_associado_data: Para consultas de agendamentos de um associado específico por data

4. PERFORMANCE:
   - Os índices melhoram significativamente a performance de consultas
   - Especialmente útil para:
     * Listar agendamentos futuros
     * Buscar agendamentos de um dia específico
     * Ordenar agendamentos por data

5. COMPATIBILIDADE:
   - Script compatível com PostgreSQL 9.5+
   - Usa IF NOT EXISTS para evitar erros se executado múltiplas vezes
   - Seguro para executar em produção

6. VALIDAÇÃO NO BACKEND:
   - O frontend já valida que a data não pode ser no passado
   - Considere adicionar uma CHECK CONSTRAINT no banco se desejar:
     ALTER TABLE sind.agendamentos 
     ADD CONSTRAINT chk_data_agendada_futura 
     CHECK (data_agendada IS NULL OR data_agendada >= data_solicitacao);

7. TIMEZONE:
   - PostgreSQL armazena TIMESTAMP WITH TIME ZONE em UTC
   - Converte automaticamente para o timezone da sessão ao consultar
   - JavaScript Date.toISOString() já envia em UTC
*/

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
