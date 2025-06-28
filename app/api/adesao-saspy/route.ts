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
        { status: 400 }
      );
    }

    // Faz a requisição para a API externa
    const response = await fetch('https://saspy.makecard.com.br/api_associados.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        codigo: body.codigo,
        nome: body.nome,
        celular: body.celular
      }),
    });

    // Lê a resposta da API
    const responseText = await response.text();
    
    try {
      const responseData = JSON.parse(responseText);
      
      if (!response.ok) {
        return NextResponse.json(responseData, { status: response.status });
      }
      
      return NextResponse.json(responseData);
    } catch (parseError) {
      console.error('Erro ao fazer parse da resposta:', parseError);
      return NextResponse.json(
        { 
          status: 'erro', 
          mensagem: 'Erro interno do servidor' 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Erro na API route:', error);
    return NextResponse.json(
      { 
        status: 'erro', 
        mensagem: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
} 