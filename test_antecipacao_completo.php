<?php
// Script de teste completo para debug da antecipação
header('Content-Type: application/json; charset=utf-8');

echo "=== TESTE COMPLETO DE ANTECIPAÇÃO ===\n\n";

// Simular dados da requisição COM DADOS CORRETOS
$_POST = [
    'matricula' => '023999',
    'valor_pedido' => '500.00',
    'pass' => '251490',
    'request_id' => 'TEST_' . time(),
    'id' => '174',        // ✅ CORRIGIDO: era 182
    'empregador' => '19', // ✅ CORRIGIDO: era 35
    'id_divisao' => '1',  // ✅ CORRIGIDO: era 2
    'mes_corrente' => 'MAR/2026',
    'celular' => '11999999999',
    'taxa' => '0',
    'valor_descontar' => '500.00',
    'chave_pix' => '',
    'convenio' => '221'
];

echo "📋 DADOS DE TESTE:\n";
echo json_encode($_POST, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

try {
    // Incluir arquivo de conexão
    include "Adm/php/banco.php";
    
    if (!class_exists('Banco')) {
        throw new Exception('❌ Classe Banco não encontrada');
    }
    
    echo "✅ Classe Banco encontrada\n\n";
    
    $pdo = Banco::conectar_postgres();
    
    if (!$pdo) {
        throw new Exception('❌ Erro na conexão com banco de dados');
    }
    
    echo "✅ Conexão com banco estabelecida\n\n";
    
    // TESTE 1: Buscar associado
    echo "=== TESTE 1: BUSCAR ASSOCIADO ===\n";
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
        WHERE a.id = ?
        AND a.empregador = ?
        AND a.id_divisao = ?
        LIMIT 1
    ";
    
    $stmt = $pdo->prepare($sql_associado);
    $stmt->execute([174, 19, 1]);  // ✅ CORRIGIDO: era [182, 35, 2]
    $associado = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$associado) {
        throw new Exception('❌ Associado não encontrado com ID=174, Empregador=19, Divisão=1');
    }
    
    echo "✅ Associado encontrado:\n";
    echo json_encode($associado, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";
    
    // TESTE 2: Verificar senha
    echo "=== TESTE 2: VERIFICAR SENHA ===\n";
    $sql_senha = "SELECT COUNT(*) as total FROM sind.c_senhaassociado WHERE cod_associado = ? AND senha = ? AND id_empregador = ? AND id_associado = ? AND id_divisao = ?";
    $stmt_senha = $pdo->prepare($sql_senha);
    $stmt_senha->execute(['023999', '251490', 19, 174, 1]);  // ✅ CORRIGIDO: era [35, 182, 2]
    $resultado_senha = $stmt_senha->fetch(PDO::FETCH_ASSOC);
    
    echo "Resultado: " . $resultado_senha['total'] . " registro(s) encontrado(s)\n";
    
    if ($resultado_senha['total'] == 0) {
        echo "❌ Senha incorreta ou não encontrada\n";
        echo "Tentando buscar senha cadastrada...\n";
        
        $sql_senha_debug = "SELECT senha FROM sind.c_senhaassociado WHERE cod_associado = ? AND id_empregador = ? AND id_associado = ? AND id_divisao = ?";
        $stmt_senha_debug = $pdo->prepare($sql_senha_debug);
        $stmt_senha_debug->execute(['023999', 19, 174, 1]);  // ✅ CORRIGIDO: era [35, 182, 2]
        $senha_cadastrada = $stmt_senha_debug->fetch(PDO::FETCH_ASSOC);
        
        if ($senha_cadastrada) {
            echo "Senha cadastrada no banco: " . $senha_cadastrada['senha'] . "\n";
            echo "Senha enviada no teste: 251490\n";
        } else {
            echo "❌ Nenhuma senha cadastrada para este associado\n";
        }
        throw new Exception('Senha incorreta');
    }
    
    echo "✅ Senha verificada com sucesso\n\n";
    
    // TESTE 3: Simular INSERT (sem commit)
    echo "=== TESTE 3: TESTAR INSERT ANTECIPACAO (SEM COMMIT) ===\n";
    
    $pdo->beginTransaction();
    
    $stmt_insert = $pdo->prepare("
        INSERT INTO sind.antecipacao (
            matricula,
            empregador,
            mes,
            data_solicitacao,
            valor,
            aprovado,
            celular,
            valor_taxa,
            valor_a_descontar,
            chave_pix,
            id_divisao,
            id_associado,
            hora
        ) VALUES (?, ?, ?, CURRENT_DATE, ?, null, ?, ?, ?, ?, ?, ?, CAST(CURRENT_TIME AS TIME(0)))
        RETURNING id
    ");
    
    $resultado = $stmt_insert->execute([
        '023999',
        19,  
        'MAR/2026',
        500.00,
        '11999999999',
        0,
        500.00,
        '',
        1,   
        174  
    ]);
    
    if (!$resultado) {
        throw new Exception(' Erro ao executar INSERT: ' . implode(', ', $stmt_insert->errorInfo()));
    }
    
    $result = $stmt_insert->fetch(PDO::FETCH_ASSOC);
    $antecipacao_id = $result['id'];
    
    echo "✅ INSERT antecipacao executado com sucesso\n";
    echo "ID retornado: " . $antecipacao_id . "\n\n";
    
    // TESTE 4: Simular INSERT conta (sem commit)
    echo "=== TESTE 4: TESTAR INSERT CONTA (SEM COMMIT) ===\n";
    
    $stmt_conta = $pdo->prepare("
        INSERT INTO sind.conta (
            associado,
            convenio,
            valor,
            data,
            hora,
            descricao,
            mes,
            empregador,
            tipo,
            divisao,
            id_associado,
            aprovado
        ) VALUES (?, ?, ?, CURRENT_DATE, CAST(CURRENT_TIME AS TIME(0)), ?, ?, ?, ?, ?, ?, false)
        RETURNING lancamento
    ");
    
    $resultado_conta = $stmt_conta->execute([
        '023999',
        221,
        500.00,
        'Antecipação salarial',
        'MAR/2026',
        19,  // ✅ CORRIGIDO: era 35
        'ANTECIPACAO',
        1,   // ✅ CORRIGIDO: era 2
        174  // ✅ CORRIGIDO: era 182
    ]);
    
    if (!$resultado_conta) {
        throw new Exception('❌ Erro ao executar INSERT conta: ' . implode(', ', $stmt_conta->errorInfo()));
    }
    
    $result_conta = $stmt_conta->fetch(PDO::FETCH_ASSOC);
    $conta_id = $result_conta['lancamento'];
    
    echo "✅ INSERT conta executado com sucesso\n";
    echo "ID retornado: " . $conta_id . "\n\n";
    
    // ROLLBACK para não gravar de verdade
    $pdo->rollback();
    echo "🔄 ROLLBACK executado (teste não gravou no banco)\n\n";
    
    echo "=== RESULTADO FINAL ===\n";
    echo "✅ TODOS OS TESTES PASSARAM!\n";
    echo "✅ Associado encontrado\n";
    echo "✅ Senha verificada\n";
    echo "✅ INSERT antecipacao funcionou (ID: $antecipacao_id)\n";
    echo "✅ INSERT conta funcionou (ID: $conta_id)\n";
    echo "\n";
    echo "🎯 O script PHP deveria funcionar corretamente!\n";
    
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollback();
    }
    echo "\n❌ ERRO: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
?>
