<?php
/**
 * Webhook ZapSign - Recebe notificações de documentos assinados
 * Este script deve ser configurado na ZapSign como endpoint de webhook
 * URL de exemplo: https://seudominio.com/webhook_zapsign.php
 */

// Carregar configurações
require_once __DIR__ . '/webhook_zapsign_config.php';

// Configurar headers de resposta
header('Content-Type: application/json; charset=utf-8');

// Verificar se é uma requisição de status
if (isset($_GET['status'])) {
    $statusInfo = [
        'webhook' => 'ZapSign Webhook',
        'version' => '1.1',
        'timestamp' => date('Y-m-d H:i:s'),
        'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
        'config' => [
            'connection_file' => 'Adm/php/banco.php',
            'connection_class' => 'Banco::conectar_postgres()',
            'table' => TABLE_NAME,
            'debug_logs' => ENABLE_DEBUG_LOGS ? 'enabled' : 'disabled'
        ]
    ];
    
    // Testar conexão com banco usando arquivo de conexão existente
    try {
        // Verificar se arquivo de conexão existe
        if (file_exists("Adm/php/banco.php")) {
            include "Adm/php/banco.php";
            /** @var PDO $pdo */
            /** @noinspection PhpUndefinedClassInspection */
            $pdo = Banco::conectar_postgres();
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $statusInfo['database_status'] = 'connected';
            $statusInfo['connection_method'] = 'Sistema existente (Adm/php/banco.php)';
        } else {
            $statusInfo['database_status'] = 'error: Arquivo Adm/php/banco.php não encontrado';
        }
    } catch (Exception $e) {
        $statusInfo['database_status'] = 'error: ' . $e->getMessage();
    }
    
    echo json_encode($statusInfo, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Função para escrever logs
 */
function writeLog($message) {
    if (!ENABLE_DEBUG_LOGS) {
        return;
    }
    
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[{$timestamp}] {$message}" . PHP_EOL;
    
    // Verificar tamanho do arquivo de log
    if (MAX_LOG_SIZE > 0 && file_exists(LOG_FILE) && filesize(LOG_FILE) > MAX_LOG_SIZE) {
        // Fazer backup do log atual e começar novo
        rename(LOG_FILE, LOG_FILE . '.backup.' . date('Y-m-d-H-i-s'));
    }
    
    file_put_contents(LOG_FILE, $logMessage, FILE_APPEND | LOCK_EX);
}

/**
 * Função para resposta JSON
 */
function jsonResponse($data, $httpCode = 200) {
    http_response_code($httpCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    writeLog("=== WEBHOOK ZAPSIGN INICIADO ===");
    writeLog("Método: " . ($_SERVER['REQUEST_METHOD'] ?? 'unknown'));
    writeLog("Headers: " . json_encode(getallheaders()));
    writeLog("Query Params: " . json_encode($_GET));
    
    // Verificar se é uma requisição POST (mais tolerante)
    $method = $_SERVER['REQUEST_METHOD'] ?? '';
    if (empty($method)) {
        writeLog("AVISO: Método HTTP não detectado, tentando processar mesmo assim");
    } elseif ($method !== 'POST') {
        writeLog("ERRO: Método não permitido - " . $method);
        jsonResponse([
            'status' => 'erro',
            'mensagem' => 'Apenas requisições POST são aceitas',
            'metodo_recebido' => $method
        ], 405);
    }

    // Obter o corpo da requisição
    $input = file_get_contents('php://input');
    writeLog("Corpo da requisição recebido: " . $input);

    if (empty($input)) {
        writeLog("ERRO: Corpo da requisição vazio");
        jsonResponse([
            'status' => 'erro',
            'mensagem' => 'Corpo da requisição vazio'
        ], 400);
    }

    // Decodificar JSON
    $webhookData = json_decode($input, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        writeLog("ERRO: JSON inválido - " . json_last_error_msg());
        jsonResponse([
            'status' => 'erro',
            'mensagem' => 'JSON inválido: ' . json_last_error_msg()
        ], 400);
    }

    writeLog("JSON decodificado: " . json_encode($webhookData, JSON_UNESCAPED_UNICODE));

    // Mapear campos da ZapSign para os campos esperados (compatibilidade)
    $event = $webhookData['event_type'] ?? $webhookData['event'] ?? '';
    $docToken = $webhookData['token'] ?? $webhookData['doc_token'] ?? '';
    $docName = $webhookData['name'] ?? $webhookData['doc_name'] ?? '';
    $signedAt = $webhookData['signed_at'] ?? null;

    // Validar estrutura do webhook
    if (empty($event) || empty($docToken)) {
        writeLog("ERRO: Estrutura do webhook inválida");
        writeLog("Event: '{$event}', DocToken: '{$docToken}'");
        jsonResponse([
            'status' => 'erro',
            'mensagem' => 'Estrutura do webhook inválida - event_type e token são obrigatórios',
            'recebido' => [
                'event_type' => $event,
                'token' => $docToken,
                'name' => $docName
            ]
        ], 400);
    }

    writeLog("Event: {$event}");
    writeLog("Doc Token: {$docToken}");
    writeLog("Doc Name: {$docName}");

    // Verificar se é um evento de documento assinado
    if ($event !== 'doc_signed') {
        writeLog("INFO: Evento ignorado - {$event}");
        jsonResponse([
            'status' => 'sucesso',
            'mensagem' => 'Evento processado (ignorado)',
            'event' => $event
        ]);
    }

    // Filtrar apenas documentos com nome "Termo Adesão SasPyx"
    if ($docName !== 'Termo Adesão SasPyx') {
        writeLog("INFO: Documento ignorado - nome do documento: '{$docName}' - Apenas 'Termo Adesão SasPyx' são processados");
        jsonResponse([
            'status' => 'sucesso',
            'mensagem' => 'Documento processado (ignorado por filtro de nome)',
            'doc_name' => $docName,
            'filtro' => 'Apenas documentos "Termo Adesão SasPyx" são processados'
        ]);
    }

    // Validar se há signatários
    if (!isset($webhookData['signers']) || !is_array($webhookData['signers'])) {
        writeLog("ERRO: Signatários não encontrados");
        jsonResponse([
            'status' => 'erro',
            'mensagem' => 'Signatários não encontrados'
        ], 400);
    }

    // Conectar ao banco PostgreSQL usando arquivo de conexão existente
    writeLog("Conectando ao banco usando arquivo de conexão do sistema...");
    
    // Verificar se arquivo de conexão existe
    if (!file_exists("Adm/php/banco.php")) {
        writeLog("ERRO: Arquivo Adm/php/banco.php não encontrado");
        jsonResponse([
            'status' => 'erro',
            'mensagem' => 'Arquivo de conexão com banco não encontrado'
        ], 500);
    }
    
    // Incluir arquivo de conexão com banco
    include "Adm/php/banco.php";
    
    // Verificar se classe Banco existe
    if (!class_exists('Banco')) {
        writeLog("ERRO: Classe Banco não encontrada no arquivo incluído");
        jsonResponse([
            'status' => 'erro',
            'mensagem' => 'Classe de conexão com banco não encontrada'
        ], 500);
    }
    
    // Conectando ao banco de dados utilizando o PDO
    /** @var PDO $pdo */
    /** @noinspection PhpUndefinedClassInspection */
    $pdo = Banco::conectar_postgres();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    writeLog("Conexão com banco estabelecida");

    // Processar cada signatário
    $processedSigners = 0;
    $errors = [];

    foreach ($webhookData['signers'] as $signer) {
        writeLog("Processando signatário: " . json_encode($signer, JSON_UNESCAPED_UNICODE));

        $signerName = $signer['name'] ?? '';
        $signerEmail = $signer['email'] ?? '';
        $signerCpf = $signer['cpf'] ?? '';
        $hasSigned = $signer['has_signed'] ?? false;
        $signerSignedAt = $signer['signed_at'] ?? null;
        $signerToken = $signer['token'] ?? '';

        // Validar dados mínimos do signatário
        if (empty($signerCpf)) {
            $error = "CPF do signatário não encontrado";
            writeLog("ERRO: {$error}");
            $errors[] = $error;
            continue;
        }

        // Limpar CPF (remover pontos e traços)
        $cpfLimpo = preg_replace('/[^0-9]/', '', $signerCpf);

        try {
            // Verificar se já existe um registro na tabela sind.associados_sasmais
            // Vamos tentar localizar pelo CPF ou outros dados disponíveis
            
            // Primeiro, vamos buscar se existe algum registro que possa corresponder
            // Como não temos o código diretamente, vamos usar o CPF para tentar encontrar
            $stmt = $pdo->prepare("
                SELECT id, codigo, nome, celular 
                FROM " . TABLE_NAME . "
                WHERE 
                    cpf = :cpf 
                    OR nome ILIKE :nome
                LIMIT 1
            ");
            
            $stmt->execute([
                ':cpf' => $cpfLimpo,
                ':nome' => '%' . $signerName . '%'
            ]);
            
            $existingRecord = $stmt->fetch();
            writeLog("Registro existente encontrado: " . ($existingRecord ? json_encode($existingRecord) : 'Nenhum'));

            if ($existingRecord) {
                // Atualizar registro existente com dados da assinatura
                $updateStmt = $pdo->prepare("
                    UPDATE " . TABLE_NAME . "
                    SET 
                        event = :event,
                        doc_token = :doc_token,
                        doc_name = :doc_name,
                        signed_at = :signed_at,
                        name = :name,
                        email = :email,
                        cpf = :cpf,
                        has_signed = :has_signed,
                        autorizado = :autorizado,
                        cel_informado = :cel_informado,
                        data_hora = CURRENT_TIMESTAMP
                    WHERE id = :id
                ");

                $updateStmt->execute([
                    ':event' => $event,
                    ':doc_token' => $docToken,
                    ':doc_name' => $docName,
                    ':signed_at' => $signedAt,
                    ':name' => $signerName,
                    ':email' => $signerEmail,
                    ':cpf' => $cpfLimpo,
                    ':has_signed' => $hasSigned ? 1 : 0,
                    ':autorizado' => $hasSigned ? 1 : 0,
                    ':cel_informado' => '', // Campo deixado vazio - celular não disponível no webhook
                    ':id' => $existingRecord['id']
                ]);

                writeLog("Registro atualizado com sucesso - ID: {$existingRecord['id']}");
                $processedSigners++;

            } else {
                // Se não encontrou registro existente, criar um novo registro
                // Isso pode acontecer se o webhook chegar antes da adesão ser processada
                writeLog("AVISO: Criando novo registro para assinatura sem adesão prévia");

                $insertStmt = $pdo->prepare("
                    INSERT INTO " . TABLE_NAME . "
                    (codigo, nome, celular, data_hora, autorizado, aceitou_termo, event, doc_token, doc_name, signed_at, name, email, cpf, has_signed, cel_informado)
                    VALUES 
                    (:codigo, :nome, :celular, CURRENT_TIMESTAMP, :autorizado, :aceitou_termo, :event, :doc_token, :doc_name, :signed_at, :name, :email, :cpf, :has_signed, :cel_informado)
                ");

                $insertStmt->execute([
                    ':codigo' => '', // Será preenchido quando a adesão for processada
                    ':nome' => $signerName,
                    ':celular' => '', // Não disponível no webhook
                    ':autorizado' => $hasSigned ? 1 : 0,
                    ':aceitou_termo' => 1, // Assumir que aceitou se está assinando
                    ':event' => $event,
                    ':doc_token' => $docToken,
                    ':doc_name' => $docName,
                    ':signed_at' => $signedAt,
                    ':name' => $signerName,
                    ':email' => $signerEmail,
                    ':cpf' => $cpfLimpo,
                    ':has_signed' => $hasSigned ? 1 : 0,
                    ':cel_informado' => '' // Campo deixado vazio - celular não disponível no webhook
                ]);

                writeLog("Novo registro criado com sucesso");
                $processedSigners++;
            }

        } catch (PDOException $e) {
            $error = "Erro ao processar signatário {$signerName}: " . $e->getMessage();
            writeLog("ERRO DB: {$error}");
            $errors[] = $error;
        }
    }

    // Preparar resposta
    if ($processedSigners > 0) {
        $response = [
            'status' => 'sucesso',
            'mensagem' => "Webhook processado com sucesso",
            'processados' => $processedSigners,
            'event' => $event,
            'doc_token' => $docToken,
            'doc_name' => $docName
        ];

        if (!empty($errors)) {
            $response['avisos'] = $errors;
        }

        writeLog("SUCCESS: " . json_encode($response));
        jsonResponse($response);

    } else {
        $response = [
            'status' => 'erro',
            'mensagem' => 'Nenhum signatário foi processado',
            'erros' => $errors
        ];

        writeLog("ERRO: " . json_encode($response));
        jsonResponse($response, 422);
    }

} catch (PDOException $e) {
    $error = "Erro de conexão com banco: " . $e->getMessage();
    writeLog("ERRO PDO: {$error}");
    
    jsonResponse([
        'status' => 'erro',
        'mensagem' => 'Erro interno do servidor (banco de dados)',
        'erro' => $error
    ], 500);

} catch (Exception $e) {
    $error = "Erro geral: " . $e->getMessage();
    writeLog("ERRO GERAL: {$error}");
    
    jsonResponse([
        'status' => 'erro',
        'mensagem' => 'Erro interno do servidor',
        'erro' => $error
    ], 500);
}
?> 