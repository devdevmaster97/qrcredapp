import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Obter o token do cookie
    const cookieStore = cookies();
    const convenioToken = cookieStore.get('convenioToken');

    if (!convenioToken) {
      return NextResponse.json(
        { success: false, message: 'Token não encontrado' },
        { status: 401 }
      );
    }

    // Decodificar o token para obter os dados do convênio
    const tokenData = JSON.parse(atob(convenioToken.value));
    const codConvenio = parseInt(tokenData.id);
    
    // Obter os dados do corpo da requisição
    const body = await request.json();
    const { lancamento, associado, data, mes, parcela } = body;

    if (!lancamento || !associado || !data || !mes) {
      return NextResponse.json(
        { success: false, message: 'Parâmetros obrigatórios não fornecidos' },
        { status: 400 }
      );
    }

    // Preparar os parâmetros para a API PHP
    const params = new URLSearchParams();
    params.append('lancamento', lancamento.toString());
    params.append('convenio', codConvenio.toString());
    params.append('associado', associado.toString());
    params.append('data', data);
    params.append('mes', mes);
    
    if (parcela) {
      params.append('parcela', parcela.toString());
    }
    
    // Log detalhado dos parâmetros enviados para a API
    console.log('=====================================================');
    console.log('ENVIANDO REQUISIÇÃO PARA excluir_estorno_app.php');
    console.log('URL:', 'https://sas.makecard.com.br/excluir_estorno_app.php');
    console.log('MÉTODO: POST');
    console.log('PARÂMETROS:');
    console.log('  lancamento:', lancamento.toString());
    console.log('  convenio:', codConvenio.toString());
    console.log('  associado:', associado.toString());
    console.log('  data:', data);
    console.log('  mes:', mes);
    if (parcela) console.log('  parcela:', parcela.toString());
    console.log('PARAMS STRING:', params.toString());
    console.log('=====================================================');

    // Chamar a API PHP
    const response = await axios.post(
      'https://sas.makecard.com.br/excluir_estorno_app.php',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    // Log detalhado da resposta da API
    console.log('=====================================================');
    console.log('RESPOSTA DA API excluir_estorno_app.php:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('=====================================================');

    if (response.data && response.data.success) {
      return NextResponse.json({
        success: true,
        message: 'Estorno cancelado com sucesso',
        data: response.data
      });
    } else {
      return NextResponse.json({
        success: false,
        message: response.data?.message || 'Erro ao cancelar estorno'
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Erro ao cancelar estorno:', error);
    
    let errorMessage = 'Erro ao cancelar estorno';
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    }
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
} 