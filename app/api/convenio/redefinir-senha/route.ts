import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/app/utils/constants';
import axios from 'axios';

/**
 * API para redefinir a senha do convênio
 */
export async function POST(request: NextRequest) {
  try {
    // Obter dados do JSON
    const body = await request.json();
    const email = body.email;
    const senha = body.senha;
    const token = body.token;
    console.log('Dados extraídos:', { email, token, senha: '********' });

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'O email é obrigatório' },
        { status: 400 }
      );
    }

    if (!senha) {
      return NextResponse.json(
        { success: false, message: 'A nova senha é obrigatória' },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'O token de autenticação é obrigatório' },
        { status: 400 }
      );
    }

    // Validar a senha
    if (senha.length < 6) {
      return NextResponse.json({
        success: false,
        message: 'A senha deve ter no mínimo 6 caracteres'
      }, { status: 400 });
    }

    // Validar o token
    try {
      const tokenDecodificado = Buffer.from(token, 'base64').toString('utf-8');
      const [tokenEmail, tokenCodigo, tokenTimestamp] = tokenDecodificado.split(':');
      
      // Verificar se o token pertence ao email correto
      if (tokenEmail !== email) {
        console.log('Token inválido: email do token não corresponde ao email fornecido');
        console.log('Email do token:', tokenEmail);
        console.log('Email fornecido:', email);
        return NextResponse.json({
          success: false,
          message: 'Token inválido'
        }, { status: 403 });
      }
      
      // Verificar se o token não expirou (aumentado para 24 horas)
      const tokenTime = parseInt(tokenTimestamp);
      const currentTime = Date.now();
      const tokenAge = currentTime - tokenTime;
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas em milissegundos
      
      console.log('Token timestamp:', new Date(tokenTime).toISOString());
      console.log('Current time:', new Date(currentTime).toISOString());
      console.log('Token age in minutes:', Math.floor(tokenAge / 60000));
      console.log('Max age in minutes:', Math.floor(maxAge / 60000));
      
      // Verificar se o timestamp está em formato de milissegundos (verificando se o valor é maior que 1600000000000)
      // Isso ajuda a identificar se o token foi gerado com timestamp em segundos ou milissegundos
      if (tokenTime < 1600000000000) {
        console.log('Token parece estar em segundos em vez de milissegundos');
        console.log('Convertendo timestamp...');
        // Converter para milissegundos e recalcular idade
        const adjustedTokenTime = tokenTime * 1000;
        const adjustedTokenAge = currentTime - adjustedTokenTime;
        console.log('Token timestamp ajustado:', new Date(adjustedTokenTime).toISOString());
        console.log('Token age ajustada em minutos:', Math.floor(adjustedTokenAge / 60000));
        
        if (adjustedTokenAge > maxAge) {
          console.log('Token expirado mesmo após ajuste. Idade em horas:', Math.floor(adjustedTokenAge / 3600000));
          return NextResponse.json({
            success: false,
            message: 'Token expirado. Inicie o processo de recuperação novamente.'
          }, { status: 403 });
        }
      } else if (tokenAge > maxAge) {
        console.log('Token expirado. Idade em horas:', Math.floor(tokenAge / 3600000));
        return NextResponse.json({
          success: false,
          message: 'Token expirado. Inicie o processo de recuperação novamente.'
        }, { status: 403 });
      }
      
      // Chamar API para alterar a senha
      console.log('Enviando dados para redefinição de senha:', { 
        email, 
        senha: '********', // Ocultado por segurança
        codigo: tokenCodigo 
      });
      
      const dados = {
        email,
        senha,
        codigo: tokenCodigo
      };
      
      console.log('Enviando JSON para API PHP:', JSON.stringify(dados).replace(/("senha":")([^"]+)/, '$1********'));
      
      const response = await axios.post(
        `${API_URL}/convenio_redefinir_senha.php`, 
        dados,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const data = response.data;
      console.log('Resposta da API de redefinição de senha:', data);

      if (data.success) {
        return NextResponse.json({
          success: true,
          message: 'Senha alterada com sucesso'
        });
      } else {
        return NextResponse.json({
          success: false,
          message: data.message || 'Erro ao redefinir senha'
        }, { status: 400 });
      }
    } catch (error: any) {
      console.error('Erro ao validar token ou redefinir senha:', error);
      
      // Detalhes para depuração
      if (error.response) {
        console.error('Detalhes do erro de resposta:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      
      let errorMessage = 'Erro ao processar token de redefinição';
      
      if (error.message?.includes('base64')) {
        errorMessage = 'Token inválido';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      return NextResponse.json({
        success: false,
        message: errorMessage
      }, { status: error.response?.status || 500 });
    }
  } catch (error) {
    console.error('Erro na rota de redefinição de senha:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno no servidor' },
      { status: 500 }
    );
  }
} 