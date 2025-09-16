import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testando conectividade com o backend...');
    
    // Teste 1: Conectividade básica
    console.log('1️⃣ Testando conectividade básica...');
    try {
      const testResponse = await axios.get('https://sas.makecard.com.br/', { timeout: 5000 });
      console.log('✅ Servidor acessível - Status:', testResponse.status);
    } catch (testError) {
      console.log('❌ Servidor inacessível:', testError instanceof Error ? testError.message : 'Erro desconhecido');
      return NextResponse.json({ 
        error: 'Servidor inacessível',
        details: testError instanceof Error ? testError.message : 'Erro desconhecido'
      }, { status: 503 });
    }
    
    // Teste 2: Acesso ao arquivo PHP
    console.log('2️⃣ Testando acesso ao arquivo PHP...');
    try {
      const phpResponse = await axios.get('https://sas.makecard.com.br/historico_antecipacao_app.php', { timeout: 5000 });
      console.log('✅ Arquivo PHP acessível - Status:', phpResponse.status);
    } catch (phpError) {
      console.log('❌ Arquivo PHP inacessível:', phpError instanceof Error ? phpError.message : 'Erro desconhecido');
      if (axios.isAxiosError(phpError) && phpError.response) {
        console.log('   - Status:', phpError.response.status);
        console.log('   - StatusText:', phpError.response.statusText);
        console.log('   - Data:', phpError.response.data);
      }
    }
    
    // Teste 3: Requisição POST com parâmetros de teste
    console.log('3️⃣ Testando requisição POST com parâmetros...');
    const formData = new FormData();
    formData.append('matricula', '123456');
    formData.append('empregador', '1');
    
    try {
      const postResponse = await axios.post(
        'https://sas.makecard.com.br/historico_antecipacao_app.php',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 10000,
        }
      );
      
      console.log('✅ POST bem-sucedido - Status:', postResponse.status);
      console.log('   - Data:', postResponse.data);
      
      return NextResponse.json({
        success: true,
        tests: {
          basicConnectivity: 'OK',
          phpFileAccess: 'OK',
          postRequest: 'OK',
          response: postResponse.data
        }
      });
      
    } catch (postError) {
      console.log('❌ POST falhou:', postError instanceof Error ? postError.message : 'Erro desconhecido');
      
      if (axios.isAxiosError(postError) && postError.response) {
        console.log('   - Status:', postError.response.status);
        console.log('   - StatusText:', postError.response.statusText);
        console.log('   - Data:', postError.response.data);
        
        return NextResponse.json({
          success: false,
          tests: {
            basicConnectivity: 'OK',
            phpFileAccess: 'OK',
            postRequest: 'FAILED',
            error: {
              status: postError.response.status,
              statusText: postError.response.statusText,
              data: postError.response.data
            }
          }
        });
      }
      
      return NextResponse.json({
        success: false,
        tests: {
          basicConnectivity: 'OK',
          phpFileAccess: 'OK',
          postRequest: 'FAILED',
          error: postError instanceof Error ? postError.message : 'Erro desconhecido'
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
