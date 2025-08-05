import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Obter o token do cookie
    const cookieStore = request.cookies;
    const convenioToken = cookieStore.get('convenioToken');

    if (!convenioToken) {
      return NextResponse.json(
        { success: false, message: 'Token não encontrado' },
        { status: 401 }
      );
    }

    // Decodificar o token para obter os dados do convênio
    const tokenData = JSON.parse(atob(convenioToken.value));
    const codConvenio = tokenData.id;

    // Criar parâmetros para a API PHP
    const params = new URLSearchParams();
    params.append('cod_convenio', codConvenio.toString());

    // Fazer a requisição para a API PHP
    const response = await axios.get(
      'https://sas.makecard.com.br/listar_lancamentos_convenio_app.php',
      {
        params,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('🔍 RESPOSTA BRUTA PHP:', response.data);
    console.log('🔍 SUCCESS PHP:', response.data?.success);
    console.log('🔍 LANÇAMENTOS PHP:', response.data?.lancamentos?.length || 0);
    console.log('🔍 MESSAGE PHP:', response.data?.message);

    if (response.data.success) {
      console.log('🔍 RETORNANDO DADOS PARA FRONTEND:', {
        success: true,
        data: response.data.lancamentos,
        total: response.data.lancamentos?.length || 0
      });
      
      return NextResponse.json({
        success: true,
        data: response.data.lancamentos
      });
    } else {
      console.log('🔍 ERRO DO PHP:', response.data?.message);
      return NextResponse.json({
        success: false,
        message: response.data.message || 'Erro ao buscar lançamentos'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Erro ao buscar lançamentos:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao buscar lançamentos' },
      { status: 500 }
    );
  }
} 