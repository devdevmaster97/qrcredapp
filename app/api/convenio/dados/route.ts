import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Recuperar o token de autenticação dos cookies
    const cookieStore = cookies();
    const tokenEncoded = cookieStore.get('convenioToken')?.value;
    
    if (!tokenEncoded) {
      return NextResponse.json(
        { success: false, message: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Decodificar o token para obter os dados do convênio
    const tokenData = JSON.parse(atob(tokenEncoded));
    
    // Criar parâmetros no formato form-urlencoded para enviar para a API PHP
    const params = new URLSearchParams();
    params.append('userconv', tokenData.user);
    params.append('passconv', tokenData.senha || '');
    
    // Usar a mesma API de login, já que ela retorna todos os dados necessários
    const response = await axios.post('https://sas.makecard.com.br/convenio_autenticar_app.php', 
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('Resposta API Dados:', response.data);

    // Verificar se os dados foram retornados corretamente
    if (response.data && response.data.tipo_login === 'login sucesso') {
      // Se a chamada for bem-sucedida, retornar os dados do convênio
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
          cpf: response.data.cpf,
          numero: response.data.numero,
          cep: response.data.cep,
          cel: response.data.cel,
          tel: response.data.tel,
          email: response.data.email,
          parcelas: response.data.parcela_conv,
          divulga: response.data.divulga,
          pede_senha: response.data.pede_senha,
          latitude: response.data.latitude,
          longitude: response.data.longitude,
          id_categoria: response.data.id_categoria,
          contato: response.data.contato,
          senha: response.data.senha,
          aceito_termo: response.data.aceita_termo
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Sessão expirada ou inválida'
      }, { status: 401 });
    }
  } catch (error) {
    console.error('Erro ao buscar dados do convênio:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao buscar dados do convênio' },
      { status: 500 }
    );
  }
} 