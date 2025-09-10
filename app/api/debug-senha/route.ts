import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.log('🧪 DEBUG - Erro no parsing JSON:', parseError);
      return NextResponse.json({
        success: false,
        error: 'Erro no parsing JSON: ' + (parseError instanceof Error ? parseError.message : String(parseError))
      });
    }
    
    const { matricula, senha, id_associado, empregador } = body;
    
    console.log('🧪 DEBUG - Parâmetros recebidos:', { matricula, senha: '***', id_associado, empregador });
    
    const formData = new URLSearchParams();
    formData.append('matricula', matricula || '023995');
    formData.append('pass', senha || 'teste');
    formData.append('id_associado', (id_associado || 1).toString());
    formData.append('empregador', (empregador || 1).toString());
    
    console.log('🧪 DEBUG - Enviando para PHP:', formData.toString());
    
    const response = await axios.post(
      'https://sas.makecard.com.br/consulta_pass_assoc.php',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000,
        validateStatus: () => true
      }
    );
    
    console.log('🧪 DEBUG - Status:', response.status);
    console.log('🧪 DEBUG - Raw Data:', response.data);
    console.log('🧪 DEBUG - Data Type:', typeof response.data);
    
    let parsedData = null;
    if (response.data) {
      try {
        parsedData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        console.log('🧪 DEBUG - Parsed Data:', parsedData);
      } catch (e) {
        console.log('🧪 DEBUG - Parse Error:', e);
      }
    }
    
    return NextResponse.json({
      success: true,
      debug: {
        status: response.status,
        rawData: response.data,
        parsedData,
        dataType: typeof response.data
      }
    });
    
  } catch (error) {
    console.error('🧪 DEBUG - Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
