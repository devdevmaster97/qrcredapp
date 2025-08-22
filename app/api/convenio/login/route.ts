import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const usuario = body.usuario;
    const senha = body.senha;

    // Log para diagnóstico (mesmo padrão do login do associado)
    console.log('API local recebeu requisição de login para usuário:', usuario);

    // Verificar se os dados estão presentes
    if (!usuario || !senha) {
      console.log('Erro: Usuário ou senha ausentes');
      return NextResponse.json(
        { success: false, message: 'Usuário e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Preparar os dados para enviar ao backend (EXATAMENTE como no login do associado)
    const payload = new URLSearchParams();
    payload.append('userconv', String(usuario).trim());
    payload.append('passconv', String(senha).trim());

    console.log('Enviando para o backend:', payload.toString());

    // Enviar a requisição para o backend (EXATAMENTE como no login do associado)
    const response = await axios.post(
      'https://sas.makecard.com.br/convenio_autenticar_app.php',
      payload,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000, // 10 segundos de timeout
      }
    );

    // Log completo da resposta (mesmo padrão do login do associado)
    console.log('Resposta completa do backend:', JSON.stringify(response.data));

    // Verificação básica da resposta (mesmo padrão do login do associado)
    if (!response.data || typeof response.data !== 'object') {
      console.log('Resposta inválida do backend');
      return NextResponse.json(
        { success: false, message: 'Resposta inválida do servidor' },
        { status: 500 }
      );
    }

    // Verificar se tem os campos de login (específico para convênio)
    if (!response.data.tipo_login) {
      console.log('Resposta sem campo tipo_login - API não processou login');
      return NextResponse.json(
        { 
          success: false, 
          message: 'API PHP não processou o login corretamente',
          debug: {
            responseData: response.data,
            parametrosEnviados: payload.toString()
          }
        },
        { status: 500 }
      );
    }

    // Processar resposta de login bem-sucedido
    if (response.data.tipo_login === 'login sucesso') {
      // Criar um token JWT ou qualquer outro identificador único
      const token = btoa(JSON.stringify({
        id: response.data.cod_convenio,
        user: usuario,
        senha: senha,
        timestamp: new Date().getTime()
      }));

      // Salvar o token em um cookie
      const cookieStore = cookies();
      cookieStore.set('convenioToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 semana
        path: '/',
      });

      console.log('✅ Login bem-sucedido');
      return NextResponse.json({
        success: true,
        data: {
          cod_convenio: response.data.cod_convenio,
          razaosocial: response.data.razaosocial,
          nome_fantasia: response.data.nomefantasia,
          endereco: response.data.endereco,
          bairro: response.data.bairro,
          cidade: response.data.cidade,
          estado: response.data.estado,
          cnpj: response.data.cnpj,
          cpf: response.data.cpf
        }
      });
    } else {
      // Tratar diferentes tipos de erro da API PHP
      console.log('❌ Login falhou:', response.data.tipo_login);
      
      let mensagemErro = 'Usuário ou senha inválidos';
      
      switch (response.data.tipo_login) {
        case 'login incorreto':
          mensagemErro = 'Usuário ou senha incorretos';
          break;
        case 'login vazio':
          mensagemErro = 'Usuário e senha são obrigatórios';
          break;
        default:
          mensagemErro = `Erro de login: ${response.data.tipo_login}`;
      }
      
      return NextResponse.json({
        success: false,
        message: mensagemErro
      }, { status: 401 });
    }

  } catch (error) {
    console.error('Erro na API de login:', error);
    
    // Tentar fornecer detalhes mais específicos sobre o erro (mesmo padrão do associado)
    let errorMessage = 'Erro ao processar a requisição';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Timeout na conexão com o servidor';
      } else if (error.response) {
        statusCode = error.response.status;
        errorMessage = `Erro ${statusCode} do servidor`;
        console.log('Dados do erro:', error.response.data);
      } else if (error.request) {
        errorMessage = 'Sem resposta do servidor';
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        message: errorMessage, 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: statusCode }
    );
  }
}