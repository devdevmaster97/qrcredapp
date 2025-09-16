import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

// Cache para controlar requisições em andamento e rate limiting
const requestsEmAndamento = new Map<string, Promise<any>>();
const ultimasRequisicoes = new Map<string, number>();
const execucaoUnica = new Map<string, boolean>(); // Controle de execução única
const timestampExecucao = new Map<string, number>(); // Timestamp de execução para controle absoluto

export async function POST(request: NextRequest) {
  try {
    const requestId = request.headers.get('X-Request-ID') || `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🚨 [${requestId}] API ANTECIPAÇÃO CHAMADA - TIMESTAMP:`, new Date().toISOString());
    const body = await request.json();
    
    console.log(`📥 [${requestId}] API Antecipação - Dados recebidos:`, {
      matricula: body.matricula,
      valor_pedido: body.valor_pedido,
      request_id: body.request_id,
      frontend_request_id: requestId
    });
    
    // Criar chave única para esta solicitação
    const chaveUnica = `${body.matricula}_${body.empregador}_${body.valor_pedido}_${body.mes_corrente}`;
    
    const agora = Date.now();
    console.log(`🔑 [API] Chave única gerada: ${chaveUnica}`);
    console.log(`🔒 [API] Controle execução única:`, Array.from(execucaoUnica.entries()));
    console.log(`⏰ [API] Timestamp execução:`, Array.from(timestampExecucao.entries()));
    
    // 0. VERIFICAÇÃO CRÍTICA BASEADA EM TIMESTAMP (PRIMEIRA LINHA DE DEFESA)
    const ultimoTimestamp = timestampExecucao.get(chaveUnica);
    if (ultimoTimestamp && (agora - ultimoTimestamp) < 5000) { // 5 segundos de proteção absoluta
      console.log(`🚨 [${requestId}] TIMESTAMP BLOQUEIO ABSOLUTO - solicitação ${chaveUnica} executada há ${agora - ultimoTimestamp}ms`);
      return NextResponse.json({
        success: false,
        error: 'Solicitação muito recente. Aguarde alguns segundos.',
        timestamp_blocked: true,
        tempo_desde_ultima: agora - ultimoTimestamp,
        request_id: requestId
      }, { status: 409 });
    }
    
    // 1. VERIFICAÇÃO DE EXECUÇÃO ÚNICA (SEGUNDA LINHA DE DEFESA)
    if (execucaoUnica.has(chaveUnica)) {
      console.log(`🚨 [${requestId}] EXECUÇÃO ÚNICA BLOQUEIO IMEDIATO - solicitação ${chaveUnica} já está sendo executada`);
      return NextResponse.json({
        success: false,
        error: 'Solicitação já está sendo processada. Aguarde a conclusão.',
        execution_blocked: true,
        request_id: requestId
      }, { status: 409 });
    }
    
    // Marcar IMEDIATAMENTE timestamp e execução (ANTES de qualquer outra operação)
    timestampExecucao.set(chaveUnica, agora);
    execucaoUnica.set(chaveUnica, true);
    console.log(`🔐 [${requestId}] TIMESTAMP + EXECUÇÃO MARCADO IMEDIATAMENTE: ${chaveUnica} em ${agora}`);
    
    console.log(`📋 [API] Cache rate limiting atual:`, Array.from(ultimasRequisicoes.entries()));
    console.log(`🔄 [API] Requisições em andamento:`, Array.from(requestsEmAndamento.keys()));
    
    // 2. VERIFICAR RATE LIMITING (60 segundos - mais rigoroso para evitar duplicação)
    const ultimaRequisicao = ultimasRequisicoes.get(chaveUnica);
    if (ultimaRequisicao && (agora - ultimaRequisicao) < 60000) { // 60 segundos
      const tempoRestante = Math.ceil((60000 - (agora - ultimaRequisicao)) / 1000);
      console.log(`⏰ [API] Rate limit ativo para ${chaveUnica}. Última: ${ultimaRequisicao}, Agora: ${agora}, Diferença: ${agora - ultimaRequisicao}ms, Tempo restante: ${tempoRestante}s`);
      
      // Limpar execução única e timestamp se rate limited
      execucaoUnica.delete(chaveUnica);
      timestampExecucao.delete(chaveUnica);
      console.log(`🧹 [LIMPEZA] Rate limit - removido execução e timestamp: ${chaveUnica}`);
      
      return NextResponse.json({
        success: false,
        error: `Aguarde ${tempoRestante} segundos antes de fazer nova solicitação similar`,
        rate_limited: true,
        tempo_restante: tempoRestante
      }, { status: 429 });
    } else {
      console.log(`✅ [API] Rate limiting OK para ${chaveUnica}. Última requisição: ${ultimaRequisicao ? new Date(ultimaRequisicao).toISOString() : 'nunca'}`);
    }
    
    // 2. VERIFICAR SE JÁ EXISTE REQUISIÇÃO EM ANDAMENTO (CRÍTICO PARA EVITAR DUPLICAÇÃO)
    if (requestsEmAndamento.has(chaveUnica)) {
      console.log(`🔄 [ANTI-DUPLICAÇÃO] Requisição já em andamento para ${chaveUnica}. Bloqueando requisição duplicada.`);
      // Limpar execução única e timestamp se já há requisição em andamento
      execucaoUnica.delete(chaveUnica);
      timestampExecucao.delete(chaveUnica);
      console.log(`🧹 [LIMPEZA] Requisição em andamento - removido execução e timestamp: ${chaveUnica}`);
      
      return NextResponse.json({
        success: false,
        error: 'Solicitação já está sendo processada. Aguarde a conclusão.',
        duplicate_blocked: true
      }, { status: 409 }); // 409 Conflict
    }
    
    // 3. MARCAR RATE LIMITING ANTES DE PROCESSAR (CRÍTICO PARA EVITAR DUPLICAÇÃO)
    console.log(`🔒 [API] Marcando rate limiting ANTES do processamento para ${chaveUnica} em ${agora}`);
    ultimasRequisicoes.set(chaveUnica, agora);
    
    // 4. VERIFICAÇÃO ADICIONAL: Aguardar 100ms para garantir que não há requisições simultâneas
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verificar novamente se não foi criada uma requisição em andamento durante o delay
    if (requestsEmAndamento.has(chaveUnica)) {
      console.log(`🚨 [ANTI-DUPLICAÇÃO] Requisição criada durante delay para ${chaveUnica}. Bloqueando.`);
      // Limpar execução única e timestamp se detectou duplicata durante delay
      execucaoUnica.delete(chaveUnica);
      timestampExecucao.delete(chaveUnica);
      console.log(`🧹 [LIMPEZA] Duplicata durante delay - removido execução e timestamp: ${chaveUnica}`);
      
      return NextResponse.json({
        success: false,
        error: 'Solicitação duplicada detectada durante processamento',
        duplicate_blocked_delay: true
      }, { status: 409 });
    }
    
    // 5. CRIAR PROMISE PARA ESTA REQUISIÇÃO
    console.log(`🚀 [API] Criando promise de processamento para ${chaveUnica}`);
    const promiseRequisicao = processarSolicitacao(body, chaveUnica);
    requestsEmAndamento.set(chaveUnica, promiseRequisicao);
    
    try {
      const resultado = await promiseRequisicao;
      return resultado;
    } finally {
      // Limpar cache após processamento
      requestsEmAndamento.delete(chaveUnica);
      execucaoUnica.delete(chaveUnica);
      timestampExecucao.delete(chaveUnica);
      console.log(`🧹 [LIMPEZA FINAL] Removido todos os controles para ${chaveUnica}`);
    }
    
  } catch (error) {
    console.error('💥 Erro na API de antecipação:', error);
    
    // Limpar todos os controles em caso de erro
    console.log(`🧹 [LIMPEZA GERAL] Erro - removendo todos os controles`);
    execucaoUnica.clear();
    timestampExecucao.clear();
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
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

async function processarSolicitacao(body: any, chaveUnica: string) {
  try {
    console.log(`🚀 [ANTI-DUPLICAÇÃO] Processando solicitação ${chaveUnica} - Verificação rigorosa ativa`);
    
    console.log(`🔍 [${chaveUnica}] Processando solicitação com proteção anti-duplicação ativa`);
    
    // Validar campos obrigatórios
    const camposObrigatorios = ['matricula', 'pass', 'empregador', 'valor_pedido', 'taxa', 'valor_descontar', 'mes_corrente', 'chave_pix'];
    
    console.log(`🔍 [${chaveUnica}] Validando campos obrigatórios:`, {
      matricula: body.matricula,
      pass: body.pass ? '[PRESENTE]' : '[AUSENTE]',
      empregador: body.empregador,
      valor_pedido: body.valor_pedido,
      taxa: body.taxa,
      valor_descontar: body.valor_descontar,
      mes_corrente: body.mes_corrente,
      chave_pix: body.chave_pix
    });
    
    for (const campo of camposObrigatorios) {
      if (!body[campo] && body[campo] !== 0) { // Permitir valor 0 para campos numéricos
        console.log(`❌ [${chaveUnica}] Campo obrigatório ausente: ${campo} (valor: ${body[campo]})`);
        return NextResponse.json({
          success: false,
          error: `Campo obrigatório ausente: ${campo}`,
          campo_ausente: campo,
          dados_recebidos: Object.keys(body)
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
    
    // Preparar dados para envio ao PHP
    const formData = new URLSearchParams();
    formData.append('matricula', body.matricula || '');
    formData.append('pass', body.pass);
    formData.append('empregador', (body.empregador || 0).toString());
    formData.append('valor_pedido', body.valor_pedido);
    formData.append('taxa', body.taxa);
    formData.append('valor_descontar', body.valor_descontar);
    formData.append('mes_corrente', body.mes_corrente || '');
    formData.append('chave_pix', body.chave_pix);
    formData.append('id', (body.id || 0).toString());
    formData.append('id_divisao', (body.id_divisao || 0).toString());
    
    console.log(`🌐 [${chaveUnica}] Enviando para PHP grava_antecipacao_app.php:`, Object.fromEntries(formData));
    
    console.log(`🔒 [ANTI-DUPLICAÇÃO] Enviando para PHP com proteção ativa`);
    
    // VERIFICAÇÃO CRÍTICA: Marcar que esta requisição está prestes a chamar o PHP
    const timestampEnvio = Date.now();
    const requestId = `${timestampEnvio}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🚨 [CRÍTICO] INICIANDO CHAMADA PHP - RequestID: ${requestId} - Chave: ${chaveUnica} - Timestamp: ${timestampEnvio}`);
    console.log(`📋 [DADOS PHP] RequestID: ${requestId} - Dados enviados:`, Object.fromEntries(formData));
    
    // Fazer chamada para o PHP com ID único
    const response = await axios.post(
      'https://sas.makecard.com.br/grava_antecipacao_app.php',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Request-ID': requestId, // ID único para rastrear no PHP
          'X-Chave-Unica': chaveUnica // Chave única para debug
        },
        timeout: 15000,
        validateStatus: () => true // Não rejeitar por status HTTP
      }
    );
    
    const timestampResposta = Date.now();
    const tempoProcessamento = timestampResposta - timestampEnvio;
    
    console.log(`📥 [RESPOSTA PHP] RequestID: ${requestId} - Status: ${response.status} - Tempo: ${tempoProcessamento}ms`);
    console.log(`📋 [DADOS RESPOSTA] RequestID: ${requestId} - Data:`, response.data);
    console.log(`✅ [CRÍTICO] CHAMADA PHP CONCLUÍDA - RequestID: ${requestId} - Chave: ${chaveUnica} - Timestamp: ${timestampResposta}`);
    
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
      console.log(`❌ [${chaveUnica}] Erro detectado:`, mensagem);
      
      // Remover do rate limiting se deu erro para permitir nova tentativa
      ultimasRequisicoes.delete(chaveUnica);
      
      return NextResponse.json({
        success: false,
        error: mensagem,
        data: response.data
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
      console.log(`✅ [${chaveUnica}] Antecipação gravada com sucesso`);
      return NextResponse.json({
        success: true,
        data: response.data,
        message: response.data.message || 'Solicitação processada com sucesso',
        id: response.data.id,
        duplicate_prevented: response.data.duplicate_prevented
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } else {
      // Resposta ambígua - tratar como erro
      console.log(`❌ [${chaveUnica}] Resposta ambígua do PHP:`, response.data);
      ultimasRequisicoes.delete(chaveUnica);
      
      return NextResponse.json({
        success: false,
        error: response.data.message || 'Resposta inesperada do servidor',
        data: response.data
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
    console.error(`💥 [${chaveUnica}] Erro no processamento:`, error);
    
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
      } else if (error.message) {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage
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
