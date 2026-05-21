import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PHP_BASE_URL = process.env.PHP_BASE_URL || 'https://sas.makecard.com.br/api/seguro-beneficiarios';

let callCounter = 0;

export async function POST(request: NextRequest) {
  const callId = ++callCounter;
  const timestamp = new Date().toISOString();
  
  console.log(`📝 [CALL #${callId}] API CRIAR - Iniciando às ${timestamp}`);
  
  try {
    const body = await request.json();
    const { id_associado, id_divisao, quantidade } = body;

    console.log(`📝 [CALL #${callId}] Parâmetros recebidos:`, { id_associado, id_divisao, quantidade });

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
    const phpUrl = `${PHP_BASE_URL}/seguro_beneficiarios_criar.php`;
    console.log(`🔌 [CALL #${callId}] Chamando PHP:`, phpUrl);

    const response = await fetch(phpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id_associado, id_divisao, quantidade }),
    });

    const data = await response.json();
    console.log(`📥 [CALL #${callId}] Resposta do PHP:`, data);
    console.log(`✅ [CALL #${callId}] Finalizando com sucesso`);

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error(`❌ [CALL #${callId}] ERRO ao chamar PHP:`, error);
    console.error(`❌ [CALL #${callId}] Detalhes do erro:`, {
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
