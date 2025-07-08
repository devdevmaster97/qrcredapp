<?php
/**
 * Configuração do Webhook ZapSign
 * 
 * INSTRUÇÕES DE INSTALAÇÃO:
 * 
 * 1. Configurar este arquivo com suas credenciais de banco
 * 2. Fazer upload dos arquivos webhook_zapsign.php e este arquivo para seu servidor
 * 3. Configurar o webhook na ZapSign:
 *    - Acesse: https://app.zapsign.com.br/dashboard/api
 *    - Vá em "Webhooks"
 *    - Adicione novo webhook com a URL: https://seudominio.com/webhook_zapsign.php
 *    - Selecione os eventos: "doc_signed" (documento assinado)
 * 
 * 4. Testar o webhook:
 *    - Envie um documento de teste na ZapSign
 *    - Assine o documento
 *    - Verifique os logs em webhook_zapsign.log
 *    - Verifique se os dados foram gravados na tabela sind.associados_sasmais
 */

// =============================================================================
// CONFIGURAÇÕES DO BANCO DE DADOS POSTGRESQL
// =============================================================================

// ATENÇÃO: Este webhook usa o arquivo de conexão existente do sistema
// Arquivo: Adm/php/banco.php
// Classe: Banco::conectar_postgres()
// 
// Não é necessário configurar credenciais aqui, pois serão usadas
// as configurações já existentes no seu sistema.

// =============================================================================
// CONFIGURAÇÕES DE SEGURANÇA (OPCIONAL)
// =============================================================================

// Token de segurança para validar requisições (opcional)
// Deixe vazio para desabilitar validação de token
define('WEBHOOK_SECRET_TOKEN', ''); 

// IPs permitidos para fazer requisições ao webhook (opcional)
// Deixe vazio para permitir qualquer IP
// Formato: ['IP1', 'IP2', '192.168.1.0/24']
define('ALLOWED_IPS', []);

// =============================================================================
// CONFIGURAÇÕES DE LOG
// =============================================================================

// Habilitar logs detalhados (true para desenvolvimento, false para produção)
define('ENABLE_DEBUG_LOGS', true);

// Arquivo de log (caminho relativo ao webhook_zapsign.php)
define('LOG_FILE', __DIR__ . '/webhook_zapsign.log');

// Tamanho máximo do arquivo de log em bytes (0 = sem limite)
define('MAX_LOG_SIZE', 10 * 1024 * 1024); // 10MB

// =============================================================================
// CONFIGURAÇÕES DA TABELA
// =============================================================================

// Nome da tabela onde serão gravados os dados
define('TABLE_NAME', 'sind.associados_sasmais');

// Mapeamento de campos (não alterar sem necessidade)
define('FIELD_MAPPING', [
    'event' => 'event',
    'doc_token' => 'doc_token', 
    'doc_name' => 'doc_name',
    'signed_at' => 'signed_at',
    'signer_name' => 'name',
    'signer_email' => 'email',
    'signer_cpf' => 'cpf',
    'has_signed' => 'has_signed',
    'cel_informado' => 'cel_informado'
]);

// =============================================================================
// EXEMPLO DE TESTE DO WEBHOOK
// =============================================================================

/**
 * Para testar o webhook manualmente, você pode usar este comando curl:
 * 
 * curl -X POST https://seudominio.com/webhook_zapsign.php \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "event": "doc_signed",
 *     "doc_token": "13a2a55a-teste-xxxx-xxxx-82dd3d2abdc9",
 *     "doc_name": "Contrato de teste.pdf",
 *     "signed_at": "2024-12-19T16:59:20.627892-03:00",
 *     "signers": [
 *       {
 *         "name": "Teste Silva",
 *         "email": "teste@email.com",
 *         "cpf": "12345678901",
 *         "has_signed": true,
 *         "signed_at": "2024-12-19T16:59:18-03:00"
 *       }
 *     ]
 *   }'
 */

// =============================================================================
// VERIFICAÇÃO DA ESTRUTURA DA TABELA
// =============================================================================

/**
 * A tabela sind.associados_sasmais deve ter pelo menos estas colunas:
 * 
 * CREATE TABLE IF NOT EXISTS sind.associados_sasmais (
 *     id SERIAL PRIMARY KEY,
 *     codigo VARCHAR(50),
 *     nome VARCHAR(255),
 *     celular VARCHAR(20),
 *     data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *     autorizado INTEGER DEFAULT 0,
 *     aceitou_termo INTEGER DEFAULT 0,
 *     event VARCHAR(50),
 *     doc_token VARCHAR(255),
 *     doc_name VARCHAR(500),
 *     signed_at TIMESTAMP,
 *     name VARCHAR(255),
 *     email VARCHAR(255),
 *     cpf VARCHAR(11),
 *     has_signed INTEGER DEFAULT 0,
 *     cel_informado VARCHAR(20)
 * );
 */

// =============================================================================
// MONITORAMENTO E ALERTAS (OPCIONAL)
// =============================================================================

// Email para receber alertas de erro (opcional)
define('ALERT_EMAIL', '');

// Webhook para notificações (ex: Slack, Discord) (opcional) 
define('ALERT_WEBHOOK_URL', '');

/**
 * Função para enviar alertas (implementar conforme necessário)
 */
function sendAlert($message, $level = 'info') {
    if (ALERT_EMAIL && $level === 'error') {
        // Implementar envio de email
        // mail(ALERT_EMAIL, 'Webhook ZapSign - Erro', $message);
    }
    
    if (ALERT_WEBHOOK_URL && $level === 'error') {
        // Implementar notificação via webhook
        // file_get_contents(ALERT_WEBHOOK_URL, false, stream_context_create([
        //     'http' => [
        //         'method' => 'POST',
        //         'header' => 'Content-Type: application/json',
        //         'content' => json_encode(['text' => $message])
        //     ]
        // ]));
    }
}

// =============================================================================
// STATUS DO WEBHOOK
// =============================================================================

/**
 * Para verificar o status do webhook, acesse:
 * https://seudominio.com/webhook_zapsign.php?status=1
 * 
 * Isso retornará informações sobre a configuração e conexão com o banco
 */
?> 