import { NextRequest, NextResponse } from 'next/server';

/**
 * API para debug e logs detalhados da recuperação de senha
 */
export async function POST(request: NextRequest) {
  try {
    const { cartao, metodo } = await request.json();
    
    console.log('=== DEBUG RECUPERAÇÃO LOGS ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Cartão recebido:', cartao);
    console.log('Método recebido:', metodo);
    console.log('Headers da requisição:', Object.fromEntries(request.headers.entries()));
    console.log('URL da requisição:', request.url);
    console.log('Método HTTP:', request.method);
    
    // Simular chamada para localiza_associado_app_2.php com logs detalhados
    const cartaoLimpo = cartao?.replace(/\D/g, '') || '';
    console.log('Cartão limpo:', cartaoLimpo);
    
    if (!cartaoLimpo) {
      console.log('Erro: Cartão vazio após limpeza');
      return NextResponse.json({
        success: false,
        message: 'Cartão inválido',
        debug: {
          cartaoOriginal: cartao,
          cartaoLimpo: cartaoLimpo,
          erro: 'Cartão vazio após limpeza'
        }
      });
    }
    
    // Testar conectividade com a API externa
    try {
      console.log('Testando conectividade com API externa...');
      const params = new URLSearchParams();
      params.append('cartao', cartaoLimpo);
      
      console.log('Parâmetros enviados:', params.toString());
      
      const response = await fetch('https://sas.makecard.com.br/localiza_associado_app_2.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
        signal: AbortSignal.timeout(10000)
      });
      
      console.log('Status da resposta:', response.status);
      console.log('Headers da resposta:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('Resposta bruta (texto):', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('Resposta parseada (JSON):', responseData);
      } catch (parseError) {
        console.log('Erro ao parsear JSON:', parseError);
        responseData = { raw: responseText };
      }
      
      return NextResponse.json({
        success: true,
        message: 'Debug executado com sucesso',
        debug: {
          cartaoOriginal: cartao,
          cartaoLimpo: cartaoLimpo,
          metodo: metodo,
          apiResponse: {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            data: responseData,
            rawText: responseText
          }
        }
      });
      
    } catch (apiError) {
      console.error('Erro na chamada da API externa:', apiError);
      
      return NextResponse.json({
        success: false,
        message: 'Erro ao conectar com API externa',
        debug: {
          cartaoOriginal: cartao,
          cartaoLimpo: cartaoLimpo,
          metodo: metodo,
          erro: {
            message: apiError instanceof Error ? apiError.message : String(apiError),
            name: apiError instanceof Error ? apiError.name : 'UnknownError',
            stack: apiError instanceof Error ? apiError.stack : undefined
          }
        }
      });
    }
    
  } catch (error) {
    console.error('Erro geral no debug:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro no debug',
      debug: {
        erro: {
          message: error instanceof Error ? error.message : String(error),
          name: error instanceof Error ? error.name : 'UnknownError',
          stack: error instanceof Error ? error.stack : undefined
        }
      }
    }, { status: 500 });
  }
}
