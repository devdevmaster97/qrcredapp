import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const usuario = body.usuario;
    const senha = body.senha;

    if (!usuario || !senha) {
      return NextResponse.json(
        { success: false, message: 'Usuário e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Gerar hashes MD5 dos dados de entrada
    const usuarioHash = crypto.createHash('md5').update(usuario).digest('hex');
    const senhaHash = crypto.createHash('md5').update(senha).digest('hex');

    // Criar parâmetros no formato form-urlencoded para enviar para a API PHP
    const params = new URLSearchParams();
    params.append('userconv', usuarioHash);
    params.append('passconv', senhaHash);

    // Enviar requisição para o backend
    const response = await axios.post('https://qrcred.makecard.com.br/convenio_autenticar_app.php', 
      params, 
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('Resposta API:', response.data);

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
      return NextResponse.json({
        success: false,
        message: response.data.tipo_login === 'login incorreto' 
          ? 'Usuário ou senha inválidos' 
          : 'Erro ao realizar login'
      }, { status: 401 });
    }
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao realizar login' },
      { status: 500 }
    );
  }
} 