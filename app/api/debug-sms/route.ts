import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * API para testar o envio de SMS
 * IMPORTANTE: Este endpoint deve estar disponível apenas em ambiente de desenvolvimento
 * @param request Requisição com celular e mensagem
 * @returns Resposta com resultado do teste
 */
export async function POST(request: NextRequest) {
  // Verificar se é ambiente de desenvolvimento
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { success: false, message: 'Endpoint disponível apenas em ambiente de desenvolvimento' },
      { status: 403 }
    );
  }
  
  try {
    // Extrair dados do formulário
    const formData = await request.formData();
    const celular = formData.get('celular') as string;
    const mensagem = formData.get('mensagem') as string || 'Teste de envio de SMS via sistema QRCred';
    
    // Validar campos obrigatórios
    if (!celular) {
      return NextResponse.json(
        { success: false, message: 'Número de celular é obrigatório' },
        { status: 400 }
      );
    }
    
    // Formatar o celular
    let celularFormatado = celular.replace(/\D/g, '');
    // Se não começar com 55, adicionar
    if (!celularFormatado.startsWith('55')) {
      celularFormatado = `55${celularFormatado}`;
    }
    
    // Preparar parâmetros para enviar à API de envio de SMS
    const params = new URLSearchParams();
    params.append('celular', celularFormatado);
    params.append('mensagem', mensagem);
    params.append('teste', 'true');
    params.append('metodo', 'sms');
    
    console.log('Enviando SMS de teste para:', celularFormatado);
    console.log('Parâmetros:', params.toString());
    
    // Chamar a API de envio de SMS
    const response = await axios.post(
      'https://sas.makecard.com.br/envia_sms_direto.php',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000
      }
    );
    
    console.log('Resposta do servidor:', response.data);
    
    // Retornar a resposta com os detalhes
    return NextResponse.json({
      success: true,
      message: 'Solicitação de SMS enviada',
      resposta: response.data,
      detalhes: {
        celular: celularFormatado,
        mensagem: mensagem,
        params: params.toString()
      }
    });
  } catch (error) {
    console.error('Erro ao testar envio de SMS:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao enviar SMS de teste',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 