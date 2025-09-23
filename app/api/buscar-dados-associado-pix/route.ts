import { NextRequest, NextResponse } from 'next/server';

// Para APIs server-side, use a variável sem NEXT_PUBLIC_
const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://sas.makecard.com.br';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 API buscar-dados-associado-pix: Recebendo requisição...');
    console.log('🌐 API_URL configurada:', API_URL || 'NÃO CONFIGURADA!');
    
    const formData = await request.formData();
    const matricula = formData.get('matricula');
    const id_empregador = formData.get('id_empregador');
    const id_associado = formData.get('id_associado');
    const id_divisao = formData.get('id_divisao');

    console.log('📋 Dados recebidos:', {
      matricula: matricula || 'VAZIO',
      id_empregador: id_empregador || 'VAZIO',
      id_associado: id_associado || 'VAZIO',
      id_divisao: id_divisao || 'VAZIO',
      tipos: {
        matricula: typeof matricula,
        id_empregador: typeof id_empregador,
        id_associado: typeof id_associado,
        id_divisao: typeof id_divisao
      }
    });

    if (!matricula || !id_empregador || !id_associado || !id_divisao) {
      const camposFaltantes = [];
      if (!matricula) camposFaltantes.push('matricula');
      if (!id_empregador) camposFaltantes.push('id_empregador');
      if (!id_associado) camposFaltantes.push('id_associado');
      if (!id_divisao) camposFaltantes.push('id_divisao');
      
      console.error('❌ Campos faltantes:', camposFaltantes);
      
      return NextResponse.json(
        { 
          erro: 'Parâmetros obrigatórios não informados',
          campos_faltantes: camposFaltantes
        },
        { status: 400 }
      );
    }

    const phpUrl = `${API_URL}/buscar_dados_associado_pix.php`;
    console.log('📤 Enviando para PHP:', phpUrl);
    
    // Converter FormData para objeto para debug
    const formDataDebug: any = {};
    formData.forEach((value, key) => {
      formDataDebug[key] = value;
    });
    console.log('📦 FormData sendo enviado:', formDataDebug);

    // Fazer a requisição para o servidor PHP
    const response = await fetch(phpUrl, {
      method: 'POST',
      body: formData,
    });

    console.log('📥 Resposta do PHP - Status:', response.status);
    console.log('📥 Resposta do PHP - Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📄 Resposta bruta do PHP (primeiros 500 chars):', responseText.substring(0, 500));
    console.log('📄 Tamanho da resposta:', responseText.length, 'caracteres');

    if (!response.ok) {
      console.error('❌ Erro HTTP do PHP:', response.status, responseText);
      // Se o arquivo PHP não existe, retornar sem erro para não quebrar o fluxo
      if (response.status === 404) {
        console.warn('⚠️ API PHP não encontrada, retornando sem PIX');
        return NextResponse.json({ pix: null });
      }
      throw new Error(`Erro HTTP do PHP: ${response.status} - ${responseText}`);
    }

    // Tentar fazer parse do JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('✅ JSON parseado com sucesso:', {
        data,
        tipo: typeof data,
        keys: data ? Object.keys(data) : [],
        pix: data?.pix || 'NÃO ENCONTRADO',
        erro: data?.erro || 'NENHUM ERRO'
      });
    } catch (parseError) {
      console.error('❌ Erro ao parsear JSON:', parseError);
      console.error('❌ Texto que causou erro:', responseText);
      // Se não conseguir parsear, retornar sem PIX
      console.warn('⚠️ Resposta inválida do PHP, retornando sem PIX');
      return NextResponse.json({ pix: null });
    }

    console.log('🚀 Retornando dados para o frontend:', data);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('💥 Erro ao buscar dados do associado com PIX:', error);
    console.error('Stack:', error.stack);
    
    // Não retornar erro 500 para não quebrar o fluxo principal
    // Apenas retornar sem o PIX
    console.warn('⚠️ Erro na busca do PIX, continuando sem PIX');
    return NextResponse.json({ pix: null });
  }
}
