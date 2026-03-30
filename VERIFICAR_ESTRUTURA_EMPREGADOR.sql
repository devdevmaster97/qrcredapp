-- ============================================
-- VERIFICAR ESTRUTURA DA TABELA EMPREGADOR
-- ============================================

-- 1. Verificar todas as colunas da tabela empregador
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'sind' 
  AND table_name = 'empregador'
ORDER BY ordinal_position;

-- 2. Verificar se existe coluna 'divisao'
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'sind' 
  AND table_name = 'empregador' 
  AND column_name = 'divisao';

-- 3. Verificar se existe coluna 'id_divisao'
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'sind' 
  AND table_name = 'empregador' 
  AND column_name = 'id_divisao';

-- 4. Verificar Foreign Keys da tabela empregador
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
  AND tc.table_name = 'empregador';
