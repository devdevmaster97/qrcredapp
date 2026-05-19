import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PHP_BASE_URL = process.env.PHP_BASE_URL || 'https://sas.makecard.com.br/api/seguro-beneficiarios';

export async function GET(request: NextRequest) {
  console.log('📋 API LISTAR - Iniciando (via PHP)...');
  try {
    const { searchParams } = new URL(request.url);
    const id_associado = searchParams.get('id_associado');
    const id_divisao = searchParams.get('id_divisao');

    console.log('📋 Parâmetros recebidos:', { id_associado, id_divisao });

    if (!id_associado || !id_divisao) {
      return NextResponse.json(
        { success: false, error: 'id_associado e id_divisao são obrigatórios' },
        { status: 400 }
      );
    }

    // Chamar endpoint PHP no servidor 2
    const phpUrl = `${PHP_BASE_URL}/seguro_beneficiarios_listar.php?id_associado=${id_associado}&id_divisao=${id_divisao}`;
    console.log('🔌 Chamando PHP:', phpUrl);

    const response = await fetch(phpUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 Status da resposta PHP:', response.status);
    console.log('📊 Headers da resposta:', Object.fromEntries(response.headers.entries()));

    // Capturar texto bruto primeiro para debug
    const responseText = await response.text();
    console.log('📄 Resposta PHP (texto bruto):', responseText.substring(0, 500));

    // Tentar fazer parse do JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('✅ JSON parseado com sucesso:', data);
    } catch (parseError: any) {
      console.error('❌ ERRO ao fazer parse do JSON:', parseError.message);
      console.error('📄 Texto completo recebido:', responseText);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Resposta inválida do servidor PHP',
          details: `Parse error: ${parseError.message}`,
          rawResponse: responseText.substring(0, 1000)
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('❌ ERRO ao chamar PHP:', error);
    console.error('❌ Detalhes do erro:', {
      message: error.message,
      name: error.name,
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao buscar beneficiários',
        details: error.message
      },
      { status: 500 }
    );
  }
}
