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

    // Criar parâmetros no formato form-urlencoded para enviar para a API PHP
    const params = new URLSearchParams();
    params.append('userconv', usuario);
    params.append('passconv', senha);

    console.log('📤 Enviando para API PHP:', {
      userconv: usuario,
      passconv: senha,
      url: 'https://sas.makecard.com.br/convenio_autenticar_app.php'
    });

    // Enviar requisição para o backend
    const response = await axios.post('https://sas.makecard.com.br/convenio_autenticar_app.php', 
      params, 
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000 // 10 segundos
      }
    );

    console.log('📥 Resposta do PHP:', {
      status: response.status,
      dataType: typeof response.data,
      data: response.data
    });

    // Extrair JSON válido da resposta, ignorando warnings HTML
    let jsonData;
    try {
      const responseText = response.data;
      
      // Se a resposta já é um objeto, usar diretamente
      if (typeof responseText === 'object' && responseText !== null) {
        jsonData = responseText;
        console.log('✅ Resposta já é um objeto JSON válido');
      } else if (typeof responseText === 'string') {
        console.log('📄 Resposta como string:', responseText);
        // Procurar pelo início do JSON na resposta
        const jsonStart = responseText.indexOf('{');
        if (jsonStart !== -1) {
          const jsonString = responseText.substring(jsonStart);
          console.log('📝 JSON extraído:', jsonString);
          jsonData = JSON.parse(jsonString);
        } else {
          console.error('❌ JSON não encontrado na resposta string');
          throw new Error('JSON não encontrado na resposta');
        }
      } else {
        console.error('❌ Tipo de resposta não suportado:', typeof responseText);
        throw new Error('Tipo de resposta não suportado');
      }
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      console.error('📄 Dados originais da resposta:', response.data);
      return NextResponse.json({
        success: false,
        message: 'Erro no formato da resposta do servidor. Verifique os logs.',
        debug: {
          responseType: typeof response.data,
          responseData: response.data,
          error: parseError instanceof Error ? parseError.message : String(parseError)
        }
      }, { status: 500 });
    }

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
      console.log('❌ Login falhou:', jsonData.tipo_login);
      return NextResponse.json({
        success: false,
        message: jsonData.tipo_login === 'login incorreto' 
          ? 'Usuário ou senha inválidos' 
          : 'Erro ao realizar login'
      }, { status: 401 });
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