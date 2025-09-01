import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/app/utils/constants';
import axios from 'axios';

/**
 * API para validar o código de recuperação de senha de convênio
 */
export async function POST(request: NextRequest) {
  try {
    // Obter corpo da requisição e logar
    const requestText = await request.text();
    console.log('Corpo da requisição como texto:', requestText);
    
    // Tentar parsear o JSON manualmente para ter mais controle
    let body;
    try {
      body = JSON.parse(requestText);
      console.log('Body parseado:', body);
    } catch (parseError) {
      console.error('Erro ao parsear JSON:', parseError);
      return NextResponse.json(
        { success: false, message: 'Formato de requisição inválido' },
        { status: 400 }
      );
    }
    
    const email = body.email;
    const codigo = body.codigo;
    console.log('Dados extraídos:', { email, codigo });

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'O email é obrigatório' },
        { status: 400 }
      );
    }

    if (!codigo) {
      return NextResponse.json(
        { success: false, message: 'O código de verificação é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`Validando código de recuperação para email: ${email}`);

    try {
      // Chamar API para validar o código
      console.log('Enviando dados para validação:', { email, codigo });
      
      // A API PHP está lendo os dados como JSON via php://input
      const dados = {
        email,
        codigo
      };
      
      console.log('Enviando JSON para API PHP:', JSON.stringify(dados));
      
      const response = await axios.post(
        `${API_URL}/convenio_validar_codigo.php`, 
        dados,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const data = response.data;
      console.log('Resposta da API de validação de código:', data);

      if (data.success) {
        // Adicionar logs detalhados sobre o token
        const timestamp = Date.now();
        console.log('Gerando token com timestamp:', timestamp);
        console.log('Horário em formato legível:', new Date(timestamp).toISOString());
        console.log('Dados do token:', {
          email,
          codigo,
          timestamp,
          expires: new Date(timestamp + 7200000).toISOString() // 2 horas
        });
        
        return NextResponse.json({
          success: true,
          message: 'Código validado com sucesso',
          token: data.token
        });
      } else {
        return NextResponse.json({
          success: false,
          message: data.message || 'Código inválido ou expirado'
        }, { status: 400 });
      }
    } catch (error: any) {
      console.error('Erro ao validar código:', error);
      
      // Detalhes para depuração
      console.error('Detalhes do erro:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      const errorMessage = error.response?.data?.message || 'Erro ao validar código';
      
      return NextResponse.json({
        success: false,
        message: errorMessage
      }, { status: error.response?.status || 500 });
    }
  } catch (error) {
    console.error('Erro na rota de validação de código:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}

/**
 * Função para gerar token
 */
function gerarToken(email: string, codigo: string): string {
  const timestamp = Date.now();
  console.log('Gerando token via função gerarToken com timestamp:', timestamp);
  console.log('Horário em formato legível:', new Date(timestamp).toISOString());
  
  const tokenString = `${email}:${codigo}:${timestamp}`;
  return Buffer.from(tokenString).toString('base64');
} 