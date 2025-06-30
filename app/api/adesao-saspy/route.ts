import { NextRequest, NextResponse } from 'next/server';

// Cache para prevenir duplicação de requisições
const requestCache = new Map<string, { timestamp: number; processing: boolean }>();

// Cache específico para códigos já processados (CRÍTICO)
const processedCodes = new Map<string, { timestamp: number; data: any }>();

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
  
  // Limpar cache de códigos processados (após 5 minutos)
  processedCodes.forEach((value, key) => {
    if (now - value.timestamp > 300000) { // 5 minutos
      processedCodes.delete(key);
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

    console.log(`🔒 [${new Date().toISOString()}] Tentando processar código: ${codigoKey}`);

    // 🚫 VERIFICAÇÃO CACHE LOCAL PRIMEIRO (mais rápido que banco)
    if (processedCodes.has(codigoKey)) {
      const cached = processedCodes.get(codigoKey)!;
      console.log(`🏆 CACHE HIT: Código ${codigoKey} já foi processado às ${new Date(cached.timestamp).toISOString()}`);
      return NextResponse.json(
        { 
          status: 'sucesso', 
          mensagem: 'Código já foi processado anteriormente (cache local).',
          cached: true
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

    // 🔒 MUTEX GLOBAL POR CÓDIGO - Impede processamento simultâneo do mesmo código
    if (processingMutex.has(codigoKey)) {
      console.log(`⏳ Código ${codigoKey} já está sendo processado. Aguardando mutex...`);
      try {
        await processingMutex.get(codigoKey);
        
        // Verificar cache novamente após aguardar
        if (processedCodes.has(codigoKey)) {
          console.log(`✅ Código ${codigoKey} foi processado durante a espera`);
          return NextResponse.json(
            { 
              status: 'sucesso', 
              mensagem: 'Código foi processado por requisição simultânea.' 
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
        
        // Delay adicional e verificar banco
        await sleep(1500);
        
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
            console.log(`✅ Código ${codigoKey} encontrado no banco após espera`);
            // Adicionar ao cache local
            processedCodes.set(codigoKey, { timestamp: now, data: verificaData.dados });
            return NextResponse.json(
              { 
                status: 'sucesso', 
                mensagem: 'Código já foi processado (verificado no banco).' 
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
    if (existingRequest && existingRequest.processing) {
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
    }

    // Marcar requisição como em processamento
    requestCache.set(requestKey, { timestamp: now, processing: true });

    // 🔍 VERIFICAÇÃO TRIPLA NO BANCO ANTES DE GRAVAR
    console.log('🔍 VERIFICAÇÃO TRIPLA: Consultando banco 3 vezes...');
    
    for (let i = 1; i <= 3; i++) {
      console.log(`🔍 Verificação ${i}/3...`);
      
      const verificaResponse = await fetch('https://sas.makecard.com.br/api_verificar_adesao_sasmais.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ codigo: body.codigo }),
      });

      if (verificaResponse.ok) {
        const verificaText = await verificaResponse.text();
        try {
          const verificaData = JSON.parse(verificaText);
          
          if (verificaData?.status === 'sucesso' && verificaData?.jaAderiu === true) {
            console.log(`🚫 VERIFICAÇÃO ${i}: Associado já existe na tabela!`);
            
            // Adicionar ao cache local
            processedCodes.set(codigoKey, { timestamp: now, data: verificaData.dados });
            
            requestCache.set(requestKey, { timestamp: now, processing: false });
            return NextResponse.json(
              { 
                status: 'erro', 
                mensagem: `Associado já aderiu ao Sascred (verificação ${i}). Duplicação evitada.`
              },
              { 
                status: 409,
                headers: {
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                }
              }
            );
          }
        } catch (e) {
          console.log(`⚠️ Erro no parse da verificação ${i}, mas prosseguindo`);
        }
      }
      
      // Delay entre verificações (crescente)
      if (i < 3) {
        await sleep(200 * i); // 200ms, 400ms
      }
    }

    console.log('✅ TRIPLA VERIFICAÇÃO OK: Prosseguindo com gravação...');

    // 🔒 MARCAR NO CACHE ANTES DE GRAVAR (proteção extra)
    processedCodes.set(codigoKey, { timestamp: now, data: 'processing' });

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
        // Remover do cache em caso de erro
        processedCodes.delete(codigoKey);
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
      
      // 🔍 VERIFICAÇÃO PÓS-GRAVAÇÃO: Verificar se não houve duplicação
      await sleep(1000); // Aguardar commit no banco
      
      console.log('🔍 Verificação pós-gravação para detectar duplicatas...');
      const posGravacaoResponse = await fetch('https://sas.makecard.com.br/api_verificar_adesao_sasmais.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ codigo: body.codigo }),
      });

      if (posGravacaoResponse.ok) {
        const posGravacaoData = JSON.parse(await posGravacaoResponse.text());
        if (posGravacaoData?.dados) {
          // Atualizar cache com dados reais
          processedCodes.set(codigoKey, { timestamp: now, data: posGravacaoData.dados });
          console.log('✅ Cache atualizado com dados da gravação');
        }
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
      console.error('❌ Erro ao fazer parse da resposta:', parseError);
      console.error('📄 Resposta original:', responseText);
      
      // Remover do cache em caso de erro
      processedCodes.delete(codigoKey);
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
    
    // Remover do cache em caso de erro
    if (codigoKey) {
      processedCodes.delete(codigoKey);
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