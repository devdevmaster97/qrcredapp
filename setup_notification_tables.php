<?php
/**
 * Script para criar as tabelas de push notifications
 * Execute uma única vez para configurar o sistema
 */

// Incluir o arquivo de conexão existente do sistema
if (!file_exists('Adm/php/banco.php')) {
    throw new Exception('Arquivo Adm/php/banco.php não encontrado. Verifique o caminho.');
}

require_once 'Adm/php/banco.php';

try {
    // Conectar usando o sistema existente
    /** @var PDO $pdo */
    /** @noinspection PhpUndefinedClassInspection */
    $pdo = Banco::conectar_postgres();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "<h1>🔧 Configuração das Tabelas de Push Notifications</h1>\n";
    echo "<pre>\n";
    
    // =============================================================================
    // 1. TABELA: notification_log (A que está faltando)
    // =============================================================================
    
    echo "1. Criando tabela notification_log...\n";
    
    $sql = "
    CREATE TABLE IF NOT EXISTS notification_log (
        id SERIAL PRIMARY KEY,
        user_card VARCHAR(50) NOT NULL,
        agendamento_id INTEGER,
        subscription_id INTEGER,
        tipo_notificacao VARCHAR(50) NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        mensagem TEXT NOT NULL,
        data_agendada TIMESTAMP,
        profissional VARCHAR(255),
        especialidade VARCHAR(255),
        convenio_nome VARCHAR(255),
        status VARCHAR(20) DEFAULT 'enviado',
        response_data JSONB,
        error_message TEXT,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );";
    
    $pdo->exec($sql);
    echo "✅ Tabela notification_log criada com sucesso!\n\n";
    
    // Criar índices
    echo "2. Criando índices para notification_log...\n";
    
    $indices = [
        "CREATE INDEX IF NOT EXISTS idx_notification_log_user_card ON notification_log(user_card);",
        "CREATE INDEX IF NOT EXISTS idx_notification_log_agendamento ON notification_log(agendamento_id);",
        "CREATE INDEX IF NOT EXISTS idx_notification_log_tipo ON notification_log(tipo_notificacao);",
        "CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);",
        "CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON notification_log(sent_at);"
    ];
    
    foreach ($indices as $indice) {
        $pdo->exec($indice);
    }
    echo "✅ Índices criados com sucesso!\n\n";
    
    // =============================================================================
    // 3. TABELA: notification_queue (Opcional)
    // =============================================================================
    
    echo "3. Criando tabela notification_queue...\n";
    
    $sql = "
    CREATE TABLE IF NOT EXISTS notification_queue (
        id SERIAL PRIMARY KEY,
        user_card VARCHAR(50) NOT NULL,
        agendamento_id INTEGER NOT NULL,
        tipo_notificacao VARCHAR(50) NOT NULL,
        data_agendada TIMESTAMP NOT NULL,
        profissional VARCHAR(255),
        especialidade VARCHAR(255),
        convenio_nome VARCHAR(255),
        scheduled_for TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
    );";
    
    $pdo->exec($sql);
    echo "✅ Tabela notification_queue criada com sucesso!\n\n";
    
    // Criar índices para notification_queue
    $indices_queue = [
        "CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);",
        "CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for);",
        "CREATE INDEX IF NOT EXISTS idx_notification_queue_user_card ON notification_queue(user_card);",
        "CREATE INDEX IF NOT EXISTS idx_notification_queue_agendamento ON notification_queue(agendamento_id);"
    ];
    
    foreach ($indices_queue as $indice) {
        $pdo->exec($indice);
    }
    echo "✅ Índices para notification_queue criados!\n\n";
    
    // =============================================================================
    // 4. VERIFICAÇÃO FINAL
    // =============================================================================
    
    echo "4. Verificação das tabelas criadas:\n";
    echo "=====================================\n";
    
    // push_subscriptions (já existia)
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM push_subscriptions");
    $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "✅ Tabela 'push_subscriptions': {$count} registros\n";
    
    // notification_log (recém criada)
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM notification_log");
    $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "✅ Tabela 'notification_log': {$count} registros\n";
    
    // notification_queue (recém criada)
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM notification_queue");
    $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "✅ Tabela 'notification_queue': {$count} registros\n";
    
    echo "\n=====================================\n";
    echo "🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!\n";
    echo "=====================================\n";
    echo "O sistema de push notifications está pronto!\n\n";
    
    echo "📋 Próximos passos:\n";
    echo "1. ✅ Tabelas criadas\n";
    echo "2. 🔧 Configurar chaves VAPID no frontend\n";
    echo "3. 🧪 Testar notificações\n";
    echo "4. ❌ DELETAR este arquivo (setup_notification_tables.php)\n\n";
    
    echo "</pre>\n";
    
} catch (PDOException $e) {
    echo "<h1>❌ Erro de Conexão com Banco</h1>\n";
    echo "<pre>";
    echo "Erro: " . $e->getMessage() . "\n";
    echo "Verifique:\n";
    echo "1. Se o arquivo Adm/php/banco.php existe\n";
    echo "2. Se a classe Banco tem o método conectar_postgres()\n";
    echo "3. Se as credenciais do banco estão corretas\n";
    echo "</pre>";
} catch (Exception $e) {
    echo "<h1>❌ Erro Geral</h1>\n";
    echo "<pre>";
    echo "Erro: " . $e->getMessage() . "\n";
    echo "</pre>";
}
?> 