import { NextRequest, NextResponse } from 'next/server';

// Cache para prevenir duplicação de requisições
const requestCache = new Map<string, { timestamp: number; processing: boolean }>();

// Função para limpar cache antigo (mais de 30 segundos)
const cleanOldCache = () => {
  const now = Date.now();
  requestCache.forEach((value, key) => {
    if (now - value.timestamp > 30000) { // 30 segundos
      requestCache.delete(key);
    }
  });
};

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

    // Limpeza periódica do cache
    cleanOldCache();

    // Criar chave única para esta requisição
    const requestKey = `${body.codigo}-${body.nome}-${body.celular}`.toLowerCase().replace(/\s+/g, '');
    const now = Date.now();

    // Verificar se já existe uma requisição igual em andamento ou muito recente
    const existingRequest = requestCache.get(requestKey);
    if (existingRequest) {
      if (existingRequest.processing) {
        console.log('Requisição duplicada detectada (em processamento):', requestKey);
        return NextResponse.json(
          { 
            status: 'erro', 
            mensagem: 'Uma requisição igual já está sendo processada. Aguarde alguns instantes.' 
          },
          { 
            status: 429,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            }
          }
        );
      } else if (now - existingRequest.timestamp < 10000) { // 10 segundos
        console.log('Requisição duplicada detectada (muito recente):', requestKey);
        return NextResponse.json(
          { 
            status: 'sucesso', 
            mensagem: 'Solicitação já foi processada recentemente.' 
          },
          { 
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            }
          }
        );
      }
    }

    // Marcar requisição como em processamento
    requestCache.set(requestKey, { timestamp: now, processing: true });

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
        // Marcar como concluída (erro)
        requestCache.set(requestKey, { timestamp: now, processing: false });
        return NextResponse.json(responseData, { 
          status: response.status,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          }
        });
      }
      
      // Marcar como concluída (sucesso)
      requestCache.set(requestKey, { timestamp: now, processing: false });
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
      // Marcar como concluída (erro de parse)
      requestCache.set(requestKey, { timestamp: now, processing: false });
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
    // Tentar marcar como concluída mesmo em caso de erro geral (se as variáveis existirem)
    try {
      const body = await request.clone().json();
      if (body.codigo && body.nome && body.celular) {
        const requestKey = `${body.codigo}-${body.nome}-${body.celular}`.toLowerCase().replace(/\s+/g, '');
        requestCache.set(requestKey, { timestamp: Date.now(), processing: false });
      }
    } catch (e) {
      // Ignorar erro secundário
    }
    
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