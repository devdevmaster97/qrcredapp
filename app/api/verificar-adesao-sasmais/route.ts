import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Valida os dados recebidos
    if (!body.codigo) {
      return NextResponse.json(
        { 
          status: 'erro', 
          mensagem: 'Código do associado é obrigatório.' 
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

    console.log('🔍 Verificando adesão para código:', body.codigo);

    // Faz a requisição para verificar se o associado já está na tabela sind.associados_sasmais
    const response = await fetch('https://sas.makecard.com.br/api_verificar_adesao_sasmais.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'SasApp-VerificacaoAdesao/1.0',
      },
      body: JSON.stringify({
        codigo: body.codigo.toString().trim()
      }),
    });

    console.log('📡 Status da resposta HTTP:', response.status);
    
    // Lê a resposta da API
    const responseText = await response.text();
    console.log('📥 Resposta bruta da API PHP:', responseText);
    
    try {
      const responseData = JSON.parse(responseText);
      console.log('📊 Dados parseados da API PHP:', responseData);
      
      if (!response.ok) {
        console.log('⚠️ Resposta HTTP não ok, status:', response.status);
        // Se não conseguiu verificar, assumir que não aderiu ainda
        return NextResponse.json({ 
          status: 'sucesso',
          jaAderiu: false,
          mensagem: 'Erro ao verificar adesão, mas permitindo acesso aos termos'
        }, { 
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          }
        });
      }

      // Verificar se a resposta tem a estrutura esperada
      if (responseData && typeof responseData === 'object') {
        console.log('✅ Resposta válida da API PHP');
        console.log('📋 Status:', responseData.status);
        console.log('🎯 jaAderiu:', responseData.jaAderiu);
        
        return NextResponse.json(responseData, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          }
        });
      } else {
        console.log('❌ Estrutura de resposta inválida');
        return NextResponse.json({ 
          status: 'sucesso',
          jaAderiu: false,
          mensagem: 'Estrutura de resposta inválida, permitindo acesso aos termos'
        }, { 
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          }
        });
      }
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse da resposta:', parseError);
      console.error('📄 Resposta original que causou erro:', responseText);
      // Se não conseguiu fazer parse, assumir que não aderiu ainda
      return NextResponse.json(
        { 
          status: 'sucesso', 
          jaAderiu: false,
          mensagem: 'Erro ao processar verificação, mas permitindo acesso aos termos'
        },
        { 
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          }
        }
      );
    }

  } catch (error) {
    console.error('💥 Erro geral na API de verificação:', error);
    
    // Log adicional para debug
    if (error instanceof Error) {
      console.error('📝 Mensagem do erro:', error.message);
      console.error('🔍 Stack trace:', error.stack);
    }
    
    // Se houver erro na conexão, assumir que não aderiu ainda para permitir acesso
    return NextResponse.json(
      { 
        status: 'sucesso', 
        jaAderiu: false,
        mensagem: 'Erro de conexão, mas permitindo acesso aos termos'
      },
      { 
        status: 200,
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