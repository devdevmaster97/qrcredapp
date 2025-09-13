import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

// Cache para controlar requisições em andamento e rate limiting
const requestsEmAndamento = new Map<string, Promise<any>>();
const ultimasRequisicoes = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📥 API Antecipação - Dados recebidos:', body);
    
    // Criar chave única para esta solicitação
    const chaveUnica = `${body.matricula}_${body.empregador}_${body.valor_pedido}_${body.mes_corrente}`;
    const agora = Date.now();
    
    // 1. VERIFICAR RATE LIMITING (30 segundos - mais flexível)
    const ultimaRequisicao = ultimasRequisicoes.get(chaveUnica);
    if (ultimaRequisicao && (agora - ultimaRequisicao) < 30000) { // 30 segundos
      const tempoRestante = Math.ceil((30000 - (agora - ultimaRequisicao)) / 1000);
      console.log(`⏰ Rate limit ativo para ${chaveUnica}. Tempo restante: ${tempoRestante}s`);
      
      return NextResponse.json({
        success: false,
        error: `Aguarde ${tempoRestante} segundos antes de fazer nova solicitação similar`,
        rate_limited: true,
        tempo_restante: tempoRestante
      }, { status: 429 });
    }
    
    // 2. VERIFICAR SE JÁ EXISTE REQUISIÇÃO EM ANDAMENTO
    if (requestsEmAndamento.has(chaveUnica)) {
      console.log(`🔄 Requisição já em andamento para ${chaveUnica}. Aguardando...`);
      
      try {
        // Aguardar a requisição em andamento
        const resultado = await requestsEmAndamento.get(chaveUnica);
        console.log(`✅ Retornando resultado da requisição em andamento para ${chaveUnica}`);
        return resultado;
      } catch (error) {
        console.log(`❌ Erro na requisição em andamento para ${chaveUnica}:`, error);
        // Se deu erro, remover do cache e continuar
        requestsEmAndamento.delete(chaveUnica);
      }
    }
    
    // 3. MARCAR RATE LIMITING ANTES DE PROCESSAR
    ultimasRequisicoes.set(chaveUnica, agora);
    
    // 4. CRIAR PROMISE PARA ESTA REQUISIÇÃO
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
    console.log(`🚀 Processando solicitação ${chaveUnica}`);
    
    // Validar campos obrigatórios
    const camposObrigatorios = ['matricula', 'pass', 'empregador', 'valor_pedido', 'taxa', 'valor_descontar', 'mes_corrente', 'chave_pix'];
    
    for (const campo of camposObrigatorios) {
      if (!body[campo]) {
        console.log(`❌ Campo obrigatório ausente: ${campo}`);
        return NextResponse.json({
          success: false,
          error: `Campo obrigatório ausente: ${campo}`
        }, { status: 400 });
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
    
    // Verificar se houve erro (PHP retorna success como string "true"/"false")
    const temErro = response.status >= 400 ||
                   response.data.success === false || 
                   response.data.success === "false" ||
                   (response.data.message && (
                     response.data.message.toLowerCase().includes("erro") ||
                     response.data.message.toLowerCase().includes("senha") ||
                     response.data.message.toLowerCase().includes("incorreta") ||
                     response.data.message.toLowerCase().includes("inválida") ||
                     response.data.message.toLowerCase().includes("falhou") ||
                     response.data.message.toLowerCase().includes("negado")
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
    
    // Sucesso - verificar se realmente foi bem-sucedido
    const isSuccess = response.data.success === true || 
                     response.data.success === "true" ||
                     response.data.id ||
                     (response.data.message && (
                       response.data.message.toLowerCase().includes("sucesso") ||
                       response.data.message.toLowerCase().includes("inseridos") ||
                       response.data.message.toLowerCase().includes("processada")
                     ));
    
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
