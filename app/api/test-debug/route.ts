import { NextRequest, NextResponse } from 'next/server';

/**
 * API de teste para debug do erro 500
 */
export async function POST(request: NextRequest) {
  console.log('=== TESTE DEBUG INICIADO ===');
  
  try {
    console.log('1. Recebendo requisição...');
    const body = await request.json();
    console.log('2. Body recebido:', body);
    
    const { cartao, metodo } = body;
    console.log('3. Dados extraídos:', { cartao, metodo });
    
    if (!cartao || !metodo) {
      console.log('4. Erro: dados obrigatórios faltando');
      return NextResponse.json(
        { success: false, message: 'Cartão e método são obrigatórios' },
        { status: 400 }
      );
    }

    if (!['email', 'sms', 'whatsapp'].includes(metodo)) {
      console.log('5. Erro: método inválido');
      return NextResponse.json(
        { success: false, message: 'Método inválido' },
        { status: 400 }
      );
    }

    const cartaoLimpo = cartao.replace(/\D/g, '');
    console.log('6. Cartão limpo:', cartaoLimpo);
    
    console.log('7. Simulando sucesso...');
    
    return NextResponse.json({
      success: true,
      message: 'Teste executado com sucesso!',
      dados: {
        cartaoOriginal: cartao,
        cartaoLimpo: cartaoLimpo,
        metodo: metodo,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('ERRO NO TESTE DEBUG:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro no teste de debug',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
