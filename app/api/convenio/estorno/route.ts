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
    
    // Obter os dados do estorno do corpo da requisição
    const body = await request.json();
    const { lancamento, data, hora, empregador, valor, mes } = body;

    if (!lancamento || !data || !empregador || !valor || !mes) {
      return NextResponse.json(
        { success: false, message: 'Parâmetros obrigatórios não fornecidos' },
        { status: 400 }
      );
    }

    // Garantir que a data esteja no formato correto (YYYY-MM-DD)
    let dataFormatada = data;
    if (data.includes('/')) {
      const [dia, mes, ano] = data.split('/');
      dataFormatada = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }

    // Garantir que empregador seja um número inteiro
    const empregadorInt = parseInt(empregador);
    
    // Formatar o valor com ponto como separador decimal (substituir vírgula por ponto)
    const valorFormatado = valor.replace(',', '.');
    
    // Criar parâmetros para a API PHP
    const params = new URLSearchParams();
    params.append('lancamento', lancamento);
    params.append('data', dataFormatada);
    if (hora) {
      params.append('hora', hora);
    }
    params.append('empregador', empregadorInt.toString());
    params.append('convenio', codConvenio.toString());
    params.append('valor', valorFormatado);
    params.append('mes', mes);

    console.log('Parâmetros enviados para estorno:', {
      lancamento,
      data: dataFormatada,
      hora,
      empregador: empregadorInt,
      convenio: codConvenio,
      valor: valorFormatado,
      mes
    });

    // Fazer a requisição para a API PHP de estorno
    const response = await axios.post(
      'https://sas.makecard.com.br/excluir_via_app.php',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('Resposta API Estorno:', response.data);

    // Verificar a resposta do servidor
    if (response.data && response.data.success) {
      return NextResponse.json({
        success: true,
        message: 'Lançamento estornado com sucesso',
        data: response.data.data
      });
    } else {
      return NextResponse.json({
        success: false,
        message: response.data?.message || 'Erro ao estornar lançamento'
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Erro ao estornar lançamento:', error);
    
    // Capturar mensagem de erro específica da API, se houver
    let errorMessage = 'Erro ao estornar lançamento';
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    }
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
} 