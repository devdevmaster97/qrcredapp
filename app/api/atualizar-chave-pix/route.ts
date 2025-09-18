import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar dados obrigatórios
    if (!body.id || !body.chave_pix) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ID da solicitação e nova chave PIX são obrigatórios' 
        },
        { status: 400 }
      );
    }

    const { id, chave_pix } = body;

    console.log('🔄 Atualizando chave PIX:', { id, chave_pix });

    // Chamar o PHP para atualizar a chave PIX
    const formData = new FormData();
    formData.append('id', id.toString());
    formData.append('chave_pix', chave_pix);

    const response = await fetch('https://sas.makecard.com.br/atualizar_chave_pix_antecipacao.php', {
      method: 'POST',
      body: formData,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const responseText = await response.text();
    console.log('📥 Resposta do PHP:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Erro no parse da resposta:', parseError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao processar resposta do servidor'
      }, { status: 500 });
    }

    if (data.success) {
      console.log('✅ Chave PIX atualizada com sucesso');
      return NextResponse.json({
        success: true,
        message: 'Chave PIX atualizada com sucesso'
      });
    } else {
      console.error('❌ Erro ao atualizar chave PIX:', data.error);
      return NextResponse.json({
        success: false,
        error: data.error || 'Erro ao atualizar chave PIX'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('💥 Erro na API de atualização de chave PIX:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
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
