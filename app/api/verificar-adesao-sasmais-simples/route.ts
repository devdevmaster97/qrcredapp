import { NextRequest, NextResponse } from 'next/server';

/**
 * API para verificar adesão SasCred baseada apenas na EXISTÊNCIA do registro
 * NÃO depende de valor_aprovado > 0, apenas se o registro existe na tabela
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // DEBUG ESPECÍFICO - Mostrar o que foi recebido
    console.log(' DEBUG API RECEBIDA - Body completo:', body);
    console.log(' DEBUG API RECEBIDA - body.codigo:', body.codigo);
    console.log(' DEBUG API RECEBIDA - body.id:', body.id);
    console.log(' DEBUG API RECEBIDA - body.id_divisao:', body.id_divisao);
    
    // Valida os dados recebidos - código é obrigatório, id e id_divisao são opcionais (fallback)
    if (!body.codigo) {
      return NextResponse.json(
        { 
          status: 'erro', 
          mensagem: 'Código do associado é obrigatório.',
          jaAderiu: false
        },
        { status: 400 }
      );
    }

    const codigo = body.codigo.toString().trim();
    const id = body.id ? parseInt(body.id) : null;
    const id_divisao = body.id_divisao ? parseInt(body.id_divisao) : null;
    
    console.log(' Verificando existência do registro para:', { codigo, id, id_divisao });

    // DEBUG ESPECÍFICO - Mostrar o que será enviado para a API PHP
    const phpRequestBody: any = { codigo };
    
    // Incluir id e id_divisao apenas se estiverem disponíveis
    if (id !== null) {
      phpRequestBody.id = id;
    }
    if (id_divisao !== null) {
      phpRequestBody.id_divisao = id_divisao;
    }
    
    console.log(' DEBUG PHP REQUEST - Body que será enviado para PHP:', phpRequestBody);
    console.log(' DEBUG PHP REQUEST - JSON.stringify:', JSON.stringify(phpRequestBody));

    // Usar a API PHP existente, mas interpretar apenas a EXISTÊNCIA do registro
    const response = await fetch('https://sas.makecard.com.br/api_verificar_adesao_sasmais.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(phpRequestBody),
      cache: 'no-store'
    });

    console.log(' DEBUG PHP RESPONSE - Status:', response.status);
    console.log(' DEBUG PHP RESPONSE - StatusText:', response.statusText);
    console.log(' DEBUG PHP RESPONSE - Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error(' Erro na resposta da API PHP:', response.status, response.statusText);
      return NextResponse.json({
        status: 'erro',
        mensagem: 'API PHP não disponível',
        jaAderiu: false,
        debug: {
          httpStatus: response.status,
          httpStatusText: response.statusText
        }
      });
    }

    const responseText = await response.text();
    console.log(' DEBUG PHP RESPONSE - Texto bruto:', responseText);
    console.log(' DEBUG PHP RESPONSE - Tamanho:', responseText.length);

    let data;
    try {
      data = JSON.parse(responseText);
      console.log(' DEBUG PHP RESPONSE - JSON parseado:', data);
    } catch (parseError) {
      console.error(' Erro ao fazer parse da resposta PHP:', parseError);
      console.error(' Resposta que causou erro:', responseText.substring(0, 500));
      return NextResponse.json({
        status: 'erro',
        mensagem: 'Erro ao processar resposta da API PHP',
        jaAderiu: false,
        debug: {
          responseText: responseText.substring(0, 500),
          parseError: parseError instanceof Error ? parseError.message : 'Erro desconhecido'
        }
      });
    }

    // NOVA LÓGICA: Se tem dados do associado, significa que existe na tabela
    // Independente do valor_aprovado ou status de aprovação
    console.log(' Analisando resposta da API PHP:');
    console.log('  - Status:', data.status);
    console.log('  - jaAderiu original:', data.jaAderiu);
    console.log('  - Tem dados?', data.dados ? 'SIM' : 'NÃO');
    console.log('  - Dados:', data.dados);
    console.log('  - Mensagem:', data.mensagem);

    // Verificações em ordem de prioridade
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

    console.log(` Verificação concluída - Código: ${codigo}, Existe: ${jaAderiu}, Motivo: ${motivo}`);

    return NextResponse.json({
      status: 'sucesso',
      jaAderiu,
      mensagem: jaAderiu ? `Associado encontrado na tabela SasCred (${motivo})` : `Associado não encontrado na tabela (${motivo})`,
      dados: data.dados || null,
      timestamp: Date.now(),
      debug: {
        originalJaAderiu: data.jaAderiu,
        originalMensagem: data.mensagem,
        motivoDecisao: motivo
      }
    });

  } catch (error) {
    console.error(' Erro na verificação de existência:', error);
    
    return NextResponse.json({
      status: 'erro',
      jaAderiu: false,
      mensagem: 'Erro interno do servidor',
      dados: null
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
} 