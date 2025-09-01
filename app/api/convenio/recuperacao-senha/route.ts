import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/app/utils/constants';
import axios from 'axios';

/**
 * API para iniciar o processo de recuperação de senha de convênio
 * Envia um código de 6 dígitos para o email informado
 */
export async function POST(request: NextRequest) {
  try {
    // Obter dados, suportando tanto JSON quanto FormData
    let email = '';
    
    // Verificar o content-type da requisição
    const contentType = request.headers.get('content-type') || '';
    console.log('Content-Type da requisição:', contentType);
    
    if (contentType.includes('application/json')) {
      // Obter corpo da requisição como JSON
      const requestText = await request.text();
      console.log('Corpo da requisição como texto:', requestText);
      
      try {
        const body = JSON.parse(requestText);
        console.log('Body parseado:', body);
        email = body.email;
      } catch (parseError) {
        console.error('Erro ao parsear JSON:', parseError);
        return NextResponse.json(
          { success: false, message: 'Formato de requisição inválido' },
          { status: 400 }
        );
      }
    } else {
      // Assumir FormData
      try {
        const formData = await request.formData();
        email = formData.get('email') as string;
      } catch (formError) {
        console.error('Erro ao processar FormData:', formError);
        return NextResponse.json(
          { success: false, message: 'Formato de requisição inválido' },
          { status: 400 }
        );
      }
    }
    
    console.log('Email extraído:', email);

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'O email é obrigatório' },
        { status: 400 }
      );
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Por favor, informe um email válido' },
        { status: 400 }
      );
    }

    console.log(`Iniciando recuperação de senha para email: ${email}`);

    // Gerar código de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const dataExpiracao = new Date();
    dataExpiracao.setMinutes(dataExpiracao.getMinutes() + 15); // Código válido por 15 minutos

    try {
      // Chamar API para verificar se o email existe e enviar código
      console.log('Enviando dados para API:', {
        email,
        codigo,
        dataExpiracao: dataExpiracao.toISOString()
      });
      
      // Usar JSON para enviar dados à API PHP
      const jsonResponse = await axios.post(
        `${API_URL}/convenio_recuperacao_senha.php`, 
        {
          email,
          codigo,
          dataExpiracao: dataExpiracao.toISOString()
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000 // Timeout de 15 segundos
        }
      );
      
      const jsonData = jsonResponse.data;
      console.log('Resposta da API de recuperação:', jsonData);
      
      if (jsonData.success) {
        const emailMascarado = mascaraEmail(jsonData.email);
        return NextResponse.json({
          success: true,
          message: 'Código de recuperação enviado com sucesso para seu email.',
          destino: emailMascarado
        });
      } else {
        return NextResponse.json({
          success: false,
          message: jsonData.message || 'Erro ao enviar código de recuperação'
        }, { status: 400 });
      }
    } catch (jsonError: any) {
      console.error('Erro ao enviar código de recuperação:', jsonError);
      
      // Depuração completa para identificar o problema
      console.error('URL da API:', `${API_URL}/convenio_recuperacao_senha.php`);
      console.error('Dados enviados:', { 
        email, 
        codigo, 
        dataExpiracao: dataExpiracao.toISOString() 
      });
      console.error('Resposta de erro:', {
        status: jsonError.response?.status,
        statusText: jsonError.response?.statusText,
        data: jsonError.response?.data,
        message: jsonError.message
      });
      
      // Fornecer mais detalhes sobre o erro
      let errorMessage = 'Erro ao processar solicitação de recuperação de senha';
      if (jsonError.response?.data?.message) {
        errorMessage = jsonError.response.data.message;
      } else if (jsonError.message.includes('timeout')) {
        errorMessage = 'Tempo limite excedido. O servidor está demorando para responder.';
      } else if (jsonError.message.includes('Network Error')) {
        errorMessage = 'Erro de rede. Verifique sua conexão com a internet.';
      }
        
      return NextResponse.json({
        success: false,
        message: errorMessage
      }, { status: jsonError.response?.status || 500 });
    }
  } catch (error) {
    console.error('Erro na rota de recuperação de senha:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}

/**
 * Função para mascarar email antes de exibir ao usuário
 */
function mascaraEmail(email: string): string {
  if (!email || email.indexOf('@') === -1) return '***@***.com';
  
  const [usuario, dominio] = email.split('@');
  const dominioPartes = dominio.split('.');
  const extensao = dominioPartes.pop() || '';
  const nomeUsuarioMascarado = usuario.substring(0, Math.min(2, usuario.length)) + '***';
  const nomeDominioMascarado = dominioPartes.join('.').substring(0, Math.min(2, dominioPartes.join('.').length)) + '***';
  
  return `${nomeUsuarioMascarado}@${nomeDominioMascarado}.${extensao}`;
} 