import { NextRequest, NextResponse } from 'next/server';

/**
 * API de debug para verificar o status de adesão ao SasCred
 * Mostra todos os detalhes da verificação
 */
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('❌ Erro ao fazer parse do body da requisição:', jsonError);
      return NextResponse.json(
        { 
          status: 'erro', 
          mensagem: 'Erro no formato JSON da requisição',
          debug: {
            error: jsonError instanceof Error ? jsonError.message : 'Erro desconhecido',
            contentType: request.headers.get('content-type')
          }
        },
        { status: 400 }
      );
    }
    
    if (!body.codigo || !body.id || !body.id_divisao) {
      return NextResponse.json(
        { 
          status: 'erro', 
          mensagem: 'Código, ID e ID divisão do associado são obrigatórios.',
          debug: 'Código, ID ou ID divisão não fornecidos'
        },
        { status: 400 }
      );
    }

    const codigo = body.codigo.toString().trim();
    const id = parseInt(body.id);
    const id_divisao = parseInt(body.id_divisao);
    
    console.log('🔍 DEBUG - Verificando adesão SasCred para:', { 
      codigo, 
      id, 
      id_divisao 
    });

    // Chamar a API PHP diretamente
    const response = await fetch('https://sas.makecard.com.br/api_verificar_adesao_sasmais.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ 
        codigo, 
        id, 
        id_divisao 
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.json({
        status: 'erro',
        mensagem: 'API PHP não disponível',
        debug: {
          httpStatus: response.status,
          httpStatusText: response.statusText
        }
      });
    }

    const responseText = await response.text();
    console.log('📥 DEBUG - Resposta bruta da API PHP:', responseText);

    let data;
    try {
      // Limpar caracteres especiais que podem causar problemas no JSON
      const cleanedText = responseText.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      data = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('❌ Erro no parse JSON:', parseError);
      console.error('📄 Texto original:', responseText);
      console.error('📄 Texto limpo:', responseText.replace(/[\u0000-\u001F\u007F-\u009F]/g, ''));
      
      return NextResponse.json({
        status: 'erro',
        mensagem: 'Erro ao fazer parse da resposta',
        debug: {
          responseText: responseText.substring(0, 500), // Limitar tamanho
          parseError: parseError instanceof Error ? parseError.message : 'Erro desconhecido',
          responseLength: responseText.length
        }
      });
    }

    // Análise detalhada da resposta
    const analise = {
      status_api: data.status,
      jaAderiu_original: data.jaAderiu,
      tipo_jaAderiu: typeof data.jaAderiu,
      mensagem_original: data.mensagem,
      tem_dados: data.dados ? 'SIM' : 'NÃO',
      dados_keys: data.dados ? Object.keys(data.dados) : [],
      dados_completos: data.dados
    };

    // Aplicar a mesma lógica da API original
    let jaAderiu = false;
    let motivo = '';

    if (data.status === 'sucesso') {
      if (data.jaAderiu === true) {
        jaAderiu = true;
        motivo = 'API retornou jaAderiu=true';
      } else if (data.dados && typeof data.dados === 'object' && Object.keys(data.dados).length > 0) {
        jaAderiu = true;
        motivo = 'Encontrados dados do associado na tabela';
      } else if (data.mensagem && (
        data.mensagem.includes('já aderiu') || 
        data.mensagem.includes('encontrado') ||
        data.mensagem.includes('existe')
      )) {
        jaAderiu = true;
        motivo = 'Mensagem indica existência na tabela';
      } else {
        jaAderiu = false;
        motivo = 'Nenhuma evidência de existência na tabela';
      }
    } else {
      jaAderiu = false;
      motivo = 'Status da API não é sucesso';
    }

    return NextResponse.json({
      status: 'sucesso',
      codigo,
      resultado_final: {
        jaAderiu,
        motivo,
        deveria_ocultar_menu_aderir: jaAderiu
      },
      analise_detalhada: analise,
      resposta_php_completa: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Erro no debug de adesão:', error);
    
    return NextResponse.json({
      status: 'erro',
      mensagem: 'Erro interno do servidor',
      debug: {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    mensagem: 'Use POST com { "codigo": "matricula", "id": id_associado, "id_divisao": id_divisao }',
    exemplo: {
      method: 'POST',
      body: { 
        codigo: '123456',
        id: 174,
        id_divisao: 1
      }
    }
  });
}
