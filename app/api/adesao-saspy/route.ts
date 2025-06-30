import { NextRequest, NextResponse } from 'next/server';

// Cache para prevenir duplicação de requisições
const requestCache = new Map<string, { timestamp: number; processing: boolean }>();

// Mutex global para prevenir concorrência por código
const processingMutex = new Map<string, Promise<any>>();

// Função para limpar cache antigo (mais de 30 segundos)
const cleanOldCache = () => {
  const now = Date.now();
  requestCache.forEach((value, key) => {
    if (now - value.timestamp > 30000) { // 30 segundos
      requestCache.delete(key);
    }
  });
};

// Função para aguardar um período
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
  let codigoKey = '';
  let resolveProcessing: (() => void) | undefined;
  
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

    // Criar chave única baseada apenas no código para mutex
    codigoKey = body.codigo.toString().trim();
    const requestKey = `${body.codigo}-${body.nome}-${body.celular}`.toLowerCase().replace(/\s+/g, '');
    const now = Date.now();

    console.log(`🔒 Tentando obter lock para código: ${codigoKey}`);

    // 🔒 MUTEX GLOBAL POR CÓDIGO - Impede processamento simultâneo do mesmo código
    if (processingMutex.has(codigoKey)) {
      console.log(`⏳ Código ${codigoKey} já está sendo processado. Aguardando...`);
      try {
        await processingMutex.get(codigoKey);
        // Após aguardar, verificar se foi processado
        console.log(`🔍 Verificando se código ${codigoKey} foi processado durante a espera...`);
        
        // Delay adicional para garantir que a gravação foi completada
        await sleep(1000);
        
        const verificaResponse = await fetch('https://sas.makecard.com.br/api_verificar_adesao_sasmais.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ codigo: codigoKey }),
        });

        if (verificaResponse.ok) {
          const verificaData = JSON.parse(await verificaResponse.text());
          if (verificaData?.jaAderiu === true) {
            console.log(`✅ Código ${codigoKey} foi processado por outra requisição`);
            return NextResponse.json(
              { 
                status: 'sucesso', 
                mensagem: 'Adesão já foi processada por requisição simultânea.' 
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
      } catch (e) {
        console.log(`⚠️ Erro ao aguardar mutex para ${codigoKey}:`, e);
      }
    }

    // Criar uma promise para o mutex
    const processingPromise = new Promise<void>((resolve) => {
      resolveProcessing = resolve;
    });
    
    processingMutex.set(codigoKey, processingPromise);

    console.log(`🔓 Lock obtido para código: ${codigoKey}`);

    // Verificar cache de requisições recentes
    const existingRequest = requestCache.get(requestKey);
    if (existingRequest) {
      if (existingRequest.processing) {
        console.log('⚠️ Requisição duplicada detectada (em processamento):', requestKey);
        return NextResponse.json(
          { 
            status: 'erro', 
            mensagem: 'Uma requisição igual já está sendo processada.' 
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
        console.log('⚠️ Requisição muito recente detectada:', requestKey);
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

    // 🔍 VERIFICAÇÃO CRÍTICA: Verificar se o associado já existe na tabela antes de gravar
    console.log('🔍 Verificação CRÍTICA: Consultando se código já existe na tabela...');
    
    const verificaResponse = await fetch('https://sas.makecard.com.br/api_verificar_adesao_sasmais.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        codigo: body.codigo
      }),
    });

    if (verificaResponse.ok) {
      const verificaText = await verificaResponse.text();
      try {
        const verificaData = JSON.parse(verificaText);
        
        if (verificaData?.status === 'sucesso' && verificaData?.jaAderiu === true) {
          console.log('🚫 DUPLICAÇÃO EVITADA: Associado já existe na tabela!');
          requestCache.set(requestKey, { timestamp: now, processing: false });
          return NextResponse.json(
            { 
              status: 'erro', 
              mensagem: 'Associado já aderiu ao Sascred anteriormente. Duplicação evitada.'
            },
            { 
              status: 409, // Conflict
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
              }
            }
          );
        }
        
        console.log('✅ Verificação OK: Associado não existe na tabela, prosseguindo...');
      } catch (e) {
        console.log('⚠️ Erro no parse da verificação, mas prosseguindo com cautela');
      }
    } else {
      console.log('⚠️ Erro na verificação de duplicação, mas prosseguindo com cautela');
    }

    console.log('📤 Enviando dados para API externa:', { codigo: body.codigo, nome: body.nome, celular: body.celular });

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
    console.log('📥 Resposta da API externa:', responseText);
    
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
      
      console.log('🎉 Adesão gravada com sucesso!');
      
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
      console.error('❌ Erro ao fazer parse da resposta:', parseError);
      console.error('📄 Resposta original:', responseText);
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
    console.error('💥 Erro geral na API route:', error);
    
    // Tentar marcar como concluída mesmo em caso de erro geral
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
  } finally {
    // Liberar o mutex sempre, independente do resultado
    if (codigoKey && resolveProcessing) {
      console.log(`🔓 Liberando lock para código: ${codigoKey}`);
      resolveProcessing();
      processingMutex.delete(codigoKey);
    }
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