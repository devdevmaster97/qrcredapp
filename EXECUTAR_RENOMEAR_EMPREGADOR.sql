-- ============================================
-- RENOMEAÇÃO: empregador.divisao → id_divisao
-- ============================================
-- 
-- SITUAÇÃO ATUAL:
-- - Coluna: divisao (integer)
-- - FK: divisao_fk (empregador.divisao → divisao.id_divisao)
-- 
-- AÇÃO: Renomear coluna (FK será atualizada automaticamente)
-- 
-- ============================================

BEGIN;

-- PASSO 1: Renomear coluna divisao para id_divisao
-- A Foreign Key será automaticamente atualizada pelo PostgreSQL
ALTER TABLE sind.empregador 
RENAME COLUMN divisao TO id_divisao;

-- PASSO 2: Verificar se a renomeação foi bem-sucedida
SELECT 
    'Coluna renomeada com sucesso' as status,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'sind' 
  AND table_name = 'empregador' 
  AND column_name = 'id_divisao';

-- PASSO 3: Verificar se a Foreign Key foi atualizada automaticamente
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name as coluna_origem,
    ccu.table_name AS tabela_destino,
    ccu.column_name AS coluna_destino
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

-- PASSO 4: Verificar que a coluna antiga 'divisao' não existe mais
SELECT 
    column_name
FROM information_schema.columns
WHERE table_schema = 'sind' 
  AND table_name = 'empregador' 
  AND column_name = 'divisao';
-- Resultado esperado: 0 linhas

-- Se tudo estiver OK, execute COMMIT
COMMIT;
-- ROLLBACK;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- 
-- PASSO 2: Deve mostrar coluna 'id_divisao' (integer)
-- PASSO 3: Deve mostrar FK 'divisao_fk' apontando para id_divisao
-- PASSO 4: Deve retornar vazio (coluna 'divisao' não existe mais)
-- 
-- ============================================
-- IMPACTO NO CÓDIGO: NENHUM
-- ============================================
-- 
-- Nenhum arquivo PHP precisa ser atualizado porque:
-- - Nenhum código acessa empregador.divisao diretamente
-- - Todos os JOINs apenas buscam empregador.nome
-- 
-- ============================================
