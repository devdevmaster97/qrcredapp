-- =====================================================
-- Script de Configuração da Tabela para Webhook ZapSign
-- =====================================================
-- 
-- Este script adiciona as colunas necessárias para receber
-- dados do webhook da ZapSign na tabela sind.associados_sasmais
--
-- INSTRUÇÕES:
-- 1. Conecte-se ao banco PostgreSQL como superusuário
-- 2. Execute este script: \i setup_table_webhook.sql
-- 3. Verifique se todas as colunas foram criadas corretamente
--

-- Conectar ao banco correto (ajustar se necessário)
\c qrcred;

-- Verificar se a tabela existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'sind' 
                   AND table_name = 'associados_sasmais') THEN
        RAISE NOTICE 'ATENÇÃO: Tabela sind.associados_sasmais não existe!';
        RAISE NOTICE 'Por favor, crie a tabela principal antes de executar este script.';
        RAISE EXCEPTION 'Tabela não encontrada';
    END IF;
END $$;

-- Adicionar colunas necessárias para o webhook (se não existirem)
ALTER TABLE sind.associados_sasmais 
ADD COLUMN IF NOT EXISTS event VARCHAR(50) COMMENT 'Tipo de evento do webhook (ex: doc_signed)',
ADD COLUMN IF NOT EXISTS doc_token VARCHAR(255) COMMENT 'Token único do documento na ZapSign',
ADD COLUMN IF NOT EXISTS doc_name VARCHAR(500) COMMENT 'Nome do documento assinado',
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP COMMENT 'Data/hora da assinatura digital',
ADD COLUMN IF NOT EXISTS name VARCHAR(255) COMMENT 'Nome do signatário conforme ZapSign',
ADD COLUMN IF NOT EXISTS email VARCHAR(255) COMMENT 'Email do signatário conforme ZapSign',
ADD COLUMN IF NOT EXISTS cpf VARCHAR(11) COMMENT 'CPF do signatário (apenas números)',
ADD COLUMN IF NOT EXISTS has_signed INTEGER DEFAULT 0 COMMENT 'Se o documento foi assinado (0=não, 1=sim)',
ADD COLUMN IF NOT EXISTS cel_informado VARCHAR(20) COMMENT 'Celular informado na assinatura';

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_associados_sasmais_cpf 
ON sind.associados_sasmais(cpf);

CREATE INDEX IF NOT EXISTS idx_associados_sasmais_doc_token 
ON sind.associados_sasmais(doc_token);

CREATE INDEX IF NOT EXISTS idx_associados_sasmais_event 
ON sind.associados_sasmais(event);

CREATE INDEX IF NOT EXISTS idx_associados_sasmais_has_signed 
ON sind.associados_sasmais(has_signed);

CREATE INDEX IF NOT EXISTS idx_associados_sasmais_signed_at 
ON sind.associados_sasmais(signed_at);

-- Verificar a estrutura da tabela
\echo ''
\echo '======================================================'
\echo 'ESTRUTURA ATUAL DA TABELA sind.associados_sasmais'
\echo '======================================================'

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'sind' 
  AND table_name = 'associados_sasmais'
ORDER BY ordinal_position;

-- Verificar índices criados
\echo ''
\echo '======================================================'
\echo 'ÍNDICES DA TABELA sind.associados_sasmais'
\echo '======================================================'

SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'sind' 
  AND tablename = 'associados_sasmais'
  AND indexname LIKE 'idx_associados_sasmais_%';

-- Consulta de exemplo para verificar dados
\echo ''
\echo '======================================================'
\echo 'EXEMPLO DE CONSULTA - ÚLTIMAS ASSINATURAS'
\echo '======================================================'

SELECT 
    codigo,
    nome,
    email,
    cpf,
    has_signed,
    signed_at,
    event,
    doc_token
FROM sind.associados_sasmais 
WHERE event = 'doc_signed' 
  AND has_signed = 1
ORDER BY signed_at DESC 
LIMIT 5;

-- Consulta para verificar registros sem assinatura
\echo ''
\echo '======================================================'
\echo 'REGISTROS AGUARDANDO ASSINATURA'
\echo '======================================================'

SELECT 
    COUNT(*) as total_aguardando_assinatura
FROM sind.associados_sasmais 
WHERE aceitou_termo = 1 
  AND (has_signed IS NULL OR has_signed = 0);

-- Estatísticas gerais
\echo ''
\echo '======================================================'
\echo 'ESTATÍSTICAS GERAIS'
\echo '======================================================'

SELECT 
    COUNT(*) as total_registros,
    COUNT(CASE WHEN aceitou_termo = 1 THEN 1 END) as aceitaram_termo,
    COUNT(CASE WHEN has_signed = 1 THEN 1 END) as assinaram_documento,
    COUNT(CASE WHEN autorizado = 1 THEN 1 END) as autorizados
FROM sind.associados_sasmais;

-- Verificar se há duplicatas por CPF
\echo ''
\echo '======================================================'
\echo 'VERIFICAÇÃO DE DUPLICATAS POR CPF'
\echo '======================================================'

SELECT 
    cpf,
    COUNT(*) as quantidade
FROM sind.associados_sasmais 
WHERE cpf IS NOT NULL 
  AND cpf != ''
GROUP BY cpf 
HAVING COUNT(*) > 1
ORDER BY quantidade DESC;

-- Comandos úteis para monitoramento
\echo ''
\echo '======================================================'
\echo 'COMANDOS ÚTEIS PARA MONITORAMENTO'
\echo '======================================================'
\echo ''
\echo '-- Ver assinaturas por dia:'
\echo 'SELECT DATE(signed_at) as data, COUNT(*) as assinaturas'
\echo 'FROM sind.associados_sasmais'
\echo 'WHERE event = ''doc_signed'''
\echo 'GROUP BY DATE(signed_at)'
\echo 'ORDER BY data DESC;'
\echo ''
\echo '-- Ver últimas assinaturas:'
\echo 'SELECT nome, email, cpf, signed_at, doc_name'
\echo 'FROM sind.associados_sasmais'
\echo 'WHERE has_signed = 1'
\echo 'ORDER BY signed_at DESC'
\echo 'LIMIT 10;'
\echo ''
\echo '-- Verificar registros com problemas:'
\echo 'SELECT codigo, nome, cpf, event, has_signed, signed_at'
\echo 'FROM sind.associados_sasmais'
\echo 'WHERE event IS NOT NULL'
\echo '  AND (cpf IS NULL OR cpf = '''');'

\echo ''
\echo '======================================================'
\echo 'CONFIGURAÇÃO CONCLUÍDA!'
\echo '======================================================'
\echo 'A tabela está pronta para receber dados do webhook ZapSign.'
\echo 'Próximos passos:'
\echo '1. Configurar o arquivo webhook_zapsign_config.php'
\echo '2. Fazer upload dos arquivos PHP para o servidor'
\echo '3. Configurar o webhook na ZapSign'
\echo '4. Testar com o comando curl fornecido na documentação'
\echo '======================================================' 