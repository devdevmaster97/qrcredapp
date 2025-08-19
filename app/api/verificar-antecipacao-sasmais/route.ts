import { NextRequest, NextResponse } from 'next/server';

/**
 * API para verificar especificamente a aprovação da ANTECIPAÇÃO
 * Verifica: valor_aprovado > 0 + data_pgto preenchida + has_signed = true
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Valida os dados recebidos
    if (!body.codigo) {
      return NextResponse.json(
        { 
          status: 'erro', 
          mensagem: 'Código do associado é obrigatório.',
          antecipacao_aprovada: false
        },
        { status: 400 }
      );
    }

    const codigo = body.codigo.toString().trim();
    console.log('🔍 Verificando antecipação para código:', codigo);

    // Chamar a API PHP específica para antecipação
    const response = await fetch('https://sas.makecard.com.br/verificar_antecipacao_sasmais.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ codigo }),
      cache: 'no-store'
    });

    if (!response.ok) {
      console.log('⚠️ API PHP não disponível');
      return NextResponse.json({
        status: 'erro',
        mensagem: 'Erro ao conectar com o servidor',
        antecipacao_aprovada: false,
        dados: null
      });
    }

    const responseText = await response.text();
    console.log('📥 Resposta da API PHP antecipação:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Erro no parse da resposta:', parseError);
      return NextResponse.json({
        status: 'erro',
        mensagem: 'Erro ao processar resposta',
        antecipacao_aprovada: false,
        dados: null
      });
    }

    // Analisar resposta
    console.log('📊 Analisando resposta da API antecipação:');
    console.log('  - Status:', data.status);
    console.log('  - Encontrado:', data.encontrado);
    console.log('  - Antecipação aprovada:', data.antecipacao_aprovada);
    console.log('  - Critérios:', data.criterios);

    if (data.status === 'sucesso' && data.encontrado) {
      return NextResponse.json({
        status: 'sucesso',
        antecipacao_aprovada: data.antecipacao_aprovada || false,
        mensagem: data.antecipacao_aprovada ? 
          'Antecipação aprovada - todos os critérios atendidos' : 
          'Antecipação pendente - critérios não atendidos',
        dados: data.dados,
        criterios: data.criterios,
        timestamp: Date.now()
      });
    } else {
      return NextResponse.json({
        status: 'sucesso',
        antecipacao_aprovada: false,
        mensagem: 'Associado não encontrado na tabela de antecipação',
        dados: null,
        timestamp: Date.now()
      });
    }

  } catch (error) {
    console.error('💥 Erro na verificação de antecipação:', error);
    
    return NextResponse.json({
      status: 'erro',
      antecipacao_aprovada: false,
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
