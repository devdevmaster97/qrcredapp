import { NextRequest, NextResponse } from 'next/server';

/**
 * API para verificar adesão à Antecipação baseada apenas na EXISTÊNCIA do registro
 * NÃO depende de valor_aprovado > 0, apenas se o registro existe na tabela
 * Similar à verificar-adesao-sasmais-simples mas específica para antecipação
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

    // Usar a API PHP específica para verificar antecipação
    const response = await fetch('https://sas.makecard.com.br/api_verificar_adesao_sasmais.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ 
        codigo,
        tipo: 'antecipacao' // Especificar que queremos dados de antecipação
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
      console.log('⚠️ API PHP não disponível, usando fallback');
      // Se a API PHP não responder, assumir que não existe
      return NextResponse.json({
        status: 'sucesso',
        jaAderiu: false,
        mensagem: 'Associado não encontrado na tabela de antecipação',
        dados: null
      });
    }

    const responseText = await response.text();
    console.log('📥 Resposta da API PHP para antecipação:', responseText);

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

    // 🎯 LÓGICA ESPECÍFICA PARA ANTECIPAÇÃO: 
    // Verificar se existe registro com tipo "antecipacao" na tabela
    console.log('📊 Analisando resposta da API PHP para antecipação:');
    console.log('  - Status:', data.status);
    console.log('  - jaAderiu original:', data.jaAderiu);
    console.log('  - Tem dados?', data.dados ? 'SIM' : 'NÃO');
    console.log('  - Dados:', data.dados);
    console.log('  - Mensagem:', data.mensagem);

    // Verificações em ordem de prioridade para ANTECIPAÇÃO
    let jaAderiu = false;
    let motivo = '';

    if (data.status === 'sucesso') {
      // Verificar se há dados específicos de antecipação
      if (data.dados && typeof data.dados === 'object') {
        // Verificar múltiplos critérios para antecipação
        const temAntecipacao = 
          // Tipo explícito
          data.dados.tipo === 'antecipacao' || 
          data.dados.tipo === 'antecipação' ||
          // Nome do documento
          (data.dados.doc_name && (
            data.dados.doc_name.toLowerCase().includes('antecip') ||
            data.dados.doc_name.toLowerCase().includes('contrato de antecipação')
          )) ||
          // Evento relacionado
          (data.dados.event && data.dados.event.toLowerCase().includes('antecip')) ||
          // Has_signed = true E existe referência a antecipação
          (data.dados.has_signed === true && (
            JSON.stringify(data.dados).toLowerCase().includes('antecip')
          ));
        
        if (temAntecipacao) {
          jaAderiu = true;
          motivo = 'Encontrado registro de antecipação na tabela';
          console.log('✅ Antecipação detectada pelos critérios:', {
            tipo: data.dados.tipo,
            doc_name: data.dados.doc_name,
            event: data.dados.event,
            has_signed: data.dados.has_signed
          });
        } else {
          // Log detalhado para debug
          console.log('⚠️ Dados encontrados mas não identificados como antecipação:', {
            tipo: data.dados.tipo,
            doc_name: data.dados.doc_name,
            event: data.dados.event,
            has_signed: data.dados.has_signed,
            dados_completos: data.dados
          });
          jaAderiu = false;
          motivo = 'Dados encontrados mas não são de antecipação';
        }
      } else if (data.jaAderiu === true && data.mensagem && 
                (data.mensagem.includes('antecip') || data.mensagem.includes('Antecip'))) {
        jaAderiu = true;
        motivo = 'API retornou jaAderiu=true para antecipação';
      } else {
        jaAderiu = false;
        motivo = 'Nenhuma evidência de adesão à antecipação na tabela';
      }
    } else {
      jaAderiu = false;
      motivo = 'Status da API não é sucesso';
    }

    console.log(`✅ Verificação de antecipação concluída - Código: ${codigo}, Aderiu: ${jaAderiu}, Motivo: ${motivo}`);

    return NextResponse.json({
      status: 'sucesso',
      jaAderiu,
      mensagem: jaAderiu ? 
        `Associado encontrado na tabela de Antecipação (${motivo})` : 
        `Associado não encontrado na tabela de Antecipação (${motivo})`,
      dados: data.dados || null,
      timestamp: Date.now(),
      debug: {
        originalJaAderiu: data.jaAderiu,
        originalMensagem: data.mensagem,
        motivoDecisao: motivo
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
