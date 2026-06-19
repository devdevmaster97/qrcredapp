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
    
    // LIMPEZA GLOBAL: Limpar TODAS as entradas antigas de TODOS os Maps
    const TEMPO_EXPIRACAO = 10000; // 10 segundos
    let entradasLimpas = 0;
    
    for (const [chave, timestamp] of Array.from(timestampExecucao.entries())) {
      const tempoDecorrido = agora - timestamp;
      if (tempoDecorrido > TEMPO_EXPIRACAO) {
        timestampExecucao.delete(chave);
        execucaoUnica.delete(chave);
        ultimasRequisicoes.delete(chave);
        requestsEmAndamento.delete(chave);
        promisesEmAndamento.delete(chave);
        contadorChamadasPHP.delete(chave);
        entradasLimpas++;
      }
    }
    
    if (entradasLimpas > 0) {
      console.log(`🧹 [LIMPEZA GLOBAL] ${entradasLimpas} entrada(s) antiga(s) removida(s) de todos os Maps`);
    }
    
    // LIMPEZA ESPECÍFICA: Limpar cache desta chave se existir e for antiga
    if (timestampExecucao.has(chaveUnica)) {
      const tempoDecorrido = agora - timestampExecucao.get(chaveUnica)!;
      if (tempoDecorrido > TEMPO_EXPIRACAO) {
        timestampExecucao.delete(chaveUnica);
        execucaoUnica.delete(chaveUnica);
        ultimasRequisicoes.delete(chaveUnica);
        requestsEmAndamento.delete(chaveUnica);
        promisesEmAndamento.delete(chaveUnica);
        contadorChamadasPHP.delete(chaveUnica);
        console.log(`🧹 [LIMPEZA ESPECÍFICA] Cache antigo removido para ${chaveUnica} (${tempoDecorrido}ms)`);
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

    // =====================================================
    // 📱 RASTREAMENTO DE DISPOSITIVO - diagnóstico de saldo
    // =====================================================
    console.log(`📱 [${requestId}] DISPOSITIVO DO USUÁRIO:`, {
      matricula: body.matricula,
      user_agent: body.device_user_agent || 'não informado',
      platform: body.device_platform || 'não informado',
      saldo_calculado_no_dispositivo: body.saldo_no_momento ?? 'não informado',
      limite_no_dispositivo: body.limite_no_momento ?? 'não informado',
      total_conta_no_dispositivo: body.total_conta_no_momento ?? 'não informado',
      valor_solicitado: body.valor_pedido,
      mes_corrente: body.mes_corrente,
      timestamp: new Date().toISOString(),
    });
    // =====================================================
    
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
    
    // Log crítico: verificar valor_pedido ANTES de montar formData
    console.log(`🔍 [${requestId}] VERIFICAÇÃO CRÍTICA - Valor recebido do frontend:`, {
      valor_pedido: body.valor_pedido,
      tipo: typeof body.valor_pedido,
      vazio: !body.valor_pedido
    });
    
    const formData = new URLSearchParams();
    formData.append('matricula', body.matricula || '');
    formData.append('valor_pedido', body.valor_pedido || ''); // PHP espera 'valor_pedido'
    formData.append('pass', body.pass);
    formData.append('empregador', (body.empregador || 0).toString());
    formData.append('mes_corrente', body.mes_corrente || '');
    formData.append('celular', body.device_user_agent || body.celular || '');
    formData.append('taxa', body.taxa || '0');
    formData.append('valor_descontar', body.valor_descontar || '0');
    formData.append('chave_pix', body.chave_pix || '');
    formData.append('convenio', (body.convenio || 221).toString());
    formData.append('id', (body.id || 0).toString());
    formData.append('id_divisao', (body.id_divisao || 0).toString());
    formData.append('request_id', requestId); // Adicionar request_id ao formData
    
    debugInfo.etapas_executadas.push('dados_php_preparados');
    
    console.log(`🌐 [${requestId}] Enviando para PHP grava_antecipacao_app_fixed_4.php:`, Object.fromEntries(formData));
    console.log(`💰 [${requestId}] VALOR_PEDIDO NO FORMDATA:`, formData.get('valor_pedido'));
    
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
      'https://sas.makecard.com.br/grava_antecipacao_app_fixed_4.php',
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
      
      // LOGS CRÍTICOS PARA DEBUG
      console.log(`🚨 [CRÍTICO] PHP Response.data.success:`, response.data.success, `(tipo: ${typeof response.data.success})`);
      console.log(`🚨 [CRÍTICO] PHP Response.data.message:`, response.data.message);
      console.log(`🚨 [CRÍTICO] PHP Response.data.id:`, response.data.id);
      console.log(`🚨 [CRÍTICO] PHP Response.data.error:`, response.data.error);
      
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
    
    // LOG CRÍTICO: Mostrar TODA a resposta do PHP
    console.log(`🔍 [ANÁLISE COMPLETA] RequestID: ${requestId} - Resposta PHP COMPLETA:`, {
      status: response.status,
      data: response.data,
      data_type: typeof response.data,
      data_keys: response.data ? Object.keys(response.data) : [],
      success_value: response.data?.success,
      success_type: typeof response.data?.success,
      message: response.data?.message,
      error: response.data?.error,
      antecipacao_id: response.data?.antecipacao_id,
      conta_id: response.data?.conta_id,
      raw_response: JSON.stringify(response.data)
    });
    
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
    
    console.log(`🔍 [VALIDAÇÃO ERRO] RequestID: ${requestId} - temErro: ${temErro}`, {
      status_maior_400: response.status >= 400,
      success_false: response.data.success === false,
      success_string_false: response.data.success === "false",
      message_contem_erro: response.data.message ? 'verificando...' : 'sem message'
    });
    
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
    
    // ✅ VALIDAÇÃO RIGOROSA: Verificar se IDs foram retornados
    const antecipacaoId = response.data.antecipacao_id;
    const contaId = response.data.conta_id;
    
    console.log(`🔍 [VALIDAÇÃO IDS] RequestID: ${requestId}:`, {
      antecipacao_id: antecipacaoId,
      conta_id: contaId,
      success: response.data.success
    });
    
    // Sucesso SOMENTE se:
    // 1. success === true
    // 2. antecipacao_id está presente e é válido
    // 3. conta_id está presente e é válido
    const idsValidos = antecipacaoId && contaId && 
                       antecipacaoId > 0 && contaId > 0;
    
    const isSuccess = response.data.success === true && idsValidos;
    
    if (!idsValidos && response.data.success === true) {
      console.log(`⚠️ [ALERTA] RequestID: ${requestId} - PHP retornou success=true mas IDs inválidos!`);
      console.log(`📋 [IDS RECEBIDOS]:`, {
        antecipacao_id: antecipacaoId,
        conta_id: contaId,
        tipo_antecipacao: typeof antecipacaoId,
        tipo_conta: typeof contaId
      });
    }
    
    if (isSuccess) {
      console.log(`✅ [${requestId}] Antecipação gravada com sucesso - IDs confirmados`);
      console.log(`✅ [SUCESSO FINAL] RequestID: ${requestId} - Antecipação ID: ${antecipacaoId}, Conta ID: ${contaId}`);
      console.log(`📊 [DEBUG_INFO FINAL] RequestID: ${requestId}:`, JSON.stringify(debugInfo, null, 2));
      
      return NextResponse.json({
        success: true,
        data: response.data,
        message: response.data.message || 'Solicitação processada com sucesso',
        antecipacao_id: antecipacaoId,
        conta_id: contaId,
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
      // Falha na validação - IDs não retornados ou inválidos
      const motivoFalha = !response.data.success 
        ? 'PHP retornou success=false'
        : 'IDs não foram retornados ou são inválidos';
      
      console.log(`❌ [${requestId}] Validação falhou: ${motivoFalha}`);
      console.log(`📋 [DETALHES FALHA]:`, {
        success: response.data.success,
        antecipacao_id: antecipacaoId,
        conta_id: contaId,
        message: response.data.message,
        error: response.data.error
      });
      
      // Remover do rate limiting se deu erro para permitir nova tentativa
      ultimasRequisicoes.delete(chaveUnica);
      
      return NextResponse.json({
        success: false,
        error: response.data.error || motivoFalha,
        message: response.data.message,
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
