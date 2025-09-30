import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Obter o token do cookie
    const cookieStore = request.cookies;
    const convenioToken = cookieStore.get('convenioToken');

    if (!convenioToken) {
      console.log(' LANÇAMENTOS - Token não encontrado nos cookies');
      return NextResponse.json(
        { success: false, message: 'Token não encontrado' },
        { status: 401 }
      );
    }

    // Decodificar o token para obter os dados do convênio
    const tokenData = JSON.parse(atob(convenioToken.value));
    const codConvenio = tokenData.id;

    console.log(' LANÇAMENTOS - Dados do token:', {
      cod_convenio: codConvenio,
      usuario: tokenData.user,
      timestamp: new Date(tokenData.timestamp).toISOString()
    });

    // Detectar dispositivo móvel para logs
    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    // Criar parâmetros para a API PHP
    const params = new URLSearchParams();
    params.append('cod_convenio', codConvenio.toString());

    console.log(' LANÇAMENTOS - Enviando para API PHP:', {
      url: 'https://sas.makecard.com.br/listar_lancamentos_convenio_app.php',
      cod_convenio: codConvenio
    });

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

    console.log('📤 LANÇAMENTOS - Resposta API PHP:', {
      success: response.data.success,
      quantidade_lancamentos: response.data.lancamentos ? response.data.lancamentos.length : 0,
      primeiros_dados: response.data.lancamentos ? response.data.lancamentos.slice(0, 2) : []
    });

    // Log específico das parcelas para debug
    if (response.data.lancamentos && response.data.lancamentos.length > 0) {
      response.data.lancamentos.slice(0, 3).forEach((lancamento: any, index: number) => {
        console.log(`🔍 API PARCELA ${index + 1}:`, {
          id: lancamento.id,
          parcela_raw: lancamento.parcela,
          parcela_type: typeof lancamento.parcela,
          parcela_length: String(lancamento.parcela).length
        });
      });
    }

    if (response.data.success) {
      // Validação adicional: verificar se os lançamentos pertencem ao convênio correto
      const lancamentos = response.data.lancamentos || [];
      
      if (lancamentos.length > 0) {
        console.log(' LANÇAMENTOS - Validando consistência dos dados...');
        console.log(' LANÇAMENTOS - Convênio esperado:', codConvenio);
        console.log(' LANÇAMENTOS - Total de lançamentos recebidos:', lancamentos.length);
        
        // Log dos primeiros lançamentos para debug
        lancamentos.slice(0, 3).forEach((lancamento: any, index: number) => {
          console.log(`🔍 LANÇAMENTOS - Lançamento ${index + 1}:`, {
            id: lancamento.id,
            associado: lancamento.associado,
            valor: lancamento.valor,
            mes: lancamento.mes,
            data: lancamento.data,
            empregador: lancamento.empregador,
            nome_empregador: lancamento.nome_empregador,
            cpf_associado: lancamento.cpf_associado,
            parcela: lancamento.parcela
          });
        });
      }

      return NextResponse.json({
        success: true,
        data: response.data.lancamentos,
        debug_info: {
          cod_convenio_usado: codConvenio,
          usuario_token: tokenData.user,
          quantidade_lancamentos: lancamentos.length,
          is_mobile: isMobile
        }
      });
    } else {
      console.log(' LANÇAMENTOS - API PHP retornou erro:', response.data.message);
      return NextResponse.json({
        success: false,
        message: response.data.message || 'Erro ao buscar lançamentos'
      }, { status: 400 });
    }
  } catch (error) {
    console.error(' LANÇAMENTOS - Erro geral:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao buscar lançamentos' },
      { status: 500 }
    );
  }
}