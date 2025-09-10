import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 API buscar-associado iniciada');
    
    // Processar dados da requisição
    const body = await request.json();
    const { cartaodigitado } = body;
    
    if (!cartaodigitado) {
      console.error('❌ Parâmetro cartaodigitado não fornecido');
      return NextResponse.json(
        { 
          success: false,
          error: 'Cartão é obrigatório' 
        },
        { status: 400 }
      );
    }
    
    console.log('🔍 Buscando associado para cartão:', cartaodigitado);
    
    // Preparar dados para enviar ao backend PHP
    const formData = new URLSearchParams();
    formData.append('cartaodigitado', cartaodigitado);
    
    console.log('📤 Enviando dados para localizaasapp.php:', formData.toString());
    
    // Chamar API PHP externa
    const response = await axios.post(
      'https://sas.makecard.com.br/localizaasapp.php',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        timeout: 20000, // 20 segundos de timeout
      }
    );
    
    console.log('📄 Resposta da API PHP:', response.data);
    
    // Verificar se a resposta é válida
    if (response.data && response.data.nome && response.data.nome !== 'login incorreto' && response.data.nome !== "login fazio") {
      console.log('✅ Dados do associado válidos');
      
      return NextResponse.json({
        success: true,
        data: response.data
      });
    } else {
      console.warn('⚠️ Cartão não encontrado ou login inválido:', response.data);
      
      return NextResponse.json({
        success: false,
        error: 'Cartão não encontrado no sistema'
      }, { status: 404 });
    }
    
  } catch (error) {
    console.error('❌ Erro na API buscar-associado:', error);
    
    let errorMessage = 'Erro ao processar a requisição';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Timeout na conexão com o servidor';
        statusCode = 408;
      } else if (error.response) {
        statusCode = error.response.status;
        errorMessage = `Erro ${statusCode} do servidor`;
        console.log('Dados do erro:', error.response.data);
      } else if (error.request) {
        errorMessage = 'Sem resposta do servidor';
        statusCode = 503;
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage, 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: statusCode }
    );
  }
}
