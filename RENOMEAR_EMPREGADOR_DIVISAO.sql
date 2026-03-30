-- ============================================
-- RENOMEAÇÃO: empregador.divisao → id_divisao
-- ============================================
-- 
-- VERIFICAÇÃO PRÉVIA NECESSÁRIA:
-- Execute primeiro o script VERIFICAR_ESTRUTURA_EMPREGADOR.sql
-- para confirmar se a coluna ainda se chama 'divisao'
-- 
-- ============================================

-- PASSO 1: Verificar se coluna 'divisao' existe
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'sind' 
  AND table_name = 'empregador' 
  AND column_name = 'divisao';

-- Se o resultado acima mostrar a coluna 'divisao', execute a renomeação:

BEGIN;

-- PASSO 2: Renomear coluna divisao para id_divisao
ALTER TABLE sind.empregador 
RENAME COLUMN divisao TO id_divisao;

-- PASSO 3: Verificar se a renomeação foi bem-sucedida
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'sind' 
  AND table_name = 'empregador' 
  AND column_name = 'id_divisao';

-- PASSO 4: Verificar Foreign Keys (se existirem)
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'sind'
  AND tc.table_name = 'empregador'
  AND kcu.column_name = 'id_divisao';

-- Se tudo estiver OK, execute COMMIT
COMMIT;
-- ROLLBACK;

-- ============================================
-- IMPACTO NO CÓDIGO: NENHUM
-- ============================================
-- 
-- ANÁLISE REALIZADA:
-- - Nenhum arquivo PHP acessa empregador.divisao
-- - Todos os JOINs apenas buscam empregador.nome
-- - Nenhuma query usa WHERE/SELECT com empregador.divisao
-- 
-- CONCLUSÃO:
-- A renomeação pode ser feita sem impacto no código
-- 
-- ============================================
