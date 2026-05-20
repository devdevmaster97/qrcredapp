import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PHP_BASE_URL = process.env.PHP_BASE_URL || 'https://sas.makecard.com.br/api/seguro-beneficiarios';

async function handleExcluir(request: NextRequest) {
  console.log('🗑️ API EXCLUIR - Iniciando (via PHP)...');
  try {
    const body = await request.json();
    const { id_beneficiario, id_associado } = body;

    console.log('🗑️ Parâmetros recebidos:', { id_beneficiario, id_associado });

    if (!id_beneficiario || !id_associado) {
      return NextResponse.json(
        { success: false, error: 'id_beneficiario e id_associado são obrigatórios' },
        { status: 400 }
      );
    }

    // Chamar endpoint PHP no servidor
    const phpUrl = `${PHP_BASE_URL}/seguro_beneficiarios_excluir.php`;
    console.log('🔌 Chamando PHP:', phpUrl);

    const response = await fetch(phpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id_beneficiario, id_associado }),
    });

    const data = await response.json();
    console.log('📊 Resposta do PHP:', data);

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
        error: 'Erro ao excluir beneficiário',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  return handleExcluir(request);
}

export async function POST(request: NextRequest) {
  return handleExcluir(request);
}
