import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.codigo) {
      return NextResponse.json(
        { status: 'erro', mensagem: 'Código do associado é obrigatório.', temAntecipacao: false },
        { status: 400 }
      );
    }

    const phpRequestBody: Record<string, unknown> = {
      codigo: body.codigo.toString().trim(),
    };
    if (body.id != null)         phpRequestBody.id         = parseInt(body.id);
    if (body.id_divisao != null) phpRequestBody.id_divisao = parseInt(body.id_divisao);

    const response = await fetch('https://sas.makecard.com.br/api_verificar_antecipacao.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(phpRequestBody),
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ status: 'erro', mensagem: 'API PHP indisponível', temAntecipacao: false });
    }

    const data = await response.json();

    return NextResponse.json({
      status: 'sucesso',
      temAntecipacao: data.temAntecipacao === true,
      mensagem: data.mensagem || '',
      dados: data.dados || null,
    });
  } catch (error) {
    console.error('Erro ao verificar antecipação SasCred:', error);
    return NextResponse.json(
      { status: 'erro', mensagem: 'Erro interno do servidor', temAntecipacao: false },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
