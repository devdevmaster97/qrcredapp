<?php
/**
 * Script de Debug para Push Notifications
 * Execute este script para diagnosticar problemas
 */

header('Content-Type: text/html; charset=utf-8');
echo "<h1>🔍 Debug Push Notifications</h1>\n";
echo "<pre>\n";

echo "=====================================\n";
echo "1. VERIFICAÇÃO DE ARQUIVOS\n";
echo "=====================================\n";

// Verificar arquivos necessários
$arquivos = [
    'manage_push_subscriptions_app.php',
    'check_agendamentos_notifications_app.php', 
    'send_push_notification_app.php',
    'Adm/php/banco.php'
];

foreach ($arquivos as $arquivo) {
    if (file_exists($arquivo)) {
        echo "✅ {$arquivo} - EXISTS\n";
    } else {
        echo "❌ {$arquivo} - NOT FOUND\n";
    }
}

echo "\n=====================================\n";
echo "2. TESTE DE CONEXÃO COM BANCO\n";
echo "=====================================\n";

try {
    if (file_exists('Adm/php/banco.php')) {
        require_once 'Adm/php/banco.php';
        /** @noinspection PhpUndefinedClassInspection */
        /** @var PDO $pdo */
        $pdo = Banco::conectar_postgres();
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        echo "✅ Conexão com PostgreSQL: SUCESSO\n";
        
        // Testar query simples
        $stmt = $pdo->query("SELECT NOW() as timestamp");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "✅ Query de teste: {$result['timestamp']}\n";
        
    } else {
        echo "❌ Arquivo Adm/php/banco.php não encontrado\n";
    }
} catch (Exception $e) {
    echo "❌ Erro de conexão: {$e->getMessage()}\n";
}

echo "\n=====================================\n";
echo "3. VERIFICAÇÃO DE TABELAS\n";
echo "=====================================\n";

try {
    if (isset($pdo)) {
        $tabelas = ['push_subscriptions', 'notification_log', 'notification_queue'];
        
        foreach ($tabelas as $tabela) {
            try {
                $stmt = $pdo->query("SELECT COUNT(*) as count FROM {$tabela}");
                $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
                echo "✅ Tabela '{$tabela}': {$count} registros\n";
            } catch (PDOException $e) {
                echo "❌ Tabela '{$tabela}': ERRO - {$e->getMessage()}\n";
            }
        }
    }
} catch (Exception $e) {
    echo "❌ Erro ao verificar tabelas: {$e->getMessage()}\n";
}

echo "\n=====================================\n";
echo "4. TESTE DO ENDPOINT PHP\n";
echo "=====================================\n";

if (file_exists('manage_push_subscriptions_app.php')) {
    echo "✅ manage_push_subscriptions_app.php existe\n";
    
    // Simular uma requisição POST
    $_POST = [
        'action' => 'test',
        'user_card' => '123456'
    ];
    
    echo "🧪 Simulando requisição POST...\n";
    
    try {
        // Capturar output
        ob_start();
        include 'manage_push_subscriptions_app.php';
        $output = ob_get_clean();
        
        echo "📤 Output do PHP:\n";
        echo $output . "\n";
        
    } catch (Exception $e) {
        echo "❌ Erro ao executar PHP: {$e->getMessage()}\n";
    }
    
} else {
    echo "❌ manage_push_subscriptions_app.php NÃO EXISTE\n";
    echo "⚠️ Este arquivo é necessário para o sistema funcionar!\n";
}

echo "\n=====================================\n";
echo "5. LOGS DE ERROR_LOG\n";
echo "=====================================\n";

// Tentar ler últimas linhas do log de erros PHP
$logFiles = [
    '/var/log/php_errors.log',
    '/var/log/apache2/error.log', 
    '/var/log/nginx/error.log',
    '/tmp/php_errors.log',
    'error_log'
];

$foundLog = false;
foreach ($logFiles as $logFile) {
    if (file_exists($logFile) && is_readable($logFile)) {
        echo "📋 Últimas 10 linhas de: {$logFile}\n";
        echo "-----------------------------------\n";
        $lines = file($logFile);
        $lastLines = array_slice($lines, -10);
        foreach ($lastLines as $line) {
            echo htmlspecialchars($line);
        }
        echo "-----------------------------------\n\n";
        $foundLog = true;
        break;
    }
}

if (!$foundLog) {
    echo "⚠️ Nenhum arquivo de log encontrado nos locais padrão\n";
}

echo "\n=====================================\n";
echo "6. INFORMAÇÕES DO SERVIDOR\n";
echo "=====================================\n";

echo "PHP Version: " . phpversion() . "\n";
echo "Server Software: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'N/A') . "\n";
echo "Document Root: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'N/A') . "\n";
echo "Script Name: " . ($_SERVER['SCRIPT_NAME'] ?? 'N/A') . "\n";

echo "\n=====================================\n";
echo "🎯 RECOMENDAÇÕES\n";
echo "=====================================\n";

echo "1. ✅ Execute setup_notification_tables.php se alguma tabela não existir\n";
echo "2. ✅ Verifique se manage_push_subscriptions_app.php existe no servidor\n";
echo "3. ✅ Configure chaves VAPID reais no frontend\n";
echo "4. ✅ Verifique logs de erro do servidor web\n";
echo "5. ❌ DELETE este arquivo após o debug\n";

echo "\n=====================================\n";
echo "🔧 DEBUG CONCLUÍDO\n";
echo "=====================================\n";

echo "</pre>\n";
?>
