-- ============================================
-- RENOMEAÇÃO: solicitacao_bloqueio.divisao → id_divisao
-- ============================================
-- 
-- IMPACTO: SEM IMPACTO NO CÓDIGO
-- Motivo: Tabela não é usada por nenhum arquivo PHP ou API
-- 
-- ============================================

BEGIN;

-- Renomear coluna divisao para id_divisao
ALTER TABLE sind.solicitacao_bloqueio 
RENAME COLUMN divisao TO id_divisao;

-- Verificar se a renomeação foi bem-sucedida
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'sind' 
  AND table_name = 'solicitacao_bloqueio' 
  AND column_name = 'id_divisao';

-- Se o resultado acima mostrar a coluna id_divisao, execute COMMIT
-- Caso contrário, execute ROLLBACK

COMMIT;
-- ROLLBACK;

-- ============================================
-- VERIFICAÇÃO ADICIONAL
-- ============================================

-- Verificar se a coluna antiga 'divisao' não existe mais
SELECT 
    column_name
FROM information_schema.columns
WHERE table_schema = 'sind' 
  AND table_name = 'solicitacao_bloqueio' 
  AND column_name = 'divisao';

-- Resultado esperado: 0 linhas (coluna não existe mais)

-- Verificar estrutura completa da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'sind' 
  AND table_name = 'solicitacao_bloqueio'
ORDER BY ordinal_position;
