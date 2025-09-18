import { NextRequest, NextResponse } from 'next/server';

/**
 * API para verificar adesão SasCred baseada apenas na EXISTÊNCIA do registro
 * NÃO depende de valor_aprovado > 0, apenas se o registro existe na tabela
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 🎯 DEBUG ESPECÍFICO - Mostrar o que foi recebido
    console.log('🎯 DEBUG API RECEBIDA - Body completo:', body);
    console.log('🎯 DEBUG API RECEBIDA - body.codigo:', body.codigo);
    console.log('🎯 DEBUG API RECEBIDA - typeof body.codigo:', typeof body.codigo);
    
    // Valida os dados recebidos
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
    console.log('🔍 Verificando existência do registro para código:', codigo);

    // Usar a API PHP existente, mas interpretar apenas a EXISTÊNCIA do registro
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
      console.log('⚠️ API PHP não disponível, usando fallback');
      // Se a API PHP não responder, assumir que não existe
      return NextResponse.json({
        status: 'sucesso',
        jaAderiu: false,
        mensagem: 'Associado não encontrado na tabela',
        dados: null
      });
    }

    const responseText = await response.text();
    console.log('📥 Resposta da API PHP:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Erro no parse da resposta:', parseError);
      return NextResponse.json({
        status: 'sucesso',
        jaAderiu: false,
        mensagem: 'Erro ao processar resposta',
        dados: null
      });
    }

    // 🎯 NOVA LÓGICA: Se tem dados do associado, significa que existe na tabela
    // Independente do valor_aprovado ou status de aprovação
    console.log('📊 Analisando resposta da API PHP:');
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

    console.log(`✅ Verificação concluída - Código: ${codigo}, Existe: ${jaAderiu}, Motivo: ${motivo}`);

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
    console.error('💥 Erro na verificação de existência:', error);
    
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