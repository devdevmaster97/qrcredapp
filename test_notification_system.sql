-- ========================================
-- SCRIPT DE TESTE: Sistema de Notificações
-- ========================================
-- Execute este script para diagnosticar problemas de notificação
-- ========================================

-- 1️⃣ VERIFICAR SUBSCRIPTION DO USUÁRIO
-- Substitua 'NUMERO_DO_CARTAO' pelo número do cartão do usuário
SELECT 
    '1. VERIFICAR SUBSCRIPTION' as etapa,
    COUNT(*) as total_subscriptions,
    COUNT(CASE WHEN is_active = true THEN 1 END) as subscriptions_ativas
FROM push_subscriptions
WHERE user_card = 'NUMERO_DO_CARTAO';

-- Detalhes da subscription
SELECT 
    id,
    user_card,
    endpoint,
    is_active,
    settings,
    created_at,
    updated_at
FROM push_subscriptions
WHERE user_card = 'NUMERO_DO_CARTAO'
ORDER BY created_at DESC;

-- ========================================

-- 2️⃣ VERIFICAR AGENDAMENTO
-- Substitua ID_AGENDAMENTO pelo ID do agendamento que foi salvo
SELECT 
    '2. VERIFICAR AGENDAMENTO' as etapa,
    id,
    cod_associado,
    profissional,
    especialidade,
    convenio_nome,
    data_agendada,
    status,
    notification_sent_confirmado,
    notification_sent_24h,
    notification_sent_1h,
    data_solicitacao
FROM sind.agendamento
WHERE id = ID_AGENDAMENTO;

-- ========================================

-- 3️⃣ VERIFICAR AGENDAMENTOS PENDENTES DE NOTIFICAÇÃO
-- Busca agendamentos que deveriam ser notificados
SELECT 
    '3. AGENDAMENTOS PENDENTES' as etapa,
    a.id,
    a.cod_associado,
    a.profissional,
    a.especialidade,
    a.data_agendada,
    a.status,
    a.notification_sent_confirmado,
    -- Buscar número do cartão do associado
    (SELECT numero FROM sind.associado WHERE matricula = a.cod_associado LIMIT 1) as numero_cartao
FROM sind.agendamento a
WHERE a.data_agendada IS NOT NULL
  AND a.status = 2  -- Confirmado
  AND a.notification_sent_confirmado = false
ORDER BY a.data_agendada DESC
LIMIT 10;

-- ========================================

-- 4️⃣ VERIFICAR LOGS DE NOTIFICAÇÃO
-- Substitua ID_AGENDAMENTO pelo ID do agendamento
SELECT 
    '4. LOGS DE NOTIFICAÇÃO' as etapa,
    id,
    user_card,
    notification_type,
    agendamento_id,
    sent_at,
    success,
    error_message,
    response_data
FROM notification_log
WHERE agendamento_id = ID_AGENDAMENTO
ORDER BY sent_at DESC;

-- Últimas 10 notificações enviadas (qualquer agendamento)
SELECT 
    '4b. ÚLTIMAS NOTIFICAÇÕES' as etapa,
    id,
    user_card,
    notification_type,
    agendamento_id,
    sent_at,
    success,
    error_message
FROM notification_log
ORDER BY sent_at DESC
LIMIT 10;

-- ========================================

-- 5️⃣ ESTATÍSTICAS GERAIS
SELECT 
    '5. ESTATÍSTICAS' as etapa,
    (SELECT COUNT(*) FROM push_subscriptions WHERE is_active = true) as total_subscriptions_ativas,
    (SELECT COUNT(*) FROM sind.agendamento WHERE notification_sent_confirmado = false AND data_agendada IS NOT NULL AND status = 2) as agendamentos_pendentes_notificacao,
    (SELECT COUNT(*) FROM notification_log WHERE sent_at > NOW() - INTERVAL '24 hours') as notificacoes_ultimas_24h,
    (SELECT COUNT(*) FROM notification_log WHERE sent_at > NOW() - INTERVAL '24 hours' AND success = true) as notificacoes_sucesso_24h,
    (SELECT COUNT(*) FROM notification_log WHERE sent_at > NOW() - INTERVAL '24 hours' AND success = false) as notificacoes_erro_24h;

-- ========================================

-- 6️⃣ RESETAR FLAGS DE NOTIFICAÇÃO (SE NECESSÁRIO)
-- ATENÇÃO: Execute apenas se precisar reenviar notificação
-- Substitua ID_AGENDAMENTO pelo ID do agendamento

-- DESCOMENTE AS LINHAS ABAIXO PARA EXECUTAR:
-- UPDATE sind.agendamento
-- SET notification_sent_confirmado = false,
--     notification_sent_24h = false,
--     notification_sent_1h = false
-- WHERE id = ID_AGENDAMENTO;

-- ========================================

-- 7️⃣ VERIFICAR ESTRUTURA DAS TABELAS
-- Confirma que todas as colunas necessárias existem

SELECT 
    '7. ESTRUTURA TABELA agendamento' as etapa,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'sind'
  AND table_name = 'agendamento'
  AND column_name IN (
    'notification_sent_confirmado',
    'notification_sent_24h',
    'notification_sent_1h',
    'data_agendada'
  )
ORDER BY column_name;

SELECT 
    '7b. ESTRUTURA TABELA push_subscriptions' as etapa,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'push_subscriptions'
ORDER BY ordinal_position;

-- ========================================
-- FIM DO SCRIPT DE TESTE
-- ========================================

-- 📋 INSTRUÇÕES:
-- 1. Substitua 'NUMERO_DO_CARTAO' pelo número do cartão do usuário
-- 2. Substitua ID_AGENDAMENTO pelo ID do agendamento testado
-- 3. Execute todas as queries na ordem
-- 4. Anote os resultados de cada etapa
-- 5. Compare com os resultados esperados no arquivo DEBUG_NOTIFICACOES_NAO_CHEGAM.md
