import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('💾 API gravar-venda iniciada');
    
    // Processar dados da requisição
    const body = await request.json();
    console.log('📄 Dados recebidos para gravação:', body);
    
    // Validar campos obrigatórios
    const camposObrigatorios = ['valor_pedido', 'cod_convenio', 'matricula', 'qtde_parcelas', 'mes_corrente'];
    const camposFaltando = camposObrigatorios.filter(campo => !body[campo]);
    
    if (camposFaltando.length > 0) {
      console.error('❌ Campos obrigatórios faltando:', camposFaltando);
      return NextResponse.json(
        { 
          success: false,
          situacao: 0,
          error: `Campos obrigatórios faltando: ${camposFaltando.join(', ')}` 
        },
        { status: 400 }
      );
    }
    
    console.log('💾 Preparando dados para grava_venda_app.php');
    
    // Preparar dados para enviar ao backend PHP
    const formData = new URLSearchParams();
    
    // Adicionar todos os campos recebidos
    Object.keys(body).forEach(key => {
      if (body[key] !== undefined && body[key] !== null) {
        formData.append(key, String(body[key]));
      }
    });
    
    console.log('📤 Enviando dados para grava_venda_app.php:', formData.toString());
    
    // Chamar API PHP externa
    const response = await axios.post(
      'https://sas.makecard.com.br/grava_venda_app.php',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        timeout: 30000, // 30 segundos de timeout para gravação
      }
    );
    
    console.log('📄 Resposta da API PHP:', response.data);
    
    // Verificar se a resposta contém HTML (erro PHP)
    const responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    
    if (responseText.includes('<br />') || responseText.includes('<b>Warning</b>') || responseText.includes('<b>Error</b>')) {
      console.error('❌ Erro PHP detectado na resposta:', responseText);
      
      // Extrair mensagem de erro mais legível
      let errorMessage = 'Erro no servidor';
      
      if (responseText.includes('Undefined variable $parcela')) {
        errorMessage = 'Erro interno: Parâmetro de parcela não definido no servidor';
      } else if (responseText.includes('id_divisao')) {
        errorMessage = 'Erro interno: Campo divisão não encontrado no banco de dados';
      } else if (responseText.includes('SQLSTATE')) {
        errorMessage = 'Erro no banco de dados. Contate o suporte técnico.';
      }
      
      return NextResponse.json({
        success: false,
        situacao: 0,
        error: errorMessage
      }, { status: 500 });
    }
    
    // Verificar se a resposta é válida
    console.log('🔍 Analisando resposta da API PHP:', {
      data: response.data,
      type: typeof response.data,
      situacao: response.data?.situacao,
      registrolan: response.data?.registrolan
    });
    
    if (response.data && response.data.situacao === 1) {
      console.log('✅ Venda gravada com sucesso');
      
      return NextResponse.json({
        success: true,
        situacao: 1,
        data: response.data,
        registrolan: response.data.registrolan
      });
    } else if (response.data && response.data.situacao === 2) {
      console.warn('⚠️ Senha incorreta');
      
      return NextResponse.json({
        success: false,
        situacao: 2,
        error: 'Senha incorreta'
      }, { status: 401 });
    } else if (response.data && response.data.registrolan) {
      // Se tem registrolan mas situacao não é 1, assumir sucesso
      console.log('✅ Venda gravada com sucesso (detectado via registrolan)');
      
      return NextResponse.json({
        success: true,
        situacao: 1,
        data: response.data,
        registrolan: response.data.registrolan
      });
    } else {
      console.warn('⚠️ Resposta inesperada da API PHP:', response.data);
      
      // Verificar se foi gravado mesmo com resposta estranha
      if (response.status === 200 && response.data) {
        console.log('⚠️ Status 200 mas estrutura inesperada - assumindo sucesso');
        
        return NextResponse.json({
          success: true,
          situacao: 1,
          data: response.data,
          registrolan: response.data.registrolan || null
        });
      }
      
      return NextResponse.json({
        success: false,
        situacao: 0,
        error: response.data?.erro || response.data?.message || 'Erro ao gravar venda'
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ Erro na API gravar-venda:', error);
    
    let errorMessage = 'Erro ao processar a requisição';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Timeout na conexão com o servidor';
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
        errorMessage = 'Sem resposta do servidor';
        statusCode = 503;
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        situacao: 0,
        error: errorMessage, 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: statusCode }
    );
  }
}
