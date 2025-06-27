import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    let cartao: string;
    
    // Verificar o Content-Type e processar a request apropriadamente
    const contentType = request.headers.get('Content-Type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      cartao = formData.get('cartao') as string;
      
      if (!cartao) {
        return NextResponse.json(
          { error: 'Cartão é obrigatório' },
          { status: 400 }
        );
      }
    } else {
      // Assume JSON
      try {
        const body = await request.json();
        cartao = body.cartao;
        
        if (!cartao) {
          return NextResponse.json(
            { error: 'Cartão é obrigatório' },
            { status: 400 }
          );
        }
      } catch (e) {
        console.error('Erro ao fazer parse do JSON:', e);
        return NextResponse.json(
          { error: 'Formato de requisição inválido' },
          { status: 400 }
        );
      }
    }
    
    // Debug dos parâmetros recebidos
    console.log('Parâmetros recebidos:', { cartao });

    // Limpar o cartão de possíveis formatações
    const cartaoLimpo = String(cartao).replace(/\D/g, '').trim();

    // Preparar os dados para enviar ao backend
    const payload = new URLSearchParams();
    payload.append('cartao', cartaoLimpo);
    
    console.log('Dados sendo enviados para localiza_associado_app_2.php:', {
      cartao: cartaoLimpo
    });
    
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

    console.log('Resposta do endpoint localiza_associado:', response.data);

    // Verificar e retornar a resposta
    if (response.data && response.data.matricula && response.data.empregador) {
      return NextResponse.json(response.data);
    } else {
      console.log('Formato de resposta inesperado:', response.data);
      return NextResponse.json({ error: 'Formato de resposta inesperado' }, { status: 500 });
    }
  } catch (error) {
    console.error('Erro na API de localização:', error);
    
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