-- ============================================
-- VERIFICAR EXISTÊNCIA DA TABELA qEstorno
-- ============================================

-- 1. Verificar se a tabela existe no schema 'sind'
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'sind' 
  AND LOWER(table_name) LIKE '%estorno%';

-- 2. Verificar todas as tabelas do schema 'sind' (para ver o nome correto)
SELECT 
    table_name
FROM information_schema.tables
WHERE table_schema = 'sind'
ORDER BY table_name;

-- 3. Verificar se existe em outro schema
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE LOWER(table_name) LIKE '%estorno%';

-- 4. Verificar views que contenham 'estorno'
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_type = 'VIEW'
  AND LOWER(table_name) LIKE '%estorno%';

-- ============================================
-- POSSÍVEIS CAUSAS DO ERRO:
-- ============================================
-- 
-- 1. Tabela não existe (foi deletada ou nunca foi criada)
-- 2. Nome da tabela está diferente (case-sensitive)
-- 3. Tabela está em outro schema
-- 4. É uma VIEW que foi deletada
-- 
-- ============================================
