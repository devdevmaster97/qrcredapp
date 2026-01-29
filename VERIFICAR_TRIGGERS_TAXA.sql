-- ============================================
-- SCRIPT PARA VERIFICAR TRIGGERS NA TABELA sind.conta
-- ============================================
-- Este script identifica triggers que podem estar gravando
-- a taxa "Tarifa Cartao / Manutenção" automaticamente
-- ============================================

-- 1. Listar todos os triggers na tabela sind.conta
SELECT 
    '=== TRIGGERS NA TABELA sind.conta ===' as info;

SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'sind'
AND event_object_table = 'conta'
ORDER BY trigger_name;

-- 2. Ver definição completa dos triggers
SELECT 
    '=== DEFINIÇÃO COMPLETA DOS TRIGGERS ===' as info;

SELECT 
    pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'sind.conta'::regclass
AND tgname NOT LIKE 'pg_%'
ORDER BY tgname;

-- 3. Buscar triggers que mencionam "taxa" ou "249" no código
SELECT 
    '=== TRIGGERS QUE PODEM GRAVAR TAXA ===' as info;

SELECT 
    trigger_name,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'sind'
AND event_object_table = 'conta'
AND (
    LOWER(action_statement) LIKE '%taxa%'
    OR LOWER(action_statement) LIKE '%249%'
    OR LOWER(action_statement) LIKE '%cartao%'
)
ORDER BY trigger_name;

-- 4. Listar funções que podem ser chamadas por triggers
SELECT 
    '=== FUNÇÕES RELACIONADAS A TAXA ===' as info;

SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'sind'
AND (
    LOWER(routine_name) LIKE '%taxa%'
    OR LOWER(routine_name) LIKE '%cartao%'
)
ORDER BY routine_name;
