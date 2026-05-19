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

    // Chamar endpoint PHP no servidor
    const phpUrl = `${PHP_BASE_URL}/listar.php?id_associado=${id_associado}&id_divisao=${id_divisao}`;
    console.log('🔌 Chamando PHP:', phpUrl);

    const response = await fetch(phpUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('� Resposta do PHP:', data);

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
