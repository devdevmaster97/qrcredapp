import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Registro de solicitações recentes para evitar duplicação
const processedRequests = new Map<string, Date>();

// Limpar registros mais antigos que 1 hora
const cleanupOldRequests = () => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  for (const [key, timestamp] of processedRequests.entries()) {
    if (timestamp < oneHourAgo) {
      processedRequests.delete(key);
    }
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verificar parâmetros necessários
    const { matricula, pass, empregador, valor_pedido, taxa, valor_descontar, mes_corrente, chave_pix } = body;
    
    if (!matricula || !pass || !empregador || !valor_pedido || !taxa || !valor_descontar || !mes_corrente || !chave_pix) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Todos os campos são obrigatórios' 
        },
        { status: 400 }
      );
    }
    
    // Criar uma chave única baseada nos parâmetros da solicitação para evitar duplicação
    const requestKey = `${matricula}_${empregador}_${valor_pedido}_${mes_corrente}`;
    
    // Verificar se esta solicitação específica já foi processada recentemente
    if (processedRequests.has(requestKey)) {
      const timeElapsed = Date.now() - processedRequests.get(requestKey)!.getTime();
      
      // Se a mesma solicitação foi feita nos últimos 30 segundos, considerar duplicada
      if (timeElapsed < 30000) {
        console.log('Solicitação duplicada detectada e bloqueada:', requestKey);
        return NextResponse.json(
          { 
            success: true, 
            message: 'Sua solicitação já foi processada. Aguarde a análise.'
          }
        );
      }
    }
    
    // Limpar registros antigos periodicamente
    cleanupOldRequests();
    
    // Preparar os dados para enviar ao backend
    const payload = new URLSearchParams();
    payload.append('matricula', matricula);
    payload.append('pass', pass);
    payload.append('empregador', empregador.toString());
    payload.append('valor_pedido', valor_pedido.toString());
    payload.append('taxa', taxa.toString());
    payload.append('valor_descontar', valor_descontar.toString());
    payload.append('mes_corrente', mes_corrente);
    payload.append('chave_pix', chave_pix);
    
    console.log('Enviando solicitação de antecipação:', {
      matricula,
      empregador: empregador.toString(),
      valor_pedido: valor_pedido.toString(),
      taxa: taxa.toString(),
      valor_descontar: valor_descontar.toString(),
      mes_corrente,
      chave_pix
    });
    
    // Enviar a requisição para o backend
    const response = await axios.post(
      'https://sas.makecard.com.br/grava_antecipacao_app.php',
      payload,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000, // 10 segundos de timeout
      }
    );
    
    console.log('Resposta da API de antecipação:', response.data);
    
    // Verificar se a resposta tem uma mensagem específica relacionada à senha
    if (response.data && 
        (response.data.message?.includes('Senha') || 
         response.data.message?.includes('senha') || 
         response.data.mensagem?.includes('Senha') || 
         response.data.mensagem?.includes('senha'))) {
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Senha incorreta. Por favor, use a mesma senha de acesso ao app.'
        },
        { status: 401 }
      );
    }
    
    // Se for bem-sucedido, registrar esta solicitação para evitar duplicações
    if (response.data && response.data.success) {
      processedRequests.set(requestKey, new Date());
      return NextResponse.json(response.data);
    } else {
      // Se a API retornou algum erro específico
      return NextResponse.json(
        response.data || { success: false, message: 'Erro desconhecido no processamento da solicitação' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Erro na API de antecipação:', error);
    
    let errorMessage = 'Erro ao processar a requisição';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Timeout na conexão com o servidor';
      } else if (error.response) {
        statusCode = error.response.status;
        errorMessage = `Erro ${statusCode} do servidor`;
        console.log('Dados do erro:', error.response.data);
        
        // Verificar se a resposta do erro contém mensagem sobre senha incorreta
        const responseData = error.response.data;
        if (responseData && 
            (responseData.message?.includes('Senha') || 
             responseData.message?.includes('senha') || 
             responseData.mensagem?.includes('Senha') || 
             responseData.mensagem?.includes('senha'))) {
          
          return NextResponse.json(
            { 
              success: false, 
              message: 'Senha incorreta. Por favor, use a mesma senha de acesso ao app.'
            },
            { status: 401 }
          );
        }
      } else if (error.request) {
        errorMessage = 'Sem resposta do servidor';
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        message: errorMessage, 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: statusCode }
    );
  }
} 