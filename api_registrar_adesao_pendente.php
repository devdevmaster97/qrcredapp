<?php
/**
 * API para registrar adesão pendente SasCred
 * Salva dados temporários para uso posterior no webhook ZapSign
 * Resolve problema de divisão incorreta
 */

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Tratar requisição OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Apenas POST permitido
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'status' => 'erro',
        'mensagem' => 'Apenas requisições POST são permitidas'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // Obter dados do POST
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    // Log para debug
    error_log("📝 API Registrar Adesão Pendente - Dados recebidos: " . json_encode($data, JSON_UNESCAPED_UNICODE));
    
    // Validar campos obrigatórios
    $camposObrigatorios = ['codigo', 'cpf', 'email', 'id_associado', 'id_divisao'];
    $camposFaltantes = [];
    
    foreach ($camposObrigatorios as $campo) {
        if (empty($data[$campo])) {
            $camposFaltantes[] = $campo;
        }
    }
    
    if (!empty($camposFaltantes)) {
        http_response_code(400);
        echo json_encode([
            'status' => 'erro',
            'mensagem' => 'Campos obrigatórios faltando: ' . implode(', ', $camposFaltantes),
            'campos_faltantes' => $camposFaltantes
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Extrair dados
    $codigo = $data['codigo'];
    $cpf = preg_replace('/[^0-9]/', '', $data['cpf']); // Limpar CPF
    $email = $data['email'];
    $id_associado = (int)$data['id_associado'];
    $id_divisao = (int)$data['id_divisao'];
    $nome = $data['nome'] ?? null;
    $celular = $data['celular'] ?? null;
    $doc_token = $data['doc_token'] ?? null;
    
    error_log("✅ Dados validados - Código: $codigo, ID Associado: $id_associado, ID Divisão: $id_divisao");
    
    // Incluir arquivo de conexão com banco
    require_once __DIR__ . '/Adm/php/banco.php';
    
    // Conectar ao banco
    $pdo = Banco::conectar_postgres();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    error_log("✅ Conexão com banco estabelecida");
    
    // Inserir ou atualizar registro de adesão pendente
    $sql = "INSERT INTO sind.adesoes_pendentes 
                (codigo, cpf, email, id_associado, id_divisao, nome, celular, doc_token, status, data_inicio, data_expiracao)
            VALUES 
                (:codigo, :cpf, :email, :id_associado, :id_divisao, :nome, :celular, :doc_token, 'pendente', NOW(), NOW() + INTERVAL '24 hours')
            ON CONFLICT (cpf, email) 
            DO UPDATE SET
                codigo = EXCLUDED.codigo,
                id_associado = EXCLUDED.id_associado,
                id_divisao = EXCLUDED.id_divisao,
                nome = EXCLUDED.nome,
                celular = EXCLUDED.celular,
                doc_token = EXCLUDED.doc_token,
                data_inicio = NOW(),
                data_expiracao = NOW() + INTERVAL '24 hours',
                status = 'pendente'
            RETURNING id, codigo, id_associado, id_divisao";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':codigo' => $codigo,
        ':cpf' => $cpf,
        ':email' => $email,
        ':id_associado' => $id_associado,
        ':id_divisao' => $id_divisao,
        ':nome' => $nome,
        ':celular' => $celular,
        ':doc_token' => $doc_token
    ]);
    
    $resultado = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($resultado) {
        error_log("✅ Adesão pendente registrada com sucesso - ID: {$resultado['id']}, Código: {$resultado['codigo']}, Divisão: {$resultado['id_divisao']}");
        
        http_response_code(200);
        echo json_encode([
            'status' => 'sucesso',
            'mensagem' => 'Adesão pendente registrada com sucesso',
            'dados' => [
                'id' => (int)$resultado['id'],
                'codigo' => $resultado['codigo'],
                'id_associado' => (int)$resultado['id_associado'],
                'id_divisao' => (int)$resultado['id_divisao']
            ]
        ], JSON_UNESCAPED_UNICODE);
    } else {
        throw new Exception('Nenhum registro foi inserido');
    }
    
} catch (PDOException $e) {
    error_log("❌ Erro de banco de dados: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'erro',
        'mensagem' => 'Erro ao registrar adesão pendente',
        'erro_detalhes' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    error_log("❌ Erro geral: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'erro',
        'mensagem' => 'Erro ao processar requisição',
        'erro_detalhes' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
