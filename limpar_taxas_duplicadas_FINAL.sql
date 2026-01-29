-- ============================================
-- SCRIPT PARA LIMPAR TAXAS DE CARTÃO DUPLICADAS
-- ============================================
-- Este script mantém apenas a PRIMEIRA taxa lançada por mês/associado/divisão
-- e remove as duplicatas (independente da descrição)
-- ============================================

BEGIN;

-- 1. Mostrar TODAS as taxas existentes (para análise)
SELECT 
    '=== TODAS AS TAXAS NO BANCO ===' as info,
    lancamento,
    associado,
    empregador,
    mes,
    divisao,
    valor,
    data,
    hora,
    descricao
FROM sind.conta
WHERE convenio = 249  -- SASCRED-MT-TAXA-CARTAO
ORDER BY associado, mes, data, hora;

-- 2. Identificar taxas duplicadas (mais de 1 por mês/associado/divisão)
WITH taxas_duplicadas AS (
    SELECT 
        associado,
        empregador,
        mes,
        divisao,
        COUNT(*) as total_taxas,
        MIN(lancamento) as primeira_taxa_id,
        ARRAY_AGG(lancamento ORDER BY data, hora) as todos_ids,
        ARRAY_AGG(descricao ORDER BY data, hora) as todas_descricoes
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
        td.todas_descricoes,
        UNNEST(td.todos_ids[2:array_length(td.todos_ids, 1)]) as taxa_id_deletar
    FROM taxas_duplicadas td
)
SELECT 
    '=== TAXAS QUE SERÃO DELETADAS ===' as info,
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

-- 3. Mostrar resumo antes de deletar
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

-- 4. Mostrar detalhes das descrições encontradas
SELECT 
    '=== DESCRIÇÕES ENCONTRADAS ===' as info,
    descricao,
    COUNT(*) as quantidade
FROM sind.conta
WHERE convenio = 249
GROUP BY descricao
ORDER BY quantidade DESC;

-- 5. DELETAR AS TAXAS DUPLICADAS (mantém apenas a primeira)
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

-- 6. Verificar resultado após deleção
SELECT 
    '=== VERIFICAÇÃO PÓS-DELEÇÃO ===' as info,
    associado,
    empregador,
    mes,
    divisao,
    COUNT(*) as total_taxas_restantes,
    STRING_AGG(CAST(lancamento AS TEXT), ', ') as ids_restantes,
    STRING_AGG(descricao, ' | ') as descricoes_restantes
FROM sind.conta
WHERE convenio = 249
AND divisao IS NOT NULL
GROUP BY associado, empregador, mes, divisao
ORDER BY associado, mes;

-- 7. Verificar se ainda há duplicatas
SELECT 
    '=== VERIFICAÇÃO FINAL - DUPLICATAS RESTANTES ===' as info,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NENHUMA DUPLICATA ENCONTRADA'
        ELSE '⚠️ AINDA HÁ ' || COUNT(*) || ' DUPLICATAS'
    END as resultado
FROM (
    SELECT 
        associado,
        empregador,
        mes,
        divisao,
        COUNT(*) as total
    FROM sind.conta
    WHERE convenio = 249
    AND divisao IS NOT NULL
    GROUP BY associado, empregador, mes, divisao
    HAVING COUNT(*) > 1
) duplicatas_restantes;

-- Se tudo estiver OK, faça COMMIT. Caso contrário, faça ROLLBACK.
-- COMMIT;
ROLLBACK;
