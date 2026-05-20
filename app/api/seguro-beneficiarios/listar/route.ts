import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PHP_BASE_URL = process.env.PHP_BASE_URL || 'https://sas.makecard.com.br/api/seguro-beneficiarios';

export async function GET(request: NextRequest) {
  console.log('📋 API LISTAR - Iniciando (via PHP)...');
  console.log('🔧 PHP_BASE_URL configurado:', PHP_BASE_URL);
  console.log('🔧 process.env.PHP_BASE_URL:', process.env.PHP_BASE_URL);
  
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

    // Chamar endpoint PHP no servidor
    const phpUrl = `${PHP_BASE_URL}/seguro_beneficiarios_listar.php?id_associado=${id_associado}&id_divisao=${id_divisao}`;
    console.log('🔌 URL completa que será chamada:', phpUrl);

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
    console.log('📄 Resposta PHP (texto bruto - primeiros 500 chars):', responseText.substring(0, 500));
    
    if (!response.ok) {
      console.error('❌ PHP retornou erro! Status:', response.status);
      console.error('📄 Resposta completa do PHP:', responseText);
    }

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
          rawResponse: responseText.substring(0, 1000),
          phpUrl: phpUrl
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error('❌ Retornando erro do PHP para o cliente:', data);
      return NextResponse.json(data, { 
        status: response.status,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

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
