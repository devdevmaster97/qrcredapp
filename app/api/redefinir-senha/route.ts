import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * API para redefinir a senha do associado
 * Recebe o token de validação, cartão e nova senha
 * @param request Requisição com token, cartão e nova senha
 * @returns Resposta com status da redefinição
 */
export async function POST(request: NextRequest) {
  try {
    // Extrair dados do formulário
    const formData = await request.formData();
    const cartao = formData.get('cartao') as string;
    const novaSenha = formData.get('senha') as string;
    const confirmacaoSenha = formData.get('confirmacao') as string;
    const token = formData.get('token') as string;

    // Validar campos obrigatórios
    if (!cartao) {
      return NextResponse.json(
        { success: false, message: 'Número do cartão é obrigatório' },
        { status: 400 }
      );
    }

    if (!novaSenha) {
      return NextResponse.json(
        { success: false, message: 'Nova senha é obrigatória' },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token de validação é obrigatório' },
        { status: 400 }
      );
    }

    // Validar formato da senha - agora exigimos exatamente 6 dígitos
    if (!/^\d{6}$/.test(novaSenha)) {
      return NextResponse.json(
        { success: false, message: 'A senha deve conter exatamente 6 dígitos numéricos' },
        { status: 400 }
      );
    }

    // Validar o token (em produção, você validaria com o token armazenado no servidor)
    let tokenValido = false;
    try {
      const tokenDecodificado = Buffer.from(token, 'base64').toString('utf-8');
      const partes = tokenDecodificado.split(':');
      
      if (partes.length >= 2) {
        const cartaoToken = partes[0];
        const timestamp = parseInt(partes[1]);
        const agora = Date.now();
        
        // Verificar se o cartão corresponde e se o token não expirou (10 minutos)
        if (cartaoToken === cartao.replace(/\D/g, '') && (agora - timestamp) < 10 * 60 * 1000) {
          tokenValido = true;
        }
      }
    } catch (error) {
      console.error('Erro ao validar token:', error);
    }

    if (!tokenValido) {
      return NextResponse.json(
        { success: false, message: 'Token inválido ou expirado, solicite um novo código' },
        { status: 401 }
      );
    }

    // Limpar o cartão (remover não numéricos)
    const cartaoLimpo = cartao.replace(/\D/g, '');
    
    try {
      // Preparar parâmetros para redefinição de senha
      const params = new URLSearchParams();
      params.append('cartao', cartaoLimpo);
      params.append('senha', novaSenha);
      
      console.log('Redefinindo senha para o cartão:', cartaoLimpo);
  
      // Chamar API para redefinir a senha - agora usando altera_senha_associado.php
      const response = await axios.post(
        'https://sas.makecard.com.br/altera_senha_associado.php',
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000 // 10 segundos de timeout
        }
      );
  
      console.log('Resposta da redefinição de senha:', response.data);
  
      // Verificar resposta da redefinição
      // A API pode retornar "alterado" como string ou ter um campo de status
      if (response.data === 'alterado' || 
          (typeof response.data === 'object' && response.data.status === 'alterado')) {
        return NextResponse.json({
          success: true,
          message: 'Senha redefinida com sucesso. Você já pode fazer login com sua nova senha.'
        });
      } else {
        // Extrair mensagem de erro, se disponível
        let mensagemErro = 'Erro ao redefinir senha no servidor.';
        
        if (typeof response.data === 'object' && response.data.erro) {
          mensagemErro = response.data.erro;
        } else if (typeof response.data === 'string' && response.data !== 'alterado') {
          mensagemErro = response.data;
        }
        
        return NextResponse.json(
          { success: false, message: mensagemErro },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Erro ao conectar com servidor de redefinição:', error);
      
      // Solução temporária: Retornar sucesso mesmo sem conseguir conectar à API
      // APENAS PARA AMBIENTE DE DESENVOLVIMENTO - em produção, remover isto
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          message: 'Senha redefinida com sucesso (AMBIENTE DESENVOLVIMENTO). Você já pode fazer login com sua nova senha.',
          debug: 'Aviso: Este é um ambiente de desenvolvimento. A senha não foi realmente alterada no servidor.'
        });
      }
      
      // Extrair mensagem de erro do Axios
      let mensagemErro = 'Erro na conexão com o servidor.';
      let statusCode = 500;
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          mensagemErro = 'Tempo limite de conexão excedido. Tente novamente mais tarde.';
        } else if (error.response) {
          statusCode = error.response.status;
          mensagemErro = `Erro ${statusCode} do servidor.`;
          
          // Verificar detalhes da resposta
          if (error.response.data) {
            console.log('Detalhes do erro:', error.response.data);
            if (typeof error.response.data === 'string') {
              mensagemErro = error.response.data;
            } else if (typeof error.response.data === 'object' && error.response.data.erro) {
              mensagemErro = error.response.data.erro;
            }
          }
        }
      }
      
      return NextResponse.json(
        { success: false, message: mensagemErro },
        { status: statusCode }
      );
    }
  } catch (error) {
    console.error('Erro na redefinição de senha:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao processar solicitação de redefinição de senha' },
      { status: 500 }
    );
  }
} 