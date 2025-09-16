import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Iniciando teste de debug da API de histórico...');
    
    // Dados de teste (usando dados reais do sistema)
    const testData = {
      matricula: '023995',
      empregador: '6',
      id_associado: '174',
      divisao: '1'
    };
    
    console.log('📋 Dados de teste:', testData);
    
    // Teste 1: POST com FormData
    console.log('1️⃣ Testando POST com FormData...');
    try {
      const formData = new FormData();
      formData.append('matricula', testData.matricula);
      formData.append('empregador', testData.empregador);
      formData.append('id_associado', testData.id_associado);
      formData.append('divisao', testData.divisao);
      
      const postResponse = await axios.post(
        'https://sas.makecard.com.br/historico_antecipacao_app.php',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 15000,
        }
      );
      
      console.log('✅ POST bem-sucedido:', {
        status: postResponse.status,
        data: postResponse.data,
        dataType: typeof postResponse.data,
        isArray: Array.isArray(postResponse.data)
      });
      
      return NextResponse.json({
        success: true,
        method: 'POST',
        status: postResponse.status,
        data: postResponse.data,
        dataType: typeof postResponse.data,
        isArray: Array.isArray(postResponse.data),
        recordCount: Array.isArray(postResponse.data) ? postResponse.data.length : 'N/A'
      });
      
    } catch (postError) {
      console.log('❌ POST falhou:', postError);
      
      if (axios.isAxiosError(postError)) {
        console.log('Detalhes do erro POST:', {
          status: postError.response?.status,
          statusText: postError.response?.statusText,
          data: postError.response?.data,
          message: postError.message
        });
        
        // Teste 2: GET como fallback
        console.log('2️⃣ Tentando GET como fallback...');
        try {
          const getFormData = new FormData();
          getFormData.append('matricula', testData.matricula);
          getFormData.append('empregador', testData.empregador);
          getFormData.append('id_associado', testData.id_associado);
          getFormData.append('divisao', testData.divisao);
          
          const getResponse = await axios.request({
            method: 'GET',
            url: 'https://sas.makecard.com.br/historico_antecipacao_app.php',
            data: getFormData,
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: 15000,
          });
          
          console.log('✅ GET bem-sucedido:', {
            status: getResponse.status,
            data: getResponse.data,
            dataType: typeof getResponse.data,
            isArray: Array.isArray(getResponse.data)
          });
          
          return NextResponse.json({
            success: true,
            method: 'GET',
            status: getResponse.status,
            data: getResponse.data,
            dataType: typeof getResponse.data,
            isArray: Array.isArray(getResponse.data),
            recordCount: Array.isArray(getResponse.data) ? getResponse.data.length : 'N/A',
            postError: {
              status: postError.response?.status,
              statusText: postError.response?.statusText,
              message: postError.message
            }
          });
          
        } catch (getError) {
          console.log('❌ GET também falhou:', getError);
          
          return NextResponse.json({
            success: false,
            errors: {
              post: {
                status: postError.response?.status,
                statusText: postError.response?.statusText,
                data: postError.response?.data,
                message: postError.message
              },
              get: {
                status: axios.isAxiosError(getError) ? getError.response?.status : 'N/A',
                statusText: axios.isAxiosError(getError) ? getError.response?.statusText : 'N/A',
                data: axios.isAxiosError(getError) ? getError.response?.data : 'N/A',
                message: getError instanceof Error ? getError.message : 'Erro desconhecido'
              }
            }
          }, { status: 500 });
        }
      }
      
      return NextResponse.json({
        success: false,
        error: postError instanceof Error ? postError.message : 'Erro desconhecido'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Erro geral no teste de debug:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
