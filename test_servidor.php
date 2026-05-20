<?php
// Script de teste para diagnosticar erro 500 no servidor
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== TESTE DE DIAGNÓSTICO ===\n\n";

// Teste 1: PHP está funcionando?
echo "✅ PHP está funcionando!\n";
echo "Versão PHP: " . phpversion() . "\n\n";

// Teste 2: Arquivo banco.php existe?
echo "--- Teste 2: Verificando banco.php ---\n";
if (file_exists('../../Adm/php/banco.php')) {
    echo "✅ Arquivo ../../Adm/php/banco.php existe\n";
    try {
        require_once '../../Adm/php/banco.php';
        echo "✅ banco.php incluído com sucesso\n";
        
        // Teste 3: Conexão com banco funciona?
        echo "\n--- Teste 3: Testando conexão com banco ---\n";
        try {
            $pdo = Banco::conectar_postgres();
            echo "✅ Conexão com banco estabelecida\n";
            echo "Driver: " . $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) . "\n";
            
            // Teste 4: Tabela existe?
            echo "\n--- Teste 4: Verificando tabela seguro_beneficiarios ---\n";
            $stmt = $pdo->query("SELECT COUNT(*) FROM sind.seguro_beneficiarios");
            $count = $stmt->fetchColumn();
            echo "✅ Tabela sind.seguro_beneficiarios existe\n";
            echo "Total de registros: $count\n";
            
            // Teste 5: Colunas corretas?
            echo "\n--- Teste 5: Verificando estrutura da tabela ---\n";
            $stmt = $pdo->query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'sind' AND table_name = 'seguro_beneficiarios' ORDER BY ordinal_position");
            $colunas = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo "Colunas encontradas:\n";
            foreach ($colunas as $coluna) {
                echo "  - $coluna\n";
            }
            
            // Verificar se id_beneficiario existe
            if (in_array('id_beneficiario', $colunas)) {
                echo "✅ Coluna id_beneficiario existe\n";
            } else {
                echo "❌ Coluna id_beneficiario NÃO existe\n";
            }
            
        } catch (Exception $e) {
            echo "❌ ERRO ao conectar/consultar banco: " . $e->getMessage() . "\n";
        }
        
    } catch (Exception $e) {
        echo "❌ ERRO ao incluir banco.php: " . $e->getMessage() . "\n";
    }
} else {
    echo "❌ Arquivo Adm/php/banco.php NÃO existe\n";
    echo "Caminho atual: " . getcwd() . "\n";
    echo "Arquivos no diretório atual:\n";
    $files = scandir('.');
    foreach ($files as $file) {
        if ($file != '.' && $file != '..') {
            echo "  - $file\n";
        }
    }
}

echo "\n=== FIM DO TESTE ===\n";
