import { NextRequest, NextResponse } from 'next/server';

/**
 * API para verificar adesão à Antecipação
 * Nova lógica: has_signed = true E tipo = 2
 * Tabela: sind.associados_sasmais
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Valida os dados recebidos
    if (!body.codigo || !body.id || !body.id_divisao) {
      return NextResponse.json(
        { 
          status: 'erro', 
          mensagem: 'Código, ID e ID divisão do associado são obrigatórios.',
          jaAderiu: false
        },
        { status: 400 }
      );
    }

    const codigo = body.codigo.toString().trim();
    const id = parseInt(body.id);
    const id_divisao = parseInt(body.id_divisao);
    
    console.log('🔍 Verificando existência de adesão à antecipação para:', { codigo, id, id_divisao });

    // Usar a API PHP específica para antecipação que retorna todos os campos
    const response = await fetch('https://sas.makecard.com.br/verificar_antecipacao_sasmais.php', {
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
      console.log('⚠️ API PHP não disponível, usando fallback');
      return NextResponse.json({
        status: 'sucesso',
        jaAderiu: false,
        mensagem: 'API de antecipação não disponível',
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
        status: 'sucesso',
        jaAderiu: false,
        mensagem: 'Erro ao processar resposta',
        dados: null
      });
    }

    console.log('📊 Analisando resposta da API específica de antecipação:');
    console.log('  - Status:', data.status);
    console.log('  - Encontrado:', data.encontrado);
    console.log('  - Antecipação aprovada:', data.antecipacao_aprovada);
    console.log('  - Critérios:', data.criterios);

    // Nova lógica: usar diretamente o campo 'antecipacao_aprovada' retornado pela API PHP
    // A API PHP verifica: has_signed = true E tipo = 2
    let jaAderiu = false;
    let motivo = '';

    if (data.status === 'sucesso' && data.encontrado) {
      // Usar o campo calculado pela API PHP
      jaAderiu = data.antecipacao_aprovada === true;
      
      if (jaAderiu) {
        motivo = 'Antecipação assinada (has_signed=true e tipo=2)';
        console.log('✅ Antecipação aprovada:', {
          has_signed: data.dados?.has_signed,
          tipo: data.dados?.tipo,
          criterios: data.criterios
        });
      } else {
        motivo = 'Registro encontrado mas critérios não atendidos';
        console.log('⚠️ Antecipação não aprovada:', {
          has_signed: data.dados?.has_signed,
          tipo: data.dados?.tipo,
          criterios: data.criterios
        });
      }
    } else {
      jaAderiu = false;
      motivo = 'Nenhum registro de antecipação encontrado (tipo=2)';
      console.log('❌ Nenhum registro tipo=2 encontrado:', data.debug);
    }

    console.log(`✅ Verificação de antecipação concluída - Código: ${codigo}, Aderiu: ${jaAderiu}, Motivo: ${motivo}`);

    return NextResponse.json({
      status: 'sucesso',
      jaAderiu,
      mensagem: jaAderiu ? 
        `Associado tem antecipação aprovada (${motivo})` : 
        `Associado não tem antecipação aprovada (${motivo})`,
      dados: data.dados || null,
      criterios: data.criterios || null,
      timestamp: Date.now(),
      debug: {
        originalStatus: data.status,
        originalEncontrado: data.encontrado,
        motivoDecisao: motivo,
        antecipacaoAprovada: data.antecipacao_aprovada,
        debugInfo: data.debug || null
      }
    });

  } catch (error) {
    console.error('💥 Erro na verificação de adesão à antecipação:', error);
    
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