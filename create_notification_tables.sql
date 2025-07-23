-- =====================================================
-- Script de Criação das Tabelas para Push Notifications
-- =====================================================
-- 
-- Este script cria todas as tabelas necessárias para o sistema
-- de notificações push para agendamentos
--

-- Conectar ao banco correto (ajustar se necessário)
-- \c qrcred;

-- =============================================================================
-- 1. TABELA: push_subscriptions
-- =============================================================================
-- Armazena as inscrições de push notification dos usuários

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_card VARCHAR(50) NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh VARCHAR(255) NOT NULL,
    auth VARCHAR(255) NOT NULL,
    settings JSONB DEFAULT '{"enabled":true,"agendamentoConfirmado":true,"lembrete24h":true,"lembrete1h":true}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_card ON push_subscriptions(user_card);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- =============================================================================
-- 2. TABELA: notification_log
-- =============================================================================
-- Registra todas as notificações enviadas para auditoria e controle

CREATE TABLE IF NOT EXISTS notification_log (
    id SERIAL PRIMARY KEY,
    user_card VARCHAR(50) NOT NULL,
    agendamento_id INTEGER,
    subscription_id INTEGER REFERENCES push_subscriptions(id) ON DELETE SET NULL,
    tipo_notificacao VARCHAR(50) NOT NULL, -- 'agendamento_confirmado', 'lembrete_24h', 'lembrete_1h'
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    data_agendada TIMESTAMP,
    profissional VARCHAR(255),
    especialidade VARCHAR(255),
    convenio_nome VARCHAR(255),
    status VARCHAR(20) DEFAULT 'enviado', -- 'enviado', 'erro', 'cancelado'
    response_data JSONB, -- Resposta da API de push notification
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notification_log_user_card ON notification_log(user_card);
CREATE INDEX IF NOT EXISTS idx_notification_log_agendamento ON notification_log(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_tipo ON notification_log(tipo_notificacao);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON notification_log(sent_at);

-- =============================================================================
-- 3. TABELA: notification_queue (Opcional - para sistema de fila)
-- =============================================================================
-- Fila de notificações a serem processadas

CREATE TABLE IF NOT EXISTS notification_queue (
    id SERIAL PRIMARY KEY,
    user_card VARCHAR(50) NOT NULL,
    agendamento_id INTEGER NOT NULL,
    tipo_notificacao VARCHAR(50) NOT NULL,
    data_agendada TIMESTAMP NOT NULL,
    profissional VARCHAR(255),
    especialidade VARCHAR(255),
    convenio_nome VARCHAR(255),
    scheduled_for TIMESTAMP NOT NULL, -- Quando deve ser enviada
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed'
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_card ON notification_queue(user_card);
CREATE INDEX IF NOT EXISTS idx_notification_queue_agendamento ON notification_queue(agendamento_id);

-- =============================================================================
-- 4. TRIGGERS PARA AUTO-UPDATE de updated_at
-- =============================================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para push_subscriptions
DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para notification_queue
DROP TRIGGER IF EXISTS update_notification_queue_updated_at ON notification_queue;
CREATE TRIGGER update_notification_queue_updated_at
    BEFORE UPDATE ON notification_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 5. CONSULTAS DE VERIFICAÇÃO
-- =============================================================================

-- Verificar estrutura das tabelas criadas
\echo ''
\echo '======================================================'
\echo 'VERIFICAÇÃO DAS TABELAS CRIADAS'
\echo '======================================================'

-- Tabela push_subscriptions
\echo ''
\echo '--- TABELA: push_subscriptions ---'
SELECT COUNT(*) as total_subscriptions FROM push_subscriptions;

-- Tabela notification_log
\echo ''
\echo '--- TABELA: notification_log ---'
SELECT COUNT(*) as total_logs FROM notification_log;

-- Tabela notification_queue
\echo ''
\echo '--- TABELA: notification_queue ---'
SELECT COUNT(*) as total_queue FROM notification_queue;

-- =============================================================================
-- 6. EXEMPLOS DE INSERÇÃO PARA TESTE
-- =============================================================================

-- Exemplo de subscription (comentado)
/*
INSERT INTO push_subscriptions (user_card, endpoint, p256dh, auth, settings) VALUES 
('123456', 
 'https://fcm.googleapis.com/fcm/send/exemplo123', 
 'exemplo_p256dh_key_aqui', 
 'exemplo_auth_key_aqui',
 '{"enabled":true,"agendamentoConfirmado":true,"lembrete24h":true,"lembrete1h":true}');
*/

-- Exemplo de log de notificação (comentado)
/*
INSERT INTO notification_log (user_card, agendamento_id, tipo_notificacao, titulo, mensagem, data_agendada, profissional, convenio_nome) VALUES 
('123456', 
 1, 
 'agendamento_confirmado', 
 '📅 Agendamento Confirmado!', 
 'Seu agendamento foi confirmado para amanhã às 14:00', 
 NOW() + INTERVAL '1 day',
 'Dr. João Silva',
 'Convênio Teste');
*/

-- =============================================================================
-- 7. CONSULTAS ÚTEIS PARA MONITORAMENTO
-- =============================================================================

\echo ''
\echo '======================================================'
\echo 'CONSULTAS ÚTEIS PARA MONITORAMENTO'
\echo '======================================================'

-- Subscriptions ativas por usuário
\echo ''
\echo '--- Subscriptions Ativas ---'
SELECT 
    user_card,
    COUNT(*) as total_subscriptions,
    MAX(created_at) as ultima_subscription
FROM push_subscriptions 
WHERE is_active = true
GROUP BY user_card
ORDER BY total_subscriptions DESC;

-- Notificações enviadas nas últimas 24h
\echo ''
\echo '--- Notificações Últimas 24h ---'
SELECT 
    tipo_notificacao,
    status,
    COUNT(*) as total,
    DATE_TRUNC('hour', sent_at) as hora
FROM notification_log 
WHERE sent_at >= NOW() - INTERVAL '24 hours'
GROUP BY tipo_notificacao, status, DATE_TRUNC('hour', sent_at)
ORDER BY hora DESC;

-- Usuários com mais notificações
\echo ''
\echo '--- Top 10 Usuários com Mais Notificações ---'
SELECT 
    user_card,
    COUNT(*) as total_notifications,
    COUNT(DISTINCT tipo_notificacao) as tipos_diferentes,
    MAX(sent_at) as ultima_notificacao
FROM notification_log 
GROUP BY user_card
ORDER BY total_notifications DESC
LIMIT 10;

\echo ''
\echo '======================================================'
\echo 'TABELAS CRIADAS COM SUCESSO!'
\echo '======================================================'
\echo 'Próximos passos:'
\echo '1. Executar os scripts PHP de gerenciamento'
\echo '2. Configurar as chaves VAPID no frontend'
\echo '3. Testar o sistema de notificações'
\echo '======================================================' 