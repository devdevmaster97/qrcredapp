import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    // Enviar a requisição para o backend
    const response = await axios.post(
      'https://sas.makecard.com.br/convenio_categorias_app.php',
      {},
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );

    // Verificar e retornar a resposta
    if (Array.isArray(response.data)) {
      return NextResponse.json(response.data);
    } else {
      console.log('Formato de resposta inesperado:', response.data);
      return NextResponse.json({ error: 'Formato de resposta inesperado' }, { status: 500 });
    }
  } catch (error) {
    console.error('Erro na API de convênios:', error);
    
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