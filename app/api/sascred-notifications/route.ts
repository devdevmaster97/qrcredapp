import { NextRequest, NextResponse } from 'next/server';

/**
 * API para verificar notificações de novas assinaturas SasCred
 * Escuta as notificações do PostgreSQL via polling
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codigo } = body;

    if (!codigo) {
      return NextResponse.json(
        { success: false, message: 'Código é obrigatório' },
        { status: 400 }
      );
    }

    // Fazer requisição para a API PHP que verifica adesão
    const response = await fetch('https://sas.makecard.com.br/api_verificar_adesao_sasmais.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ codigo }),
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: 'Erro ao verificar adesão' },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      jaAderiu: data.jaAderiu || false,
      dados: data.dados || null,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Erro ao verificar notificações SasCred:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Endpoint GET para health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'SasCred notifications API is running',
    timestamp: Date.now()
  });
} 