<?php
// Script para encontrar o associado correto
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== BUSCAR DADOS REAIS DO ASSOCIADO 023999 ===\n\n";

include "Adm/php/banco.php";

$pdo = Banco::conectar_postgres();

if (!$pdo) {
    die("❌ ERRO: Falha na conexão com banco\n");
}

echo "✅ Conexão estabelecida\n\n";

// Buscar TODOS os associados com matrícula 023999
echo "=== BUSCANDO TODOS OS ASSOCIADOS COM MATRÍCULA 023999 ===\n";
$sql = "SELECT 
    a.id,
    a.codigo as matricula,
    a.nome,
    a.empregador,
    e.nome as empregador_nome,
    a.id_divisao
FROM sind.associado a
LEFT JOIN sind.empregador e ON a.empregador = e.id
WHERE a.codigo = '023999'";

$stmt = $pdo->query($sql);
$associados = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "📊 Total de associados encontrados: " . count($associados) . "\n\n";

if (count($associados) > 0) {
    foreach ($associados as $index => $assoc) {
        echo "--- ASSOCIADO " . ($index + 1) . " ---\n";
        echo "ID: " . $assoc['id'] . "\n";
        echo "Matrícula: " . $assoc['matricula'] . "\n";
        echo "Nome: " . $assoc['nome'] . "\n";
        echo "ID Empregador: " . $assoc['empregador'] . "\n";
        echo "Nome Empregador: " . ($assoc['empregador_nome'] ?? 'N/A') . "\n";
        echo "ID Divisão: " . ($assoc['id_divisao'] ?? 'NULL') . "\n";
        echo "\n";
    }
    
    // Verificar qual tem id_divisao = 2
    echo "=== VERIFICANDO QUAL TEM ID_DIVISAO = 2 ===\n";
    foreach ($associados as $assoc) {
        if ($assoc['id_divisao'] == 2) {
            echo "✅ ENCONTRADO COM ID_DIVISAO = 2:\n";
            echo "   ID: " . $assoc['id'] . "\n";
            echo "   Empregador: " . $assoc['empregador'] . "\n";
            echo "   ID Divisão: " . $assoc['id_divisao'] . "\n";
        }
    }
    
    // Verificar qual tem id_divisao = 1
    echo "\n=== VERIFICANDO QUAL TEM ID_DIVISAO = 1 ===\n";
    foreach ($associados as $assoc) {
        if ($assoc['id_divisao'] == 1) {
            echo "✅ ENCONTRADO COM ID_DIVISAO = 1:\n";
            echo "   ID: " . $assoc['id'] . "\n";
            echo "   Empregador: " . $assoc['empregador'] . "\n";
            echo "   ID Divisão: " . $assoc['id_divisao'] . "\n";
        }
    }
    
} else {
    echo "❌ Nenhum associado encontrado com matrícula 023999\n";
}

// Verificar estrutura da tabela associado
echo "\n=== ESTRUTURA DA TABELA sind.associado ===\n";
$sql_colunas = "SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_schema = 'sind' 
                AND table_name = 'associado' 
                AND column_name IN ('id', 'codigo', 'empregador', 'id_divisao', 'divisao')
                ORDER BY ordinal_position";
$stmt_colunas = $pdo->query($sql_colunas);
$colunas = $stmt_colunas->fetchAll(PDO::FETCH_ASSOC);

foreach ($colunas as $coluna) {
    echo "  - " . $coluna['column_name'] . " (" . $coluna['data_type'] . ") - Nullable: " . $coluna['is_nullable'] . "\n";
}

echo "\n=== FIM DO TESTE ===\n";
?>
