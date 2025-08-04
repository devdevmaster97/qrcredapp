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

    // Extrair JSON válido da resposta, ignorando warnings HTML
    let jsonData;
    try {
      const responseText = response.data;
      const jsonStart = responseText.indexOf('{');
      if (jsonStart !== -1) {
        const jsonString = responseText.substring(jsonStart);
        jsonData = JSON.parse(jsonString);
      } else {
        throw new Error('JSON não encontrado na resposta');
      }
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError);
      return NextResponse.json({
        success: false,
        message: 'Erro no formato da resposta do servidor'
      }, { status: 500 });
    }

    // Verificar se os dados foram retornados corretamente
    if (jsonData && jsonData.tipo_login === 'login sucesso') {
      // Se a chamada for bem-sucedida, retornar os dados do convênio
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
          cpf: jsonData.cpf,
          numero: jsonData.numero,
          cep: jsonData.cep,
          cel: jsonData.cel,
          tel: jsonData.tel,
          email: jsonData.email,
          parcelas: jsonData.parcela_conv,
          divulga: jsonData.divulga,
          pede_senha: jsonData.pede_senha,
          latitude: jsonData.latitude,
          longitude: jsonData.longitude,
          id_categoria: jsonData.id_categoria,
          contato: jsonData.contato,
          senha: jsonData.senha,
          aceito_termo: jsonData.aceita_termo
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