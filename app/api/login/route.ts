import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    // Ler os dados do corpo da requisição
    const formData = await request.formData();
    const cartao = formData.get('cartao');
    const senha = formData.get('senha');

    // Log para diagnóstico
    console.log('API local recebeu requisição de login para cartão:', cartao);

    // Verificar se os dados estão presentes
    if (!cartao || !senha) {
      console.log('Erro: Cartão ou senha ausentes');
      return NextResponse.json(
        { error: 'Cartão e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Limpar o cartão de possíveis formatações
    const cartaoLimpo = String(cartao).replace(/\D/g, '').trim();
    
    console.log('Cartão após limpeza:', cartaoLimpo);

    // Preparar os dados para enviar ao backend
    const payload = new URLSearchParams();
    payload.append('cartao', cartaoLimpo);
    payload.append('senha', String(senha).trim());

    console.log('Enviando para o backend:', payload.toString());

    // Enviar a requisição para o backend
    const response = await axios.post(
      'https://sas.makecard.com.br/localiza_associado_app_2.php',
      payload,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000, // 10 segundos de timeout
      }
    );

    // Log completo da resposta
    console.log('Resposta completa do backend:', JSON.stringify(response.data));

    // Verificação básica da resposta
    if (!response.data || typeof response.data !== 'object') {
      console.log('Resposta inválida do backend');
      return NextResponse.json(
        { error: 'Resposta inválida do servidor' },
        { status: 500 }
      );
    }

    if (typeof response.data.situacao === 'undefined') {
      console.log('Resposta sem campo situacao');
      return NextResponse.json(
        { error: 'Formato de resposta inesperado' },
        { status: 500 }
      );
    }

    // Retornar a resposta para o cliente
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Erro na API de login:', error);
    
    // Tentar fornecer detalhes mais específicos sobre o erro
    let errorMessage = 'Erro ao processar a requisição';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Timeout na conexão com o servidor';
      } else if (error.response) {
        statusCode = error.response.status;
        errorMessage = `Erro ${statusCode} do servidor`;
        console.log('Dados do erro:', error.response.data);
      } else if (error.request) {
        errorMessage = 'Sem resposta do servidor';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: statusCode }
    );
  }
} 