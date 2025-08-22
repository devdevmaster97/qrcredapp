import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const usuario = body.usuario;
    const senha = body.senha;

    console.log('🔍 Dados recebidos:', { usuario, senha });

    if (!usuario || !senha) {
      return NextResponse.json(
        { success: false, message: 'Usuário e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Usar o MESMO padrão do login do associado que funciona
    const payload = new URLSearchParams();
    payload.append('userconv', usuario);
    payload.append('passconv', senha);

    console.log('📤 Enviando para API PHP (URLSearchParams):', {
      userconv: usuario,
      passconv: senha,
      payload_string: payload.toString(),
      url: 'https://sas.makecard.com.br/convenio_autenticar_app.php'
    });
    
    // Enviar requisição usando o MESMO padrão do login do associado
    const response = await axios.post(
      'https://sas.makecard.com.br/convenio_autenticar_app.php',
      payload,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000, // 10 segundos (mesmo do associado)
      }
    );

    console.log('📥 Resposta do PHP:', {
      status: response.status,
      dataType: typeof response.data,
      data: response.data
    });

    // Log completo da resposta (mesmo padrão do login do associado)
    console.log('Resposta completa do backend:', JSON.stringify(response.data));

    // Verificação básica da resposta (mesmo padrão do login do associado)
    if (!response.data || typeof response.data !== 'object') {
      console.log('Resposta inválida do backend');
      return NextResponse.json({
        success: false,
        message: 'Resposta inválida do servidor'
      }, { status: 500 });
    }

    // Usar a resposta diretamente (mesmo padrão do associado)
    const jsonData = response.data;

    console.log('🔍 Dados do login extraídos:', jsonData);
    
    // Verificar se a resposta contém os campos necessários
    if (!jsonData.tipo_login) {
      console.error('❌ API PHP não está processando login corretamente');
      console.error('📄 Resposta recebida:', jsonData);
      console.error('📤 Parâmetros enviados:', { userconv: usuario, passconv: senha });
      
      return NextResponse.json({
        success: false,
        message: 'Erro na API do servidor. A consulta de login não foi executada.',
        debug: {
          problema: 'API PHP não retornou tipo_login - possível problema nos parâmetros POST',
          resposta_api: jsonData,
          parametros_enviados: { userconv: usuario, passconv: senha },
          url_api: 'https://sas.makecard.com.br/convenio_autenticar_app.php'
        }
      }, { status: 500 });
    }
    
    // Tratar diferentes tipos de resposta da API PHP
    if (jsonData.tipo_login === 'login sucesso') {
      // Criar um token JWT ou qualquer outro identificador único
      const token = btoa(JSON.stringify({
        id: jsonData.cod_convenio,
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
          cod_convenio: jsonData.cod_convenio,
          razaosocial: jsonData.razaosocial,
          nome_fantasia: jsonData.nomefantasia,
          endereco: jsonData.endereco,
          bairro: jsonData.bairro,
          cidade: jsonData.cidade,
          estado: jsonData.estado,
          cnpj: jsonData.cnpj,
          cpf: jsonData.cpf
        }
      });
    } else {
      console.log('❌ Login falhou:', {
        tipo_login: jsonData.tipo_login,
        cod_convenio: jsonData.cod_convenio,
        dados_completos: jsonData
      });
      
      // Tratar diferentes tipos de erro baseado na API PHP
      let mensagemErro = 'Erro ao realizar login';
      let statusCode = 401;
      
      switch (jsonData.tipo_login) {
        case 'login incorreto':
          mensagemErro = 'Usuário ou senha incorretos';
          break;
        case 'login vazio':
          mensagemErro = 'Usuário e senha são obrigatórios';
          statusCode = 400;
          break;
        default:
          mensagemErro = `Erro de login: ${jsonData.tipo_login}`;
      }
      
      return NextResponse.json({
        success: false,
        message: mensagemErro,
        debug: {
          tipo_login: jsonData.tipo_login,
          cod_convenio: jsonData.cod_convenio
        }
      }, { status: statusCode });
    }
  } catch (error) {
    console.error('💥 Erro detalhado no login:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      isAxiosError: axios.isAxiosError(error)
    });
    
    if (axios.isAxiosError(error)) {
      console.error('🌐 Detalhes do erro Axios:', {
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao realizar login',
        debug: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 