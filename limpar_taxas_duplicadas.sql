-- ============================================
-- SCRIPT PARA LIMPAR TAXAS DE CARTÃO DUPLICADAS
-- ============================================
-- Este script mantém apenas a PRIMEIRA taxa lançada por mês/associado/divisão
-- e remove as duplicatas
-- ============================================

BEGIN;

-- 1. Identificar taxas duplicadas (mais de 1 por mês/associado/divisão)
WITH taxas_duplicadas AS (
    SELECT 
        associado,
        empregador,
        mes,
        divisao,
        COUNT(*) as total_taxas,
        MIN(lancamento) as primeira_taxa_id,
        ARRAY_AGG(lancamento ORDER BY data, hora) as todos_ids
    FROM sind.conta
    WHERE convenio = 249  -- SASCRED-MT-TAXA-CARTAO
    AND divisao IS NOT NULL
    GROUP BY associado, empregador, mes, divisao
    HAVING COUNT(*) > 1
),
taxas_para_deletar AS (
    SELECT 
        td.associado,
        td.empregador,
        td.mes,
        td.divisao,
        td.total_taxas,
        td.primeira_taxa_id,
        UNNEST(td.todos_ids[2:array_length(td.todos_ids, 1)]) as taxa_id_deletar
    FROM taxas_duplicadas td
)
SELECT 
    c.lancamento,
    c.associado,
    c.empregador,
    c.mes,
    c.divisao,
    c.valor,
    c.data,
    c.hora,
    c.descricao,
    'SERÁ DELETADA' as status
FROM sind.conta c
INNER JOIN taxas_para_deletar tpd ON c.lancamento = tpd.taxa_id_deletar
ORDER BY c.associado, c.mes, c.data, c.hora;

-- 2. Mostrar resumo antes de deletar
SELECT 
    '=== RESUMO DE TAXAS DUPLICADAS ===' as info,
    COUNT(DISTINCT c.associado) as total_associados_afetados,
    COUNT(DISTINCT CONCAT(c.associado, '-', c.mes)) as total_meses_com_duplicacao,
    COUNT(*) as total_registros_a_deletar,
    SUM(c.valor) as valor_total_a_remover
FROM sind.conta c
INNER JOIN (
    SELECT 
        td.associado,
        td.empregador,
        td.mes,
        td.divisao,
        UNNEST(td.todos_ids[2:array_length(td.todos_ids, 1)]) as taxa_id_deletar
    FROM (
        SELECT 
            associado,
            empregador,
            mes,
            divisao,
            ARRAY_AGG(lancamento ORDER BY data, hora) as todos_ids
        FROM sind.conta
        WHERE convenio = 249
        AND divisao IS NOT NULL
        GROUP BY associado, empregador, mes, divisao
        HAVING COUNT(*) > 1
    ) td
) tpd ON c.lancamento = tpd.taxa_id_deletar;

-- 3. DELETAR AS TAXAS DUPLICADAS (mantém apenas a primeira)
-- ATENÇÃO: Descomente as linhas abaixo para executar a deleção
/*
DELETE FROM sind.conta
WHERE lancamento IN (
    SELECT 
        UNNEST(td.todos_ids[2:array_length(td.todos_ids, 1)]) as taxa_id_deletar
    FROM (
        SELECT 
            associado,
            empregador,
            mes,
            divisao,
            ARRAY_AGG(lancamento ORDER BY data, hora) as todos_ids
        FROM sind.conta
        WHERE convenio = 249
        AND divisao IS NOT NULL
        GROUP BY associado, empregador, mes, divisao
        HAVING COUNT(*) > 1
    ) td
);
*/

-- 4. Verificar resultado após deleção
SELECT 
    '=== VERIFICAÇÃO PÓS-DELEÇÃO ===' as info,
    associado,
    empregador,
    mes,
    divisao,
    COUNT(*) as total_taxas_restantes
FROM sind.conta
WHERE convenio = 249
AND divisao IS NOT NULL
GROUP BY associado, empregador, mes, divisao
ORDER BY associado, mes;

-- Se tudo estiver OK, faça COMMIT. Caso contrário, faça ROLLBACK.
-- COMMIT;
ROLLBACK;
