import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.log('🧪 DEBUG HISTÓRICO - Erro no parsing JSON:', parseError);
      return NextResponse.json({
        success: false,
        error: 'Erro no parsing JSON: ' + (parseError instanceof Error ? parseError.message : String(parseError))
      });
    }
    
    const { matricula, empregador, id_associado, divisao } = body;
    
    console.log('🧪 DEBUG HISTÓRICO - Parâmetros recebidos do frontend:', { 
      matricula, 
      empregador, 
      id_associado, 
      divisao,
      body_completo: body
    });
    
    // Preparar FormData exatamente como no código original
    const formData = new FormData();
    formData.append('matricula', matricula || '');
    formData.append('empregador', (empregador || '').toString());
    formData.append('id_associado', (id_associado || '').toString());
    formData.append('divisao', (divisao || '').toString());
    
    console.log('🧪 DEBUG HISTÓRICO - FormData preparado:');
    console.log('  - matricula:', formData.get('matricula'));
    console.log('  - empregador:', formData.get('empregador'));
    console.log('  - id_associado:', formData.get('id_associado'));
    console.log('  - divisao:', formData.get('divisao'));
    
    // Log de todos os campos do FormData
    const formDataEntries = Array.from(formData.entries());
    console.log('🧪 DEBUG HISTÓRICO - Todos os campos FormData:', formDataEntries);
    
    console.log('🧪 DEBUG HISTÓRICO - Enviando para PHP: https://sas.makecard.com.br/historico_antecipacao_app_get.php');
    
    const response = await axios.post(
      'https://sas.makecard.com.br/historico_antecipacao_app_get.php',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'User-Agent': 'SasApp/1.0',
          'Accept': 'application/json, text/plain, */*',
        },
        timeout: 30000,
        validateStatus: function (status) {
          // Aceitar qualquer status para capturar detalhes do erro 403
          return status >= 200 && status < 600;
        }
      }
    );
    
    console.log('🧪 DEBUG HISTÓRICO - Resposta PHP Status:', response.status);
    console.log('🧪 DEBUG HISTÓRICO - Resposta PHP Headers:', response.headers);
    console.log('🧪 DEBUG HISTÓRICO - Resposta PHP Data (tipo):', typeof response.data);
    console.log('🧪 DEBUG HISTÓRICO - Resposta PHP Data (tamanho):', JSON.stringify(response.data).length);
    console.log('🧪 DEBUG HISTÓRICO - Resposta PHP Data (completa):', response.data);
    
    // Analisar estrutura da resposta
    if (Array.isArray(response.data)) {
      console.log('🧪 DEBUG HISTÓRICO - Resposta é array com', response.data.length, 'itens');
      if (response.data.length > 0) {
        console.log('🧪 DEBUG HISTÓRICO - Primeiro item do array:', response.data[0]);
        console.log('🧪 DEBUG HISTÓRICO - Campos do primeiro item:', Object.keys(response.data[0]));
      }
    } else if (typeof response.data === 'object' && response.data !== null) {
      console.log('🧪 DEBUG HISTÓRICO - Resposta é objeto com campos:', Object.keys(response.data));
    }
    
    // Se for erro 403, retornar detalhes específicos
    if (response.status === 403) {
      console.log('🚨 DEBUG HISTÓRICO - ERRO 403 DETECTADO!');
      console.log('🚨 DEBUG HISTÓRICO - Mensagem de erro:', response.data);
      
      return NextResponse.json({
        success: false,
        error: 'Erro 403 - Acesso negado pela API PHP',
        debug_info: {
          parametros_enviados: {
            matricula,
            empregador,
            id_associado,
            divisao
          },
          formdata_enviado: formDataEntries,
          erro_403: {
            status: response.status,
            headers: response.headers,
            data_type: typeof response.data,
            data_size: response.data ? JSON.stringify(response.data).length : 0,
            mensagem_erro: response.data,
            possivel_causa: 'API PHP pode estar bloqueando requisições ou exigindo autenticação específica'
          }
        }
      }, { status: 403 });
    }
    
    return NextResponse.json({
      success: true,
      debug_info: {
        parametros_enviados: {
          matricula,
          empregador,
          id_associado,
          divisao
        },
        formdata_enviado: formDataEntries,
        resposta_php: {
          status: response.status,
          headers: response.headers,
          data_type: typeof response.data,
          data_size: JSON.stringify(response.data).length,
          data: response.data
        }
      },
      data: response.data
    });
    
  } catch (error) {
    console.error('🧪 DEBUG HISTÓRICO - Erro na requisição:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('🧪 DEBUG HISTÓRICO - Erro Axios:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
      
      return NextResponse.json({
        success: false,
        error: 'Erro na API PHP',
        debug_info: {
          axios_error: {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
          }
        }
      }, { status: error.response?.status || 500 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno: ' + (error instanceof Error ? error.message : String(error)),
      debug_info: {
        error_type: typeof error,
        error_message: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
}
