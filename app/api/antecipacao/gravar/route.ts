import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

// Cache para controlar requisições em andamento e rate limiting
const requestsEmAndamento = new Map<string, Promise<any>>();
const ultimasRequisicoes = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    console.log('🚨 API ANTECIPAÇÃO CHAMADA - TIMESTAMP:', new Date().toISOString());
    const body = await request.json();
    
    console.log('📥 API Antecipação - Dados recebidos:', body);
    
    // Criar chave única para esta solicitação
    const chaveUnica = `${body.matricula}_${body.empregador}_${body.valor_pedido}_${body.mes_corrente}`;
    const agora = Date.now();
    
    console.log(`🔑 [API] Chave única gerada: ${chaveUnica}`);
    console.log(`⏰ [API] Timestamp atual: ${agora}`);
    console.log(`📋 [API] Cache rate limiting atual:`, Array.from(ultimasRequisicoes.entries()));
    console.log(`🔄 [API] Requisições em andamento:`, Array.from(requestsEmAndamento.keys()));
    
    // 1. VERIFICAR RATE LIMITING (60 segundos - mais rigoroso para evitar duplicação)
    const ultimaRequisicao = ultimasRequisicoes.get(chaveUnica);
    if (ultimaRequisicao && (agora - ultimaRequisicao) < 60000) { // 60 segundos
      const tempoRestante = Math.ceil((60000 - (agora - ultimaRequisicao)) / 1000);
      console.log(`⏰ [API] Rate limit ativo para ${chaveUnica}. Última: ${ultimaRequisicao}, Agora: ${agora}, Diferença: ${agora - ultimaRequisicao}ms, Tempo restante: ${tempoRestante}s`);
      
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
      
      return NextResponse.json({
        success: false,
        error: 'Solicitação já está sendo processada. Aguarde a conclusão.',
        duplicate_blocked: true
      }, { status: 409 }); // 409 Conflict
    }
    
    // 3. MARCAR RATE LIMITING ANTES DE PROCESSAR (CRÍTICO PARA EVITAR DUPLICAÇÃO)
    console.log(`🔒 [API] Marcando rate limiting ANTES do processamento para ${chaveUnica} em ${agora}`);
    ultimasRequisicoes.set(chaveUnica, agora);
    
    // 4. CRIAR PROMISE PARA ESTA REQUISIÇÃO
    console.log(`🚀 [API] Criando promise de processamento para ${chaveUnica}`);
    const promiseRequisicao = processarSolicitacao(body, chaveUnica);
    requestsEmAndamento.set(chaveUnica, promiseRequisicao);
    
    try {
      const resultado = await promiseRequisicao;
      return resultado;
    } finally {
      // Limpar cache após processamento
      requestsEmAndamento.delete(chaveUnica);
    }
    
  } catch (error) {
    console.error('💥 Erro na API de antecipação:', error);
    
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
    
    // VERIFICAÇÃO ADICIONAL: Se por algum motivo chegou até aqui, verificar novamente
    const agora = Date.now();
    const ultimaRequisicao = ultimasRequisicoes.get(chaveUnica);
    
    if (ultimaRequisicao && (agora - ultimaRequisicao) < 5000) { // 5 segundos de proteção adicional
      console.log(`🚨 [ANTI-DUPLICAÇÃO] Bloqueando processamento - requisição muito recente (${agora - ultimaRequisicao}ms)`);
      return NextResponse.json({
        success: false,
        error: 'Solicitação duplicada detectada e bloqueada',
        duplicate_prevented: true
      }, { status: 409 });
    }
    
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
    
    // VERIFICAÇÃO FINAL ANTES DE ENVIAR PARA O PHP
    const verificacaoFinal = Date.now();
    const ultimaVerificacao = ultimasRequisicoes.get(chaveUnica);
    if (ultimaVerificacao && (verificacaoFinal - ultimaVerificacao) < 2000) { // 2 segundos de proteção final
      console.log(`🚨 [ANTI-DUPLICAÇÃO FINAL] Bloqueando envio para PHP - muito próximo da última requisição (${verificacaoFinal - ultimaVerificacao}ms)`);
      return NextResponse.json({
        success: false,
        error: 'Solicitação duplicada detectada antes do envio ao servidor',
        duplicate_prevented_final: true
      }, { status: 409 });
    }
    
    // Atualizar timestamp antes do envio
    ultimasRequisicoes.set(chaveUnica, verificacaoFinal);
    console.log(`🔒 [ANTI-DUPLICAÇÃO] Timestamp atualizado antes do envio: ${verificacaoFinal}`);
    
    // Fazer chamada para o PHP
    const response = await axios.post(
      'https://sas.makecard.com.br/grava_antecipacao_app.php',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        timeout: 15000,
        validateStatus: () => true // Não rejeitar por status HTTP
      }
    );
    
    console.log(`📥 [${chaveUnica}] Resposta do PHP:`, {
      status: response.status,
      data: response.data
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
