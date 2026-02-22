<?php
// Script de teste para debug da gravação de antecipação
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== TESTE DE DEBUG - GRAVAÇÃO ANTECIPAÇÃO ===\n\n";

// Simular dados POST
$_POST = [
    'matricula' => '023999',
    'valor_pedido' => '500.00',
    'pass' => '251490', // Substitua pela senha real
    'request_id' => 'test_' . time(),
    'id' => '182',
    'empregador' => '30',
    'id_divisao' => '2',
    'mes_corrente' => 'MAR/2026',
    'celular' => '13996862020',
    'taxa' => '25.00',
    'valor_descontar' => '525.00',
    'chave_pix' => '02399513606',
    'convenio' => '221'
];

echo "📋 Dados POST simulados:\n";
print_r($_POST);
echo "\n";

// Incluir arquivo de conexão
include "Adm/php/banco.php";

if (!class_exists('Banco')) {
    die("❌ ERRO: Classe Banco não encontrada\n");
}

echo "✅ Classe Banco encontrada\n";

// Conectar ao banco
$pdo = Banco::conectar_postgres();

if (!$pdo) {
    die("❌ ERRO: Falha na conexão com banco\n");
}

echo "✅ Conexão com banco estabelecida\n\n";

// Testar query do associado
echo "=== TESTE 1: Buscar Associado ===\n";
$sql_associado = "
    SELECT 
        a.nome,
        a.codigo,
        e.nome as empregador_nome,
        a.empregador,
        a.id,
        a.id_divisao
    FROM sind.associado a
    LEFT JOIN sind.empregador e ON a.empregador = e.id
    WHERE a.codigo = ?
    AND a.id = ?
    AND a.empregador = ?
    AND a.id_divisao = ?
    LIMIT 1";

$stmt = $pdo->prepare($sql_associado);
$stmt->execute([
    $_POST['matricula'],
    $_POST['id'],
    $_POST['empregador'],
    $_POST['id_divisao']
]);

$associado = $stmt->fetch(PDO::FETCH_ASSOC);

if ($associado) {
    echo "✅ Associado encontrado:\n";
    print_r($associado);
} else {
    echo "❌ Associado NÃO encontrado\n";
    echo "Parâmetros usados:\n";
    echo "  - matricula: " . $_POST['matricula'] . "\n";
    echo "  - id: " . $_POST['id'] . "\n";
    echo "  - empregador: " . $_POST['empregador'] . "\n";
    echo "  - id_divisao: " . $_POST['id_divisao'] . "\n";
    die();
}

echo "\n=== TESTE 2: Verificar Senha ===\n";
$sql_senha = "SELECT COUNT(*) as total FROM sind.c_senhaassociado 
              WHERE cod_associado = ? AND senha = ? AND id_empregador = ? AND id_associado = ? AND id_divisao = ?";
$stmt_senha = $pdo->prepare($sql_senha);
$stmt_senha->execute([
    $_POST['matricula'],
    $_POST['pass'],
    $associado['empregador'],
    $associado['id'],
    $associado['id_divisao']
]);
$resultado_senha = $stmt_senha->fetch(PDO::FETCH_ASSOC);

if ($resultado_senha['total'] > 0) {
    echo "✅ Senha correta\n";
} else {
    echo "❌ Senha incorreta\n";
    die();
}

echo "\n=== TESTE 3: Verificar Estrutura da Tabela antecipacao ===\n";
$sql_colunas = "SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'sind' 
                AND table_name = 'antecipacao' 
                ORDER BY ordinal_position";
$stmt_colunas = $pdo->query($sql_colunas);
$colunas = $stmt_colunas->fetchAll(PDO::FETCH_ASSOC);

echo "Colunas da tabela sind.antecipacao:\n";
foreach ($colunas as $coluna) {
    echo "  - " . $coluna['column_name'] . " (" . $coluna['data_type'] . ")\n";
}

echo "\n=== TESTE 4: Verificar Estrutura da Tabela conta ===\n";
$sql_colunas_conta = "SELECT column_name, data_type 
                      FROM information_schema.columns 
                      WHERE table_schema = 'sind' 
                      AND table_name = 'conta' 
                      ORDER BY ordinal_position";
$stmt_colunas_conta = $pdo->query($sql_colunas_conta);
$colunas_conta = $stmt_colunas_conta->fetchAll(PDO::FETCH_ASSOC);

echo "Colunas da tabela sind.conta:\n";
foreach ($colunas_conta as $coluna) {
    echo "  - " . $coluna['column_name'] . " (" . $coluna['data_type'] . ")\n";
}

echo "\n=== TESTE CONCLUÍDO ===\n";
echo "Execute este script no servidor para verificar:\n";
echo "1. Se o associado é encontrado\n";
echo "2. Se a senha está correta\n";
echo "3. Quais colunas existem nas tabelas\n";
?>
