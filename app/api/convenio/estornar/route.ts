import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

interface EstornoResponse {
  success: boolean;
  message: string;
  situacao?: number;
}

export async function POST(request: NextRequest) {
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

    // Obter o ID do lançamento a ser estornado do corpo da requisição
    const body = await request.json();
    const idLancamento = body.id;

    if (!idLancamento) {
      return NextResponse.json(
        { success: false, message: 'ID do lançamento não fornecido' },
        { status: 400 }
      );
    }

    // Criar parâmetros para a API PHP
    const params = new URLSearchParams();
    params.append('id_lancamento', idLancamento.toString());
    params.append('cod_convenio', codConvenio.toString());

    // Fazer a requisição para a API PHP de estorno
    const response = await axios.post(
      'https://sas.makecard.com.br/estornar_lancamento_app.php',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('Resposta API Estorno:', response.data);

    // Verificar a resposta do servidor
    if (response.data.success || response.data.situacao === 1) {
      return NextResponse.json({
        success: true,
        message: 'Lançamento estornado com sucesso'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: response.data.message || 'Erro ao estornar lançamento'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Erro ao estornar lançamento:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao estornar lançamento' },
      { status: 500 }
    );
  }
} 