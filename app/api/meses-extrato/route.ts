import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    // Ler os dados do corpo da requisição
    const formData = await request.formData();
    const cartao = formData.get('cartao');
    const divisao = formData.get('divisao');

    // Verificar se os dados estão presentes
    if (!cartao) {
      return NextResponse.json(
        { error: 'Cartão é obrigatório' },
        { status: 400 }
      );
    }

    // Limpar o cartão de possíveis formatações
    const cartaoLimpo = String(cartao).replace(/\D/g, '').trim();

    // Preparar os dados para enviar ao backend
    const payload = new URLSearchParams();
    payload.append('cartao', cartaoLimpo);
    if (divisao) {
      const divisaoInt = parseInt(String(divisao), 10);
      if (!isNaN(divisaoInt)) {
        payload.append('divisao', divisaoInt.toString());
      }
    }

    console.log('Enviando requisição para buscar meses de extrato para cartão:', cartaoLimpo);
    console.log('Payload enviado:', payload.toString());

    // Enviar a requisição para o backend
    const response = await axios.post(
      'https://sas.makecard.com.br/meses_conta_app.php',
      payload,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000, // 10 segundos de timeout
      }
    );

    // Log da resposta
    console.log('Resposta da API de meses de extrato:', response.data);
    console.log('Tipo da resposta:', typeof response.data);
    console.log('É array?', Array.isArray(response.data));

    // Verificar e processar a resposta
    if (!response.data) {
      console.log('Resposta vazia da API');
      return NextResponse.json([]);
    }

    // Se não for array, tentar converter ou retornar array vazio
    if (!Array.isArray(response.data)) {
      console.log('Resposta não é array, tentando processar:', response.data);
      
      // Se for um objeto com erro, retornar o erro
      if (response.data && typeof response.data === 'object' && response.data.error) {
        return NextResponse.json(
          { error: response.data.error },
          { status: 400 }
        );
      }
      
      // Se for outro tipo de dados, retornar array vazio
      return NextResponse.json([]);
    }

    // Retornar a resposta para o cliente
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Erro na API de meses de extrato:', error);
    
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