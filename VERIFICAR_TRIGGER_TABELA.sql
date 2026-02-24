-- Script para verificar em qual tabela a trigger está configurada

-- Ver todas as triggers do schema sind
SELECT 
    trigger_name,
    event_object_table as tabela,
    action_timing as quando,
    event_manipulation as evento
FROM information_schema.triggers
WHERE trigger_schema = 'sind'
  AND trigger_name LIKE '%taxa_cartao%'
ORDER BY event_object_table, trigger_name;

-- Ver especificamente a trigger fn_insere_taxa_cartao_automatica
SELECT 
    t.tgname AS trigger_name,
    c.relname AS tabela,
    p.proname AS funcao
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'sind'
  AND p.proname = 'fn_insere_taxa_cartao_automatica';
