import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 API atualizar-pix-associado: Recebendo requisição...');
    
    const formData = await request.formData();
    const matricula = formData.get('matricula');
    const id_empregador = formData.get('id_empregador');
    const id_associado = formData.get('id_associado');
    const id_divisao = formData.get('id_divisao');
    const pix = formData.get('pix');

    console.log('📋 Dados recebidos:', {
      matricula,
      id_empregador,
      id_associado,
      id_divisao,
      pix: pix ? `${(pix as string).substring(0, 5)}...` : 'vazio'
    });

    if (!matricula || !id_empregador || !id_associado || !id_divisao || !pix) {
      const camposFaltantes = [];
      if (!matricula) camposFaltantes.push('matricula');
      if (!id_empregador) camposFaltantes.push('id_empregador');
      if (!id_associado) camposFaltantes.push('id_associado');
      if (!id_divisao) camposFaltantes.push('id_divisao');
      if (!pix) camposFaltantes.push('pix');
      
      console.error('❌ Campos faltantes:', camposFaltantes);
      
      return NextResponse.json(
        { 
          erro: 'Parâmetros obrigatórios não informados',
          campos_faltantes: camposFaltantes
        },
        { status: 400 }
      );
    }

    const phpUrl = `${API_URL}/atualizar_pix_associado.php`;
    console.log('📤 Enviando para PHP:', phpUrl);

    // Fazer a requisição para o servidor PHP
    const response = await fetch(phpUrl, {
      method: 'POST',
      body: formData,
    });

    console.log('📥 Resposta do PHP - Status:', response.status);

    const responseText = await response.text();
    console.log('📄 Resposta bruta do PHP:', responseText);

    if (!response.ok) {
      throw new Error(`Erro HTTP do PHP: ${response.status} - ${responseText}`);
    }

    // Tentar fazer parse do JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('✅ JSON parseado com sucesso:', data);
    } catch (parseError) {
      console.error('❌ Erro ao parsear JSON:', parseError);
      throw new Error(`Resposta inválida do PHP: ${responseText}`);
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('💥 Erro ao atualizar PIX do associado:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      { 
        erro: 'Erro ao atualizar PIX do associado',
        detalhes: error.message
      },
      { status: 500 }
    );
  }
}
