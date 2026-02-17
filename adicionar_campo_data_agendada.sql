-- =====================================================
-- Script SQL: Adicionar campo data_pretendida na tabela de agendamento
-- Database: PostgreSQL
-- Descrição: Adiciona campo para armazenar a data/hora pretendida pelo usuário
-- Data: 2026-02-17
-- =====================================================

-- Verificar se a tabela de agendamento existe
-- (Tabela: sind.agendamento)

-- Passo 1: Adicionar coluna data_pretendida (TIMESTAMP WITH TIME ZONE)
-- Este campo armazenará a data e hora pretendida pelo usuário para o agendamento
ALTER TABLE sind.agendamento 
ADD COLUMN IF NOT EXISTS data_pretendida TIMESTAMP WITH TIME ZONE;

-- Passo 2: Adicionar comentário na coluna para documentação
COMMENT ON COLUMN sind.agendamento.data_pretendida IS 
'Data e hora pretendida pelo usuário para o agendamento. Formato ISO 8601 com timezone.';

-- Passo 3: Criar índice para melhorar performance de consultas por data
CREATE INDEX IF NOT EXISTS idx_agendamento_data_pretendida 
ON sind.agendamento(data_pretendida);

-- Passo 4: Adicionar índice composto para consultas por associado e data
CREATE INDEX IF NOT EXISTS idx_agendamento_associado_data_pretendida 
ON sind.agendamento(cod_associado, data_pretendida);

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
  AND table_name = 'agendamento' 
  AND column_name = 'data_pretendida';

-- Verificar índices criados
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'sind' 
  AND tablename = 'agendamento'
  AND indexname LIKE '%data_pretendida%';

-- Exemplo de consulta: Agendamentos futuros
SELECT 
    id,
    cod_associado,
    profissional,
    especialidade,
    data_solicitacao,
    data_pretendida,
    status
FROM sind.agendamento
WHERE data_pretendida IS NOT NULL
  AND data_pretendida > NOW()
ORDER BY data_pretendida ASC;

-- Exemplo de consulta: Agendamentos de hoje
SELECT 
    id,
    cod_associado,
    profissional,
    especialidade,
    data_pretendida,
    status
FROM sind.agendamento
WHERE data_pretendida::DATE = CURRENT_DATE
ORDER BY data_pretendida ASC;

-- =====================================================
-- ROLLBACK (caso necessário desfazer as alterações)
-- =====================================================

-- ATENÇÃO: Execute apenas se precisar reverter as alterações!
-- Descomentar as linhas abaixo para executar o rollback:

-- DROP INDEX IF EXISTS sind.idx_agendamento_data_pretendida;
-- DROP INDEX IF EXISTS sind.idx_agendamento_associado_data_pretendida;
-- ALTER TABLE sind.agendamento DROP COLUMN IF EXISTS data_pretendida;

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
   - Agendamentos antigos não terão data_pretendida preenchida
   - Novos agendamentos podem ou não ter data_pretendida (opcional)

3. ÍNDICES:
   - idx_agendamento_data_pretendida: Para consultas por data
   - idx_agendamento_associado_data_pretendida: Para consultas de agendamentos de um associado específico por data

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
     ALTER TABLE sind.agendamento 
     ADD CONSTRAINT chk_data_pretendida_futura 
     CHECK (data_pretendida IS NULL OR data_pretendida >= data_solicitacao);

7. TIMEZONE:
   - PostgreSQL armazena TIMESTAMP WITH TIME ZONE em UTC
   - Converte automaticamente para o timezone da sessão ao consultar
   - JavaScript Date.toISOString() já envia em UTC
*/

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
