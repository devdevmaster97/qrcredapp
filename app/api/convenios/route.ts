import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 CHAMANDO API convenio_categorias_app.php...');
    
    // Enviar a requisição para o backend
    const response = await axios.post(
      'https://sas.makecard.com.br/convenio_categorias_app.php',
      {},
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );

    console.log('📥 RESPOSTA DO BACKEND PHP:', {
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      length: Array.isArray(response.data) ? response.data.length : 'N/A',
      firstItem: Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : null
    });

    // Verificar e retornar a resposta
    if (Array.isArray(response.data)) {
      // Log detalhado de alguns itens para debug
      if (response.data.length > 0) {
        console.log('📋 PRIMEIRO ITEM DA LISTA:', JSON.stringify(response.data[0], null, 2));
        console.log('📋 CAMPOS DISPONÍVEIS NO PRIMEIRO ITEM:', Object.keys(response.data[0]));
        
        if (response.data.length > 1) {
          console.log('📋 SEGUNDO ITEM DA LISTA:', JSON.stringify(response.data[1], null, 2));
        }
        
        // Verificar se têm os campos que precisamos
        const primeiroItem = response.data[0];
        console.log('🔍 VERIFICAÇÃO DE CAMPOS NECESSÁRIOS:', {
          tem_profissional: 'profissional' in primeiroItem,
          tem_especialidade: 'especialidade' in primeiroItem,
          tem_convenio_nome: 'convenio_nome' in primeiroItem,
          tem_cod_convenio: 'cod_convenio' in primeiroItem,
          tem_id_convenio: 'id_convenio' in primeiroItem,
          tem_codigo_convenio: 'codigo_convenio' in primeiroItem
        });
      }
      
      return NextResponse.json(response.data);
    } else {
      console.log('❌ Formato de resposta inesperado:', response.data);
      return NextResponse.json({ error: 'Formato de resposta inesperado' }, { status: 500 });
    }
  } catch (error) {
    console.error('Erro na API de convênios:', error);
    
    let errorMessage = 'Erro ao processar a requisição';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Timeout na conexão com o servidor';
      } else if (error.response) {
        statusCode = error.response.status;
        errorMessage = `Erro ${statusCode} do servidor`;
        console.log('Dados do erro:', error.response.data);
      } else if (error.request) {
        errorMessage = 'Sem resposta do servidor';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: statusCode }
    );
  }
} 