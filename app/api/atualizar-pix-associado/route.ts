import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const matricula = formData.get('matricula');
    const id_empregador = formData.get('id_empregador');
    const id_associado = formData.get('id_associado');
    const id_divisao = formData.get('id_divisao');
    const pix = formData.get('pix');

    if (!matricula || !id_empregador || !id_associado || !id_divisao || !pix) {
      return NextResponse.json(
        { erro: 'Parâmetros obrigatórios não informados' },
        { status: 400 }
      );
    }

    // Fazer a requisição para o servidor PHP
    const response = await fetch(`${API_URL}/atualizar_pix_associado.php`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Erro ao atualizar PIX do associado');
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Erro ao atualizar PIX do associado:', error);
    return NextResponse.json(
      { erro: 'Erro ao atualizar PIX do associado' },
      { status: 500 }
    );
  }
}
