import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Proxy para requisições à API externa, contornando restrições de CORS
 */
export async function POST(request: NextRequest) {
  try {
    // Extrair os parâmetros da requisição
    const formData = await request.formData();
    const targetEndpoint = formData.get('endpoint') as string;
    
    if (!targetEndpoint) {
      return NextResponse.json({ error: 'Endpoint não especificado' }, { status: 400 });
    }
    
    // Construir a URL completa
    const baseUrl = 'https://sas.makecard.com.br';
    const targetUrl = `${baseUrl}/${targetEndpoint}`;
    
    console.log('🔄 Proxy: encaminhando requisição para', targetUrl);
    
    // Remover o parâmetro 'endpoint' dos dados a serem enviados
    formData.delete('endpoint');
    
    // Converter formData para URLSearchParams
    const params = new URLSearchParams();
    formData.forEach((value, key) => {
      params.append(key, value.toString());
    });
    
    // Realizar a requisição para a API externa
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });
    
    // Ler a resposta como texto
    const responseText = await response.text();
    console.log('🔄 Proxy: resposta recebida', {
      status: response.status,
      body: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '')
    });
    
    // Retornar a resposta
    return new NextResponse(responseText, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Erro no proxy:', error);
    return NextResponse.json({ error: 'Erro ao processar requisição proxy' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Obter o endpoint da query string
    const { searchParams } = new URL(request.url);
    const targetEndpoint = searchParams.get('endpoint');
    
    if (!targetEndpoint) {
      return NextResponse.json({ error: 'Endpoint não especificado' }, { status: 400 });
    }
    
    // Construir a URL completa
    const baseUrl = 'https://sas.makecard.com.br';
    const targetUrl = `${baseUrl}/${targetEndpoint}`;
    
    console.log('🔄 Proxy: encaminhando requisição GET para', targetUrl);
    
    // Realizar a requisição para a API externa
    const response = await fetch(targetUrl, {
      method: 'GET'
    });
    
    // Ler a resposta como texto
    const responseText = await response.text();
    console.log('🔄 Proxy: resposta GET recebida', {
      status: response.status,
      body: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '')
    });
    
    // Retornar a resposta
    return new NextResponse(responseText, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Erro no proxy GET:', error);
    return NextResponse.json({ error: 'Erro ao processar requisição proxy' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 