<?php
/**
 * Script de Teste - Conexão com Banco
 * 
 * Use este script para verificar se o arquivo Adm/php/banco.php
 * está funcionando corretamente antes de configurar o webhook.
 * 
 * INSTRUÇÕES:
 * 1. Coloque este arquivo no mesmo diretório do webhook
 * 2. Acesse no navegador: https://seudominio.com/teste_conexao_banco.php
 * 3. Verifique se a conexão é bem-sucedida
 * 4. DELETE este arquivo após o teste (segurança)
 */

header('Content-Type: application/json; charset=utf-8');

echo "=== TESTE DE CONEXÃO COM BANCO ===\n\n";

try {
    // Verificar se arquivo de conexão existe
    if (!file_exists("Adm/php/banco.php")) {
        throw new Exception("❌ ERRO: Arquivo Adm/php/banco.php não encontrado");
    }
    echo "✅ Arquivo Adm/php/banco.php encontrado\n";

    // Incluir arquivo de conexão
    include "Adm/php/banco.php";
    echo "✅ Arquivo incluído com sucesso\n";

    // Verificar se classe existe
    if (!class_exists('Banco')) {
        throw new Exception("❌ ERRO: Classe 'Banco' não encontrada no arquivo");
    }
    echo "✅ Classe 'Banco' encontrada\n";

    // Verificar se método existe
    if (!method_exists('Banco', 'conectar_postgres')) {
        throw new Exception("❌ ERRO: Método 'conectar_postgres' não encontrado na classe Banco");
    }
    echo "✅ Método 'conectar_postgres' encontrado\n";

    // Tentar conectar
    echo "\n--- TESTANDO CONEXÃO ---\n";
    $pdo = Banco::conectar_postgres();
    
    if (!$pdo instanceof PDO) {
        throw new Exception("❌ ERRO: Método não retornou objeto PDO válido");
    }
    echo "✅ Objeto PDO criado com sucesso\n";

    // Configurar PDO
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ PDO configurado com tratamento de erros\n";

    // Testar query simples
    $stmt = $pdo->query("SELECT version()");
    $version = $stmt->fetchColumn();
    echo "✅ Conexão testada com sucesso\n";
    echo "📊 Versão PostgreSQL: " . $version . "\n";

    // Testar se tabela existe
    echo "\n--- TESTANDO TABELA ---\n";
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as total
        FROM information_schema.tables 
        WHERE table_schema = 'sind' 
        AND table_name = 'associados_sasmais'
    ");
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result['total'] > 0) {
        echo "✅ Tabela sind.associados_sasmais encontrada\n";
        
                 // Verificar colunas do webhook
         $stmt = $pdo->prepare("
             SELECT column_name 
             FROM information_schema.columns 
             WHERE table_schema = 'sind' 
             AND table_name = 'associados_sasmais'
             AND column_name IN ('event', 'doc_token', 'has_signed', 'signed_at', 'cel_informado')
         ");
        $stmt->execute();
        $webhookColumns = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        echo "📋 Colunas do webhook encontradas: " . implode(', ', $webhookColumns) . "\n";
        
                 if (count($webhookColumns) >= 5) {
             echo "✅ Tabela preparada para o webhook\n";
         } else {
             echo "⚠️  AVISO: Execute setup_table_webhook.sql para adicionar colunas do webhook\n";
         }
        
    } else {
        echo "❌ ERRO: Tabela sind.associados_sasmais não encontrada\n";
    }

    echo "\n=== RESULTADO FINAL ===\n";
    echo "🎉 SUCESSO! Conexão com banco funcionando perfeitamente\n";
    echo "✅ O webhook pode usar esta conexão\n\n";
    echo "PRÓXIMOS PASSOS:\n";
    echo "1. Configure o webhook na ZapSign\n";
    echo "2. Teste o webhook com curl\n";
    echo "3. DELETE este arquivo de teste\n";

} catch (Exception $e) {
    echo "\n=== ERRO ===\n";
    echo "💥 " . $e->getMessage() . "\n\n";
    echo "SOLUÇÕES:\n";
    echo "1. Verifique se o arquivo Adm/php/banco.php existe\n";
    echo "2. Verifique se a classe Banco está correta\n";
    echo "3. Verifique as permissões dos arquivos\n";
    echo "4. Verifique se o PostgreSQL está rodando\n";
    echo "5. Verifique as credenciais no arquivo banco.php\n";
}

echo "\n--- FIM DO TESTE ---\n";
?>

<!-- 
IMPORTANTE: DELETE ESTE ARQUIVO APÓS O TESTE!
Este arquivo expõe informações sobre sua estrutura de banco
e deve ser removido após verificar que tudo está funcionando.

Para deletar:
rm teste_conexao_banco.php

Ou via FTP/painel de controle do seu servidor.
--> 