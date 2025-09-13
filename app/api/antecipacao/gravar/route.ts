import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📥 API Antecipação - Dados recebidos:', body);
    
    // Validar campos obrigatórios
    const camposObrigatorios = ['matricula', 'pass', 'empregador', 'valor_pedido', 'taxa', 'valor_descontar', 'mes_corrente', 'chave_pix'];
    
    for (const campo of camposObrigatorios) {
      if (!body[campo]) {
        console.log(`❌ Campo obrigatório ausente: ${campo}`);
        return NextResponse.json({
          success: false,
          error: `Campo obrigatório ausente: ${campo}`
        }, { status: 400 });
      }
    }
    
    // Preparar dados para envio ao PHP
    const formData = new URLSearchParams();
    formData.append('matricula', body.matricula || '');
    formData.append('pass', body.pass);
    formData.append('empregador', (body.empregador || 0).toString());
    formData.append('valor_pedido', body.valor_pedido);
    formData.append('taxa', body.taxa);
    formData.append('valor_descontar', body.valor_descontar);
    formData.append('mes_corrente', body.mes_corrente || '');
    formData.append('chave_pix', body.chave_pix);
    formData.append('id', (body.id || 0).toString());
    formData.append('id_divisao', (body.id_divisao || 0).toString());
    
    console.log('🌐 Enviando para PHP grava_antecipacao_app.php:', Object.fromEntries(formData));
    
    // Fazer chamada para o PHP
    const response = await axios.post(
      'https://sas.makecard.com.br/grava_antecipacao_app.php',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        timeout: 15000,
        validateStatus: () => true // Não rejeitar por status HTTP
      }
    );
    
    console.log('📥 Resposta do PHP:', {
      status: response.status,
      data: response.data
    });
    
    // Verificar se houve erro
    const temErro = response.status >= 400 ||
                   response.data.success === false || 
                   (response.data.message && (
                     response.data.message.toLowerCase().includes("erro") ||
                     response.data.message.toLowerCase().includes("senha") ||
                     response.data.message.toLowerCase().includes("incorreta") ||
                     response.data.message.toLowerCase().includes("inválida") ||
                     response.data.message.toLowerCase().includes("falhou") ||
                     response.data.message.toLowerCase().includes("negado")
                   ));
    
    if (temErro) {
      const mensagem = response.data.message || 'Erro ao processar solicitação';
      console.log('❌ Erro detectado:', mensagem);
      
      return NextResponse.json({
        success: false,
        error: mensagem,
        data: response.data
      }, { 
        status: response.status >= 400 ? response.status : 400,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
    
    // Sucesso
    console.log('✅ Antecipação gravada com sucesso');
    return NextResponse.json({
      success: true,
      data: response.data,
      message: response.data.message || 'Solicitação processada com sucesso'
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('💥 Erro na API de antecipação:', error);
    
    let errorMessage = 'Erro interno do servidor';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Timeout na conexão com o servidor';
        statusCode = 408;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        statusCode = error.response.status || 500;
      } else if (error.message) {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}
