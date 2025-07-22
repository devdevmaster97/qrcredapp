import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id_agendamento, cod_associado, id_empregador } = body;

    // Log detalhado para debug
    const requestId = Math.random().toString(36).substr(2, 9);
    console.log(`🗑️ [${requestId}] API Cancelar Agendamento chamada:`, {
      id_agendamento,
      cod_associado,
      id_empregador,
      timestamp: new Date().toISOString()
    });

    // Validar dados obrigatórios
    if (!id_agendamento || !cod_associado || !id_empregador) {
      console.log(`❌ [${requestId}] Dados obrigatórios não fornecidos`);
      return NextResponse.json(
        { success: false, message: 'ID do agendamento, código do associado e ID do empregador são obrigatórios' },
        { status: 400 }
      );
    }

    // Preparar dados para enviar ao backend
    const params = new URLSearchParams();
    params.append('id_agendamento', id_agendamento.toString());
    params.append('cod_associado', cod_associado.toString());
    params.append('id_empregador', id_empregador.toString());

    // Log dos parâmetros enviados
    console.log(`📤 [${requestId}] Enviando para cancelar_agendamento_app.php:`, {
      id_agendamento: params.get('id_agendamento'),
      cod_associado: params.get('cod_associado'),
      id_empregador: params.get('id_empregador')
    });

    // Fazer requisição para o backend PHP
    const response = await axios.post(
      'https://sas.makecard.com.br/cancelar_agendamento_app.php',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000
      }
    );

    // Log da resposta completa do backend
    console.log(`📥 [${requestId}] Resposta do backend:`, {
      status: response.status,
      data: response.data
    });

    if (response.data && response.data.success) {
      console.log(`✅ [${requestId}] Agendamento cancelado com sucesso:`, {
        id: response.data.data?.id,
        message: response.data.message
      });
      
      return NextResponse.json({
        success: true,
        message: response.data.message || 'Agendamento cancelado com sucesso!',
        data: response.data.data,
        requestId
      });
    } else {
      console.log(`❌ [${requestId}] Erro no backend:`, response.data?.message);
      return NextResponse.json({
        success: false,
        message: response.data?.message || 'Erro ao cancelar agendamento',
        requestId
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Erro ao cancelar agendamento:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('❌ Detalhes do erro Axios:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
} 