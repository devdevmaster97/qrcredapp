import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Valida os dados recebidos
    if (!body.codigo || !body.nome || !body.celular) {
      return NextResponse.json(
        { 
          status: 'erro', 
          mensagem: 'Dados incompletos. Código, nome e celular são obrigatórios.' 
        },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          }
        }
      );
    }

    console.log('Enviando dados para API externa:', { codigo: body.codigo, nome: body.nome, celular: body.celular });

    // Faz a requisição para a API externa PHP
    const response = await fetch('https://sas.makecard.com.br/api_associados.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        codigo: body.codigo,
        nome: body.nome,
        celular: body.celular
      }),
    });

    // Lê a resposta da API
    const responseText = await response.text();
    console.log('Resposta da API externa:', responseText);
    
    try {
      const responseData = JSON.parse(responseText);
      
      if (!response.ok) {
        return NextResponse.json(responseData, { 
          status: response.status,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          }
        });
      }
      
      return NextResponse.json(responseData, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        }
      });
    } catch (parseError) {
      console.error('Erro ao fazer parse da resposta:', parseError);
      console.error('Resposta original:', responseText);
      return NextResponse.json(
        { 
          status: 'erro', 
          mensagem: 'Erro ao processar resposta da API externa'
        },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          }
        }
      );
    }

  } catch (error) {
    console.error('Erro na API route:', error);
    return NextResponse.json(
      { 
        status: 'erro', 
        mensagem: error instanceof Error ? error.message : 'Erro interno do servidor'
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        }
      }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  // Responder a requisições OPTIONS (preflight) para CORS
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    },
  });
} 