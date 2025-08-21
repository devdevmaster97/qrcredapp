import { NextRequest, NextResponse } from 'next/server';

/**
 * API para verificar adesão à Antecipação baseada apenas na EXISTÊNCIA do registro
 * Usa a API específica verificar_antecipacao_sasmais.php que retorna todos os campos
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
          jaAderiu: false
        },
        { status: 400 }
      );
    }

    const codigo = body.codigo.toString().trim();
    console.log('🔍 Verificando existência de adesão à antecipação para código:', codigo);

    // Usar a API PHP específica para antecipação que retorna todos os campos
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
    console.log('  - Dados:', data.dados);

    // Verificar se encontrou registro de antecipação
    let jaAderiu = false;
    let motivo = '';

    if (data.status === 'sucesso' && data.encontrado && data.dados) {
      // Verificar critérios específicos para antecipação
      const temAntecipacao = 
        // Nome do documento é "Contrato de Antecipação Salarial"
        (data.dados.doc_name === 'Contrato de Antecipação Salarial') ||
        // Tipo numérico 2 = antecipação (baseado nos logs)
        (data.dados.tipo === 2) ||
        // Has_signed = true E doc_name contém "antecipação"
        (data.dados.has_signed === true && data.dados.doc_name && 
          data.dados.doc_name.toLowerCase().includes('antecip')) ||
        // Event = doc_signed E doc_name de antecipação
        (data.dados.event === 'doc_signed' && data.dados.doc_name && 
          data.dados.doc_name.toLowerCase().includes('contrato de antecip'));

      if (temAntecipacao) {
        jaAderiu = true;
        motivo = 'Encontrado registro de antecipação assinado';
        console.log('✅ Antecipação detectada:', {
          doc_name: data.dados.doc_name,
          has_signed: data.dados.has_signed,
          tipo: data.dados.tipo,
          event: data.dados.event
        });
      } else {
        jaAderiu = false;
        motivo = 'Registro encontrado mas não é de antecipação';
        console.log('⚠️ Registro encontrado mas não identificado como antecipação:', {
          doc_name: data.dados.doc_name,
          has_signed: data.dados.has_signed,
          tipo: data.dados.tipo,
          event: data.dados.event
        });
      }
    } else {
      jaAderiu = false;
      motivo = 'Nenhum registro de antecipação encontrado';
    }

    console.log(`✅ Verificação de antecipação concluída - Código: ${codigo}, Aderiu: ${jaAderiu}, Motivo: ${motivo}`);

    return NextResponse.json({
      status: 'sucesso',
      jaAderiu,
      mensagem: jaAderiu ? 
        `Associado encontrou contrato de antecipação assinado (${motivo})` : 
        `Associado não tem contrato de antecipação assinado (${motivo})`,
      dados: data.dados || null,
      timestamp: Date.now(),
      debug: {
        originalStatus: data.status,
        originalEncontrado: data.encontrado,
        motivoDecisao: motivo,
        antecipacaoAprovada: data.antecipacao_aprovada
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