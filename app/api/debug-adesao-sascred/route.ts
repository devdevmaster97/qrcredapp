import { NextRequest, NextResponse } from 'next/server';

/**
 * API de debug para verificar o status de adesão ao SasCred
 * Mostra todos os detalhes da verificação
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.codigo) {
      return NextResponse.json(
        { 
          status: 'erro', 
          mensagem: 'Código do associado é obrigatório.',
          debug: 'Código não fornecido'
        },
        { status: 400 }
      );
    }

    const codigo = body.codigo.toString().trim();
    console.log('🔍 DEBUG - Verificando adesão SasCred para código:', codigo);

    // Chamar a API PHP diretamente
    const response = await fetch('https://sas.makecard.com.br/api_verificar_adesao_sasmais.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ codigo }),
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
      data = JSON.parse(responseText);
    } catch (parseError) {
      return NextResponse.json({
        status: 'erro',
        mensagem: 'Erro ao fazer parse da resposta',
        debug: {
          responseText,
          parseError: parseError instanceof Error ? parseError.message : 'Erro desconhecido'
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
    mensagem: 'Use POST com { "codigo": "matricula_do_associado" }',
    exemplo: {
      method: 'POST',
      body: { codigo: '123456' }
    }
  });
}
