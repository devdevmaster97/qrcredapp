<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Cache-Control, Pragma, Expires');

// Função de log para debug
function logDebug($message, $data = null) {
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message";
    if ($data !== null) {
        $logMessage .= " - " . json_encode($data, JSON_UNESCAPED_UNICODE);
    }
    error_log($logMessage);
}

try {
    logDebug("🚀 PHP INICIADO - Recebendo requisição de lançamento com taxa automática");
    
    // Verificar método
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método não permitido');
    }
    
    // Capturar dados do POST
    $valor_pedido = $_POST['valor_pedido'] ?? '';
    $cod_convenio = $_POST['cod_convenio'] ?? '';
    $matricula = $_POST['matricula'] ?? '';
    $qtde_parcelas = $_POST['qtde_parcelas'] ?? 1;
    $mes_corrente = $_POST['mes_corrente'] ?? '';
    $valor_parcela = $_POST['valor_parcela'] ?? '';
    $primeiro_mes = $_POST['primeiro_mes'] ?? '';
    $pass = $_POST['pass'] ?? '';
    $nome = $_POST['nome'] ?? '';
    $empregador = $_POST['empregador'] ?? '';
    $descricao = $_POST['descricao'] ?? 'Lançamento via app';
    $id_associado = $_POST['id_associado'] ?? null;
    $divisao = $_POST['divisao'] ?? null;
    
    logDebug("📋 Dados recebidos", [
        'matricula' => $matricula,
        'valor_pedido' => $valor_pedido,
        'qtde_parcelas' => $qtde_parcelas,
        'mes_corrente' => $mes_corrente,
        'empregador' => $empregador,
        'divisao' => $divisao,
        'id_associado' => $id_associado
    ]);
    
    // Validar campos obrigatórios
    if (empty($matricula) || empty($valor_pedido) || empty($cod_convenio) || empty($mes_corrente)) {
        throw new Exception('Campos obrigatórios faltando');
    }
    
    // Incluir arquivo de conexão com banco
    include "Adm/php/banco.php";
    
    if (!class_exists('Banco')) {
        throw new Exception('Classe Banco não encontrada');
    }
    
    $pdo = Banco::conectar_postgres();
    
    if (!$pdo) {
        throw new Exception('Erro na conexão com banco de dados');
    }
    
    logDebug("✅ Conexão com banco estabelecida");
    
    // INICIAR TRANSAÇÃO ATÔMICA
    $pdo->beginTransaction();
    logDebug("🔄 Transação iniciada");
    
    try {
        // 1. VERIFICAR SENHA DO ASSOCIADO
        logDebug("🔐 Verificando senha do associado");
        
        $sql_senha = "SELECT COUNT(*) as total FROM sind.c_senhaassociado 
                      WHERE cod_associado = ? AND senha = ? AND id_empregador = ?";
        $params_senha = [$matricula, $pass, $empregador];
        
        if ($id_associado) {
            $sql_senha .= " AND id_associado = ?";
            $params_senha[] = $id_associado;
        }
        
        if ($divisao) {
            $sql_senha .= " AND id_divisao = ?";
            $params_senha[] = $divisao;
        }
        
        $stmt_senha = $pdo->prepare($sql_senha);
        $stmt_senha->execute($params_senha);
        $resultado_senha = $stmt_senha->fetch(PDO::FETCH_ASSOC);
        
        if ($resultado_senha['total'] == 0) {
            logDebug("❌ Senha incorreta");
            $pdo->rollback();
            echo json_encode([
                'situacao' => 2,
                'erro' => 'Senha incorreta'
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }
        
        logDebug("✅ Senha verificada com sucesso");
        
        // 2. GRAVAR LANÇAMENTO PRINCIPAL NA TABELA sind.conta
        logDebug("💾 Gravando lançamento principal");
        
        $sql_conta = "INSERT INTO sind.conta (
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
        ) VALUES (?, ?, ?, CURRENT_DATE, CAST(CURRENT_TIME AS TIME(0)), ?, ?, ?, ?, ?, ?, true)
        RETURNING lancamento";
        
        $stmt_conta = $pdo->prepare($sql_conta);
        $resultado_conta = $stmt_conta->execute([
            $matricula,
            $cod_convenio,
            $valor_parcela,
            $descricao,
            $mes_corrente,
            $empregador,
            'VENDA',
            $divisao,
            $id_associado
        ]);
        
        if (!$resultado_conta) {
            throw new Exception('Erro ao inserir lançamento principal: ' . implode(', ', $stmt_conta->errorInfo()));
        }
        
        // Pegar ID do lançamento inserido
        $conta_result = $stmt_conta->fetch(PDO::FETCH_ASSOC);
        $lancamento_id = $conta_result['lancamento'];
        
        logDebug("✅ Lançamento principal gravado - ID: $lancamento_id");
        
        // 3. BUSCAR VALOR DA TAXA DE CARTÃO (convênio SASCRED-MT-TAXA-CARTAO código 249)
        logDebug("🔍 Buscando valor da taxa de cartão para divisão: $divisao");
        
        $sql_taxa = "SELECT valor FROM sind.valor_taxa_cartao 
                     WHERE divisao = ? 
                     ORDER BY id DESC 
                     LIMIT 1";
        
        $stmt_taxa = $pdo->prepare($sql_taxa);
        $stmt_taxa->execute([$divisao]);
        $taxa_result = $stmt_taxa->fetch(PDO::FETCH_ASSOC);
        
        if (!$taxa_result) {
            logDebug("⚠️ Valor da taxa não encontrado para divisão $divisao, usando valor padrão R$ 7,50");
            $valor_taxa = 7.50;
        } else {
            $valor_taxa = floatval($taxa_result['valor']);
            logDebug("✅ Valor da taxa encontrado: R$ " . number_format($valor_taxa, 2, ',', '.'));
        }
        
        // 4. VERIFICAR SE JÁ EXISTE TAXA LANÇADA NO MÊS PARA ESTE ASSOCIADO
        logDebug("🔍 Verificando se taxa já foi lançada no mês $mes_corrente");
        
        $sql_verifica_taxa = "SELECT COUNT(*) as total FROM sind.conta 
                              WHERE associado = ? 
                              AND empregador = ? 
                              AND mes = ? 
                              AND convenio = 249 
                              AND tipo = 'TAXA_CARTAO'";
        
        $params_verifica = [$matricula, $empregador, $mes_corrente];
        
        if ($divisao) {
            $sql_verifica_taxa .= " AND divisao = ?";
            $params_verifica[] = $divisao;
        }
        
        if ($id_associado) {
            $sql_verifica_taxa .= " AND id_associado = ?";
            $params_verifica[] = $id_associado;
        }
        
        $stmt_verifica = $pdo->prepare($sql_verifica_taxa);
        $stmt_verifica->execute($params_verifica);
        $verifica_result = $stmt_verifica->fetch(PDO::FETCH_ASSOC);
        
        $taxa_ja_lancada = $verifica_result['total'] > 0;
        
        if ($taxa_ja_lancada) {
            logDebug("⚠️ Taxa de cartão já foi lançada neste mês - pulando gravação");
        } else {
            // 5. GRAVAR TAXA DE CARTÃO AUTOMATICAMENTE
            logDebug("💾 Gravando taxa de cartão automática - R$ " . number_format($valor_taxa, 2, ',', '.'));
            
            $sql_taxa_cartao = "INSERT INTO sind.conta (
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
            ) VALUES (?, ?, ?, CURRENT_DATE, CAST(CURRENT_TIME AS TIME(0)), ?, ?, ?, ?, ?, ?, true)
            RETURNING lancamento";
            
            $stmt_taxa_cartao = $pdo->prepare($sql_taxa_cartao);
            $resultado_taxa = $stmt_taxa_cartao->execute([
                $matricula,
                249, // Código do convênio SASCRED-MT-TAXA-CARTAO
                $valor_taxa,
                'Taxa de manutenção do cartão',
                $mes_corrente,
                $empregador,
                'TAXA_CARTAO',
                $divisao,
                $id_associado
            ]);
            
            if (!$resultado_taxa) {
                throw new Exception('Erro ao inserir taxa de cartão: ' . implode(', ', $stmt_taxa_cartao->errorInfo()));
            }
            
            // Pegar ID da taxa inserida
            $taxa_cartao_result = $stmt_taxa_cartao->fetch(PDO::FETCH_ASSOC);
            $taxa_lancamento_id = $taxa_cartao_result['lancamento'];
            
            logDebug("✅ Taxa de cartão gravada com sucesso - ID: $taxa_lancamento_id");
        }
        
        // COMMIT DA TRANSAÇÃO
        $pdo->commit();
        logDebug("✅ Transação confirmada com sucesso");
        
        // Resposta de sucesso
        echo json_encode([
            'situacao' => 1,
            'registrolan' => $lancamento_id,
            'taxa_lancada' => !$taxa_ja_lancada,
            'taxa_lancamento_id' => isset($taxa_lancamento_id) ? $taxa_lancamento_id : null,
            'valor_taxa' => $valor_taxa,
            'message' => 'Lançamento gravado com sucesso' . (!$taxa_ja_lancada ? ' (taxa de cartão incluída)' : '')
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        $pdo->rollback();
        logDebug("❌ Rollback executado - Erro: " . $e->getMessage());
        throw $e;
    }
    
} catch (Exception $e) {
    logDebug("❌ Erro geral capturado: " . $e->getMessage());
    
    echo json_encode([
        'situacao' => 0,
        'erro' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
}
?>
