-- ============================================
-- SCRIPT PARA DELETAR TAXAS DE CARTÃO DUPLICADAS
-- ============================================
-- Mantém apenas a PRIMEIRA taxa de cada mês/associado/divisão
-- Remove todas as outras
-- ============================================

BEGIN;

-- 1. MOSTRAR DUPLICATAS ANTES DE DELETAR
SELECT 
    '=== TAXAS DUPLICADAS QUE SERÃO DELETADAS ===' as info;

SELECT 
    lancamento,
    associado,
    empregador,
    mes,
    divisao,
    valor,
    data,
    hora,
    descricao,
    'SERÁ DELETADA' as status
FROM sind.conta
WHERE lancamento IN (
    -- Pegar todos os IDs EXCETO o primeiro de cada grupo
    SELECT UNNEST(todos_ids[2:array_length(todos_ids, 1)])
    FROM (
        SELECT 
            ARRAY_AGG(lancamento ORDER BY data, hora) as todos_ids
        FROM sind.conta
        WHERE convenio = 249
        AND divisao IS NOT NULL
        GROUP BY associado, empregador, mes, divisao
        HAVING COUNT(*) > 1
    ) duplicatas
)
ORDER BY associado, mes, data, hora;

-- 2. CONTAR QUANTAS SERÃO DELETADAS
SELECT 
    '=== RESUMO ===' as info,
    COUNT(*) as total_registros_a_deletar,
    SUM(valor) as valor_total_a_remover
FROM sind.conta
WHERE lancamento IN (
    SELECT UNNEST(todos_ids[2:array_length(todos_ids, 1)])
    FROM (
        SELECT 
            ARRAY_AGG(lancamento ORDER BY data, hora) as todos_ids
        FROM sind.conta
        WHERE convenio = 249
        AND divisao IS NOT NULL
        GROUP BY associado, empregador, mes, divisao
        HAVING COUNT(*) > 1
    ) duplicatas
);

-- 3. DELETAR AS DUPLICATAS
-- ATENÇÃO: Descomente a linha abaixo para executar a deleção
/*
DELETE FROM sind.conta
WHERE lancamento IN (
    SELECT UNNEST(todos_ids[2:array_length(todos_ids, 1)])
    FROM (
        SELECT 
            ARRAY_AGG(lancamento ORDER BY data, hora) as todos_ids
        FROM sind.conta
        WHERE convenio = 249
        AND divisao IS NOT NULL
        GROUP BY associado, empregador, mes, divisao
        HAVING COUNT(*) > 1
    ) duplicatas
);
*/

-- 4. VERIFICAR RESULTADO
SELECT 
    '=== VERIFICAÇÃO FINAL ===' as info,
    associado,
    empregador,
    mes,
    divisao,
    COUNT(*) as total_taxas_restantes,
    STRING_AGG(CAST(lancamento AS TEXT), ', ') as ids,
    STRING_AGG(descricao, ' | ') as descricoes
FROM sind.conta
WHERE convenio = 249
AND divisao IS NOT NULL
GROUP BY associado, empregador, mes, divisao
ORDER BY associado, mes;

-- Se tudo OK, descomente COMMIT. Caso contrário, mantenha ROLLBACK.
-- COMMIT;
ROLLBACK;
