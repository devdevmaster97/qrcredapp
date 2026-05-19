import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PHP_BASE_URL = process.env.PHP_BASE_URL || 'https://sas.makecard.com.br/api/seguro-beneficiarios';

export async function POST(request: NextRequest) {
  console.log('📝 API CRIAR - Iniciando (via PHP)...');
  try {
    const body = await request.json();
    const { id_associado, id_divisao, quantidade } = body;

    console.log('📝 Parâmetros recebidos:', { id_associado, id_divisao, quantidade });

    if (!id_associado || !id_divisao || !quantidade) {
      return NextResponse.json(
        { success: false, error: 'id_associado, id_divisao e quantidade são obrigatórios' },
        { status: 400 }
      );
    }

    if (quantidade < 1 || quantidade > 4) {
      return NextResponse.json(
        { success: false, error: 'Quantidade deve ser entre 1 e 4' },
        { status: 400 }
      );
    }

    // Chamar endpoint PHP no servidor
    const phpUrl = `${PHP_BASE_URL}/criar.php`;
    console.log('� Chamando PHP:', phpUrl);

    const response = await fetch(phpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id_associado, id_divisao, quantidade }),
    });

    const data = await response.json();
    console.log('📥 Resposta do PHP:', data);

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
        error: 'Erro ao criar beneficiários',
        details: error.message
      },
      { status: 500 }
    );
  }
}
