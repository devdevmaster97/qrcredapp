import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

// Cache para controlar requisições// Maps globais para controle de rate limiting e execução única
const ultimasRequisicoes = new Map<string, number>();
const requestsEmAndamento = new Map<string, boolean>();
const promisesEmAndamento = new Map<string, Promise<any>>();
const execucaoUnica = new Map<string, boolean>();
const timestampExecucao = new Map<string, number>();

// Contador global para rastrear chamadas PHP
const contadorChamadasPHP = new Map<string, number>(); 

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('X-Request-ID') || `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`🚀 [${requestId}] === INÍCIO DA REQUISIÇÃO API ===`);
  console.log(`🔍 [${requestId}] Headers recebidos:`, Object.fromEntries(request.headers.entries()));
  console.log(`⏰ [${requestId}] Timestamp: ${new Date().toISOString()}`);
  
  try {
    const body = await request.json();
    console.log(`📦 [${requestId}] Body recebido:`, body);
    console.log(`🔍 [${requestId}] Campos do body:`, Object.keys(body));
    console.log(`📥 [${requestId}] API Antecipação - Dados recebidos:`, {
      matricula: body.matricula,
      valor_pedido: body.valor_pedido,
      request_id: body.request_id,
      frontend_request_id: requestId
    });
    
    // Criar chave única para esta solicitação
    const chaveUnica = `${body.matricula}_${body.valor_pedido}_${body.request_id}`;
    const agora = Date.now();
    
    console.log(`🔑 [API] Chave única gerada: ${chaveUnica}`);
    console.log(`🔒 [API] Controle execução única:`, Array.from(execucaoUnica.entries()));
    console.log(`⏰ [API] Timestamp execução:`, Array.from(timestampExecucao.entries()));
    
    // LIMPEZA AUTOMÁTICA: Limpar cache antigo para permitir novas requisições
    if (timestampExecucao.has(chaveUnica)) {
      const tempoDecorrido = agora - timestampExecucao.get(chaveUnica)!;
      if (tempoDecorrido > 30000) { // Limpar entradas antigas (30s)
        timestampExecucao.delete(chaveUnica);
        execucaoUnica.delete(chaveUnica);
        ultimasRequisicoes.delete(chaveUnica);
        requestsEmAndamento.delete(chaveUnica);
        promisesEmAndamento.delete(chaveUnica);
        contadorChamadasPHP.delete(chaveUnica);
        console.log(`🧹 [LIMPEZA AUTOMÁTICA] Cache antigo removido para ${chaveUnica}`);
      }
    }
    
    // VERIFICAÇÃO ÚNICA E ROBUSTA DE DUPLICAÇÃO
    // 1. Verificar se já está sendo executada (execução única)
    if (execucaoUnica.has(chaveUnica)) {
      console.log(`🚨 [${requestId}] EXECUÇÃO ÚNICA BLOQUEIO - solicitação ${chaveUnica} já está sendo executada`);
      return NextResponse.json({
        success: false,
        error: 'Solicitação já está sendo processada. Aguarde a conclusão.',
        execution_blocked: true,
        request_id: requestId
      }, { status: 409 });
    }
    
    // 2. Verificar se há requisição em andamento
    if (requestsEmAndamento.has(chaveUnica)) {
      console.log(`🔄 [${requestId}] REQUISIÇÃO EM ANDAMENTO - solicitação ${chaveUnica} já está sendo processada`);
      return NextResponse.json({
        success: false,
        error: 'Solicitação já está sendo processada. Aguarde a conclusão.',
        duplicate_blocked: true,
        request_id: requestId
      }, { status: 409 });
    }
    
    // 3. Verificar rate limiting (2 segundos)
    const ultimaRequisicao = ultimasRequisicoes.get(chaveUnica);
    if (ultimaRequisicao && (agora - ultimaRequisicao) < 2000) {
      const tempoRestante = Math.ceil((2000 - (agora - ultimaRequisicao)) / 1000);
      console.log(`⏰ [${requestId}] RATE LIMIT - solicitação ${chaveUnica} muito recente. Tempo restante: ${tempoRestante}s`);
      return NextResponse.json({
        success: false,
        error: `Aguarde ${tempoRestante} segundos antes de fazer nova solicitação similar`,
        rate_limited: true,
        tempo_restante: tempoRestante,
        request_id: requestId
      }, { status: 429 });
    }
    
    // MARCAR TODOS OS CONTROLES DE UMA VEZ (ATÔMICO)
    timestampExecucao.set(chaveUnica, agora);
    execucaoUnica.set(chaveUnica, true);
    ultimasRequisicoes.set(chaveUnica, agora);
    requestsEmAndamento.set(chaveUnica, true);
    
    console.log(`🔐 [${requestId}] TODOS OS CONTROLES MARCADOS: ${chaveUnica} em ${agora}`);
    
    // CRIAR E EXECUTAR PROMISE DE PROCESSAMENTO
    console.log(`🚀 [${requestId}] [API] Criando promise de processamento para ${chaveUnica}`);
    const promiseRequisicao = processarSolicitacao(body, chaveUnica, requestId);
    promisesEmAndamento.set(chaveUnica, promiseRequisicao);
    
    try {
      console.log(`⏳ [${requestId}] [API] Aguardando processamento da solicitação ${chaveUnica}`);
      const resultado = await promiseRequisicao;
      console.log(`✅ [${requestId}] [API] Processamento concluído para ${chaveUnica}`);
      return resultado;
    } finally {
      // Limpar TODOS os controles após processamento
      requestsEmAndamento.delete(chaveUnica);
      promisesEmAndamento.delete(chaveUnica);
      execucaoUnica.delete(chaveUnica);
      timestampExecucao.delete(chaveUnica);
      contadorChamadasPHP.delete(chaveUnica);
      console.log(`🧹 [${requestId}] [LIMPEZA FINAL] Removido todos os controles para ${chaveUnica}`);
    }
    
  } catch (error) {
    console.error(`💥 [${requestId}] Erro na API:`, error);
    console.error(`💥 [${requestId}] Stack trace:`, error instanceof Error ? error.stack : 'N/A');
    console.error(`💥 [${requestId}] Tipo do erro:`, typeof error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      debug_info: {
        error_type: typeof error,
        error_message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}

async function processarSolicitacao(body: any, chaveUnica: string, requestId: string) {
  const debugInfo: any = {
    etapa: 'inicio',
    timestamp: new Date().toISOString(),
    chave_unica: chaveUnica,
    request_id: requestId,
    etapas_executadas: []
  };
  
  try {
    debugInfo.etapas_executadas.push('inicio_processamento');
    console.log(`🚀 [${requestId}] Processando solicitação ${chaveUnica} - Verificação rigorosa ativa`);
    
    debugInfo.etapas_executadas.push('log_inicial');
    console.log(`🔍 [${requestId}] Processando solicitação com proteção anti-duplicação ativa`);
    
    // Validar campos obrigatórios
    const camposObrigatorios = ['matricula', 'pass', 'empregador', 'valor_pedido', 'taxa', 'valor_descontar', 'mes_corrente', 'chave_pix'];
    
    console.log(`🔍 [${requestId}] Validando campos obrigatórios:`, {
      matricula: body.matricula,
      pass: body.pass ? '[PRESENTE]' : '[AUSENTE]',
      empregador: body.empregador,
      valor_pedido: body.valor_pedido,
      taxa: body.taxa,
      valor_descontar: body.valor_descontar,
      mes_corrente: body.mes_corrente,
      chave_pix: body.chave_pix
    });
    
    debugInfo.etapas_executadas.push('validacao_campos');
    for (const campo of camposObrigatorios) {
      if (!body[campo] && body[campo] !== 0) { // Permitir valor 0 para campos numéricos
        debugInfo.etapa = 'erro_validacao_campo';
        debugInfo.campo_ausente = campo;
        console.log(`❌ [${requestId}] Campo obrigatório ausente: ${campo} (valor: ${body[campo]})`);
        return NextResponse.json({
          success: false,
          error: `Campo obrigatório ausente: ${campo}`,
          campo_ausente: campo,
          dados_recebidos: Object.keys(body),
          debug_info: {
            chave_unica: chaveUnica,
            request_id: requestId,
            timestamp: new Date().toISOString(),
            campos_validados: camposObrigatorios,
            valores_recebidos: camposObrigatorios.reduce((acc, c) => {
              acc[c] = body[c] || 'AUSENTE';
              return acc;
            }, {} as any),
            etapas_executadas: debugInfo.etapas_executadas
          }
        }, { 
          status: 400,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
      }
    }
    
    debugInfo.etapas_executadas.push('validacao_concluida');
    
    // Preparar dados para envio ao PHP - CAMPOS CORRETOS PARA AS TABELAS
    debugInfo.etapas_executadas.push('preparando_dados_php');
    const formData = new URLSearchParams();
    formData.append('matricula', body.matricula || '');
    formData.append('valor_pedido', body.valor || body.valor_pedido || ''); // PHP espera 'valor_pedido'
    formData.append('pass', body.pass);
    formData.append('empregador', (body.empregador || 0).toString());
    formData.append('mes_corrente', body.mes_corrente || '');
    formData.append('celular', body.celular || '');
    formData.append('taxa', body.taxa || '0');
    formData.append('valor_descontar', body.valor_descontar || '0');
    formData.append('chave_pix', body.chave_pix || '');
    formData.append('convenio', (body.convenio || 221).toString());
    formData.append('id', (body.id || 0).toString());
    formData.append('id_divisao', (body.id_divisao || 0).toString());
    formData.append('request_id', requestId); // Adicionar request_id ao formData
    
    debugInfo.etapas_executadas.push('dados_php_preparados');
    
    console.log(`🌐 [${requestId}] Enviando para PHP grava_antecipacao_app_fixed.php:`, Object.fromEntries(formData));
    
    // VERIFICAÇÃO CRÍTICA: Marcar que esta requisição está prestes a chamar o PHP
    const timestampEnvio = Date.now();
    
    // Incrementar contador de chamadas PHP
    const contadorAtual = (contadorChamadasPHP.get(chaveUnica) || 0) + 1;
    contadorChamadasPHP.set(chaveUnica, contadorAtual);
    
    console.log(`🚨 [CRÍTICO] INICIANDO CHAMADA PHP - RequestID: ${requestId} - Chave: ${chaveUnica} - Timestamp: ${timestampEnvio}`);
    console.log(`📋 [DADOS PHP] RequestID: ${requestId} - Dados enviados:`, Object.fromEntries(formData));
    console.log(`🔢 [CONTADOR CRÍTICO] Esta é a chamada PHP número ${contadorAtual} para chave: ${chaveUnica}`);
    
    // ALERTA CRÍTICO: Se contador > 1, há duplicação
    if (contadorAtual > 1) {
      console.log(`🚨 [ALERTA DUPLICAÇÃO] DETECTADA MÚLTIPLA CHAMADA PHP! Chave: ${chaveUnica} - Chamada número: ${contadorAtual}`);
      console.log(`🔍 [DEBUG DUPLICAÇÃO] Histórico de chamadas:`, Array.from(contadorChamadasPHP.entries()));
    }
    
    // Fazer chamada para o PHP com ID único
    debugInfo.etapas_executadas.push('iniciando_chamada_php');
    debugInfo.php_request_id = requestId;
    debugInfo.php_timestamp = timestampEnvio;
    
    const response = await axios.post(
      'https://sas.makecard.com.br/grava_antecipacao_app_fixed.php',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Request-ID': requestId, // ID único para rastrear no PHP
        },
        timeout: 30000,
      }
    );
    
    const timestampResposta = Date.now();
    const tempoProcessamento = timestampResposta - timestampEnvio;
    
    console.log(`📥 [RESPOSTA PHP] RequestID: ${requestId} - Status: ${response.status} - Tempo: ${tempoProcessamento}ms`);
    console.log(`📋 [DADOS RESPOSTA] RequestID: ${requestId} - Data:`, response.data);
    console.log(`🔍 [ANÁLISE PHP] RequestID: ${requestId} - Headers:`, response.headers);
    console.log(`✅ [CONFIRMAÇÃO] Chamada PHP ${contadorAtual} completada para chave: ${chaveUnica}`);
    
    // Log detalhado da resposta PHP para análise
    if (response.data) {
      console.log(`📊 [PHP DETALHADO] RequestID: ${requestId} - Tipo resposta:`, typeof response.data);
      console.log(`📊 [PHP DETALHADO] RequestID: ${requestId} - Conteúdo completo:`, JSON.stringify(response.data, null, 2));
      
      // Log específico da verificação de gravação
      if (response.data.debug_info && response.data.debug_info.verificacao_gravacao) {
        console.log(`🔍 [VERIFICAÇÃO GRAVAÇÃO] RequestID: ${requestId}:`, response.data.debug_info.verificacao_gravacao);
      }
    }

    debugInfo.etapas_executadas.push('resposta_php_recebida');
    debugInfo.php_response_status = response.status;
    debugInfo.php_response_data = response.data;
    debugInfo.php_response_headers = response.headers;
    debugInfo.tempo_processamento_php = tempoProcessamento;
    debugInfo.php_response_type = typeof response.data;
    
    // Verificar se houve erro (incluindo erros de duplicata da trigger)
    const temErro = response.status >= 400 ||
                   response.data.success === false || 
                   response.data.success === "false" ||
                   (response.data.message && (
                     response.data.message.toLowerCase().includes("erro") ||
                     response.data.message.toLowerCase().includes("senha") ||
                     response.data.message.toLowerCase().includes("incorreta") ||
                     response.data.message.toLowerCase().includes("inválida") ||
                     response.data.message.toLowerCase().includes("falhou") ||
                     response.data.message.toLowerCase().includes("negado") ||
                     response.data.message.toLowerCase().includes("duplicata") ||
                     response.data.message.toLowerCase().includes("duplicidade") ||
                     response.data.message.toLowerCase().includes("duplicate")
                   ));
    
    if (temErro) {
      const mensagem = response.data.message || 'Erro ao processar solicitação';
      console.log(`❌ [${requestId}] Erro detectado:`, mensagem);
      
      // Remover do rate limiting se deu erro para permitir nova tentativa
      ultimasRequisicoes.delete(chaveUnica);
      
      return NextResponse.json({
        success: false,
        error: mensagem,
        data: response.data,
        debug_info: debugInfo
      }, { 
        status: response.status >= 400 ? response.status : 400,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
    
    // Sucesso - verificar se realmente foi bem-sucedido (detecção mais flexível)
    const isSuccess = response.status === 200 || 
                     response.data.success === true || 
                     response.data.success === "true" ||
                     response.data.success === 1 ||
                     response.data.success === "1" ||
                     response.data.id ||
                     response.data.situacao === 1 ||
                     response.data.situacao === "1" ||
                     (response.data.message && (
                       response.data.message.toLowerCase().includes("sucesso") ||
                       response.data.message.toLowerCase().includes("inseridos") ||
                       response.data.message.toLowerCase().includes("processada") ||
                       response.data.message.toLowerCase().includes("gravado") ||
                       response.data.message.toLowerCase().includes("salvo")
                     )) ||
                     // Se não há erro explícito e status HTTP é 200, considerar sucesso
                     (response.status === 200 && !temErro);
    
    if (isSuccess) {
      console.log(`✅ [${requestId}] Antecipação gravada com sucesso`);
      console.log(`✅ [SUCESSO FINAL] RequestID: ${requestId} - Retornando sucesso com debug_info completo`);
      console.log(`📊 [DEBUG_INFO FINAL] RequestID: ${requestId}:`, JSON.stringify(debugInfo, null, 2));
      
      return NextResponse.json({
        success: true,
        data: response.data,
        message: response.data.message || 'Solicitação processada com sucesso',
        id: response.data.id,
        duplicate_prevented: response.data.duplicate_prevented,
        debug_info: debugInfo
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } else {
      // Resposta ambígua - tratar como erro
      console.log(`❌ [${requestId}] Resposta ambígua do PHP:`, response.data);
      
      // Remover do rate limiting se deu erro para permitir nova tentativa
      ultimasRequisicoes.delete(chaveUnica);
      
      return NextResponse.json({
        success: false,
        error: 'Resposta ambígua do servidor',
        data: response.data,
        debug_info: debugInfo
      }, { 
        status: 400,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
    
  } catch (error) {
    console.error(`💥 [${requestId}] Erro no processamento:`, error);
    
    // Remover do rate limiting se deu erro para permitir nova tentativa
    ultimasRequisicoes.delete(chaveUnica);
    
    let errorMessage = 'Erro interno do servidor';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Timeout na conexão com o servidor';
        statusCode = 408;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        statusCode = error.response.status || 500;
      }
    }
    
    debugInfo.etapa = 'erro_catch';
    debugInfo.error_message = errorMessage;
    debugInfo.error_status = statusCode;
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      debug_info: debugInfo
    }, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}
