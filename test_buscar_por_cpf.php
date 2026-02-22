<?php
// Script para buscar associado por CPF em vez de cartão
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== BUSCAR ASSOCIADO POR CPF ===\n\n";

include "Adm/php/banco.php";

$pdo = Banco::conectar_postgres();

if (!$pdo) {
    die("❌ ERRO: Falha na conexão com banco\n");
}

echo "✅ Conexão estabelecida\n\n";

// Buscar associado 023999 por CPF
$cpf = '02399513606';
echo "🔍 Buscando por CPF: $cpf\n\n";

$sql = "SELECT 
    a.id,
    a.codigo as matricula,
    a.nome,
    a.empregador,
    e.nome as empregador_nome,
    a.id_divisao,
    a.cpf,
    a.email,
    a.cel
FROM sind.associado a
LEFT JOIN sind.empregador e ON a.empregador = e.id
WHERE a.cpf = ?";

$stmt = $pdo->prepare($sql);
$stmt->execute([$cpf]);
$associado = $stmt->fetch(PDO::FETCH_ASSOC);

if ($associado) {
    echo "✅ ASSOCIADO ENCONTRADO POR CPF:\n";
    echo "  - ID: " . $associado['id'] . "\n";
    echo "  - Matrícula: " . $associado['matricula'] . "\n";
    echo "  - Nome: " . $associado['nome'] . "\n";
    echo "  - CPF: " . $associado['cpf'] . "\n";
    echo "  - Empregador: " . $associado['empregador'] . " (" . $associado['empregador_nome'] . ")\n";
    echo "  - ID Divisão: " . ($associado['id_divisao'] ?? 'NULL') . "\n";
    echo "  - Email: " . ($associado['email'] ?? 'N/A') . "\n";
    echo "  - Celular: " . ($associado['cel'] ?? 'N/A') . "\n";
} else {
    echo "❌ Associado NÃO encontrado por CPF\n";
}

// Verificar se existe tabela de cartões
echo "\n=== VERIFICANDO TABELA DE CARTÕES ===\n";
$sql_cartoes = "SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'sind' 
                AND table_name LIKE '%cart%'";
$stmt_cartoes = $pdo->query($sql_cartoes);
$tabelas_cartoes = $stmt_cartoes->fetchAll(PDO::FETCH_COLUMN);

if (count($tabelas_cartoes) > 0) {
    echo "📋 Tabelas relacionadas a cartões encontradas:\n";
    foreach ($tabelas_cartoes as $tabela) {
        echo "  - sind.$tabela\n";
    }
    
    // Tentar buscar o cartão em cada tabela
    foreach ($tabelas_cartoes as $tabela) {
        echo "\n🔍 Buscando cartão $cpf na tabela sind.$tabela:\n";
        try {
            $sql_busca = "SELECT * FROM sind.$tabela WHERE cod_verificacao = ? OR cpf = ? LIMIT 1";
            $stmt_busca = $pdo->prepare($sql_busca);
            $stmt_busca->execute([$cpf, $cpf]);
            $resultado = $stmt_busca->fetch(PDO::FETCH_ASSOC);
            
            if ($resultado) {
                echo "  ✅ ENCONTRADO!\n";
                echo "  Dados: " . json_encode($resultado, JSON_UNESCAPED_UNICODE) . "\n";
            } else {
                echo "  ❌ Não encontrado\n";
            }
        } catch (Exception $e) {
            echo "  ⚠️ Erro ao buscar: " . $e->getMessage() . "\n";
        }
    }
} else {
    echo "❌ Nenhuma tabela de cartões encontrada\n";
}

echo "\n=== FIM DO TESTE ===\n";
?>
