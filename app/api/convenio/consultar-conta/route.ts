import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('📊 API consultar-conta iniciada');
    
    // Processar dados da requisição
    const body = await request.json();
    console.log('📄 Dados recebidos para consulta de conta:', body);
    
    // Validar campos obrigatórios
    const camposObrigatorios = ['matricula', 'empregador', 'mes', 'id'];
    const camposFaltando = camposObrigatorios.filter(campo => !body[campo]);
    
    if (camposFaltando.length > 0) {
      console.error('❌ Campos obrigatórios faltando:', camposFaltando);
      return NextResponse.json(
        { 
          success: false,
          error: `Campos obrigatórios faltando: ${camposFaltando.join(', ')}` 
        },
        { status: 400 }
      );
    }
    
    console.log('📤 Preparando dados para conta_app.php');
    
    // Preparar dados para enviar ao backend PHP
    const formData = new URLSearchParams();
    formData.append('matricula', body.matricula.toString());
    formData.append('empregador', body.empregador.toString());
    formData.append('mes', body.mes.toString());
    formData.append('id', body.id.toString());
    
    if (body.divisao) {
      formData.append('divisao', body.divisao.toString());
    }
    
    console.log('📤 Enviando dados para conta_app.php:', formData.toString());
    
    // Chamar API PHP externa
    const response = await axios.post(
      'https://sas.makecard.com.br/conta_app.php',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        timeout: 15000, // 15 segundos de timeout
        validateStatus: (status) => {
          console.log('📊 Status HTTP recebido da API PHP:', status);
          return status >= 200 && status < 600; // Aceitar todos os status para debug
        }
      }
    );
    
    console.log('📄 Resposta da API PHP:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });
    
    // Verificar status HTTP da resposta
    if (response.status >= 400) {
      console.error('❌ Erro HTTP da API PHP:', response.status, response.statusText);
      return NextResponse.json({
        success: false,
        error: `Erro ${response.status} da API externa`,
        debug: { status: response.status, statusText: response.statusText }
      }, { status: 502 }); // Bad Gateway
    }
    
    // Verificar se a resposta contém HTML (erro PHP)
    const responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    
    if (responseText.includes('<br />') || responseText.includes('<b>Warning</b>') || responseText.includes('<b>Error</b>')) {
      console.error('❌ Erro PHP detectado na resposta:', responseText);
      
      // Extrair mensagem de erro mais legível
      let errorMessage = 'Erro no servidor';
      
      if (responseText.includes('SQLSTATE')) {
        errorMessage = 'Erro no banco de dados. Contate o suporte técnico.';
      } else if (responseText.includes('Undefined')) {
        errorMessage = 'Erro interno: Parâmetro não definido no servidor';
      }
      
      return NextResponse.json({
        success: false,
        error: errorMessage
      }, { status: 500 });
    }
    
    // Processar resposta da API PHP
    let dadosLimpos;
    try {
      console.log('🔍 CONSULTA CONTA - Dados brutos recebidos:', response.data);
      
      let responseData = response.data;
      
      // Se a resposta for string, tentar fazer parse
      if (typeof responseData === 'string') {
        // Remover possíveis warnings/notices do PHP
        const jsonStart = responseData.indexOf('[');
        const jsonEnd = responseData.lastIndexOf(']');
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
          responseData = responseData.substring(jsonStart, jsonEnd + 1);
          console.log('🧹 CONSULTA CONTA - Dados após limpeza:', responseData);
        }
        
        dadosLimpos = JSON.parse(responseData);
      } else {
        dadosLimpos = responseData;
      }
      
      console.log('✅ CONSULTA CONTA - Parse realizado com sucesso:', dadosLimpos);
      
      // Verificar se é um array válido
      if (!Array.isArray(dadosLimpos)) {
        console.warn('⚠️ Resposta não é um array, convertendo:', dadosLimpos);
        dadosLimpos = dadosLimpos ? [dadosLimpos] : [];
      }
      
      // Retornar dados processados
      const resultado = {
        success: true,
        data: dadosLimpos
      };
      
      console.log('🎉 CONSULTA CONTA - Resposta final preparada:', resultado);
      
      return NextResponse.json(resultado, {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
    } catch (parseError) {
      console.error('❌ Erro no parse da resposta (consulta conta):', parseError);
      console.log('📄 Dados brutos recebidos (consulta conta):', response.data);
      return NextResponse.json({
        success: false,
        error: 'Erro no formato da resposta do servidor',
        debug: {
          erro: parseError instanceof Error ? parseError.message : String(parseError),
          dados_brutos: response.data
        }
      }, { status: 502 });
    }
    
  } catch (error) {
    console.error('❌ Erro na API consultar-conta:', error);
    
    let errorMessage = 'Erro ao processar a requisição';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Timeout na conexão com o servidor. Verifique sua conexão com a internet e tente novamente.';
        statusCode = 408;
      } else if (error.response) {
        statusCode = error.response.status;
        errorMessage = `Erro ${statusCode} do servidor`;
        console.log('Dados do erro:', error.response.data);
        
        // Se a resposta contém HTML, é um erro PHP
        const responseText = typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data);
        if (responseText.includes('<br />') || responseText.includes('Warning') || responseText.includes('Error')) {
          errorMessage = 'Erro interno do servidor. Contate o suporte técnico.';
        }
      } else if (error.request) {
        errorMessage = 'Sem resposta do servidor. Verifique sua conexão com a internet.';
        statusCode = 503;
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage, 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: statusCode }
    );
  }
}
