<?php
/**
 * Visualizador de Logs de Debug - Seguro Beneficiários
 * Acesse via: http://localhost:porta/debug_seguro_logs.php
 * ou via IP local: http://192.168.x.x:porta/debug_seguro_logs.php
 */

header('Content-Type: text/html; charset=utf-8');

$log_file = __DIR__ . '/debug_seguro_beneficiarios.log';

// Limpar logs se solicitado
if (isset($_GET['clear'])) {
    file_put_contents($log_file, '');
    header('Location: debug_seguro_logs.php');
    exit;
}

// Auto-refresh a cada 2 segundos se solicitado
$auto_refresh = isset($_GET['auto']) ? true : false;
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Debug - Seguro Beneficiários</title>
    <?php if ($auto_refresh): ?>
    <meta http-equiv="refresh" content="2">
    <?php endif; ?>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Courier New', monospace;
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 10px;
            font-size: 12px;
        }
        .header {
            background: #2d2d30;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 15px;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .header h1 {
            font-size: 18px;
            margin-bottom: 10px;
            color: #4ec9b0;
        }
        .controls {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .btn {
            padding: 8px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            text-decoration: none;
            display: inline-block;
            color: white;
        }
        .btn-primary {
            background: #0e639c;
        }
        .btn-danger {
            background: #d32f2f;
        }
        .btn-success {
            background: #388e3c;
        }
        .log-container {
            background: #1e1e1e;
            border: 1px solid #3e3e42;
            border-radius: 5px;
            padding: 15px;
            max-height: calc(100vh - 200px);
            overflow-y: auto;
        }
        .log-line {
            padding: 4px 0;
            border-bottom: 1px solid #2d2d30;
            word-wrap: break-word;
        }
        .log-line:last-child {
            border-bottom: none;
        }
        .emoji {
            margin-right: 5px;
        }
        .error {
            color: #f48771;
        }
        .success {
            color: #4ec9b0;
        }
        .warning {
            color: #dcdcaa;
        }
        .info {
            color: #9cdcfe;
        }
        .empty {
            text-align: center;
            padding: 40px;
            color: #858585;
        }
        .status {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 11px;
            margin-left: 10px;
        }
        .status.on {
            background: #388e3c;
        }
        .status.off {
            background: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Debug - Seguro Beneficiários</h1>
        <div class="controls">
            <a href="?auto=1" class="btn btn-primary">
                🔄 Auto-Refresh ON
                <span class="status <?php echo $auto_refresh ? 'on' : 'off'; ?>">
                    <?php echo $auto_refresh ? 'ATIVO' : 'OFF'; ?>
                </span>
            </a>
            <a href="debug_seguro_logs.php" class="btn btn-success">🔃 Atualizar Agora</a>
            <a href="?clear=1" class="btn btn-danger" onclick="return confirm('Limpar todos os logs?')">🗑️ Limpar Logs</a>
        </div>
    </div>

    <div class="log-container">
        <?php
        if (file_exists($log_file)) {
            $logs = file_get_contents($log_file);
            if (trim($logs) === '') {
                echo '<div class="empty">📭 Nenhum log ainda. Faça uma requisição para gerar logs.</div>';
            } else {
                $lines = explode("\n", $logs);
                $lines = array_reverse($lines); // Mais recentes primeiro
                
                foreach ($lines as $line) {
                    if (trim($line) === '') continue;
                    
                    $class = 'log-line';
                    if (strpos($line, '❌') !== false || strpos($line, 'ERRO') !== false) {
                        $class .= ' error';
                    } elseif (strpos($line, '✅') !== false || strpos($line, 'sucesso') !== false) {
                        $class .= ' success';
                    } elseif (strpos($line, '⚠️') !== false || strpos($line, 'ALERTA') !== false) {
                        $class .= ' warning';
                    } else {
                        $class .= ' info';
                    }
                    
                    echo '<div class="' . $class . '">' . htmlspecialchars($line) . '</div>';
                }
            }
        } else {
            echo '<div class="empty">📭 Arquivo de log não encontrado. Aguardando primeira requisição...</div>';
        }
        ?>
    </div>

    <script>
        // Auto-scroll para o topo (logs mais recentes)
        window.scrollTo(0, 0);
    </script>
</body>
</html>
