import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cod_associado, id_empregador, cod_convenio, profissional, especialidade, convenio_nome } = body;

    // Log detalhado para rastrear chamadas à API
    const requestId = Math.random().toString(36).substr(2, 9);
    console.log(`📋 [${requestId}] API Agendamento chamada:`, {
      cod_associado,
      id_empregador,
      profissional,
      especialidade,
      convenio_nome,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent')?.slice(0, 50)
    });

    // Validar dados obrigatórios
    if (!cod_associado || !id_empregador) {
      return NextResponse.json(
        { success: false, message: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      );
    }

    // Preparar dados para enviar ao backend
    const params = new URLSearchParams();
    params.append('cod_associado', cod_associado);
    params.append('id_empregador', id_empregador.toString());
    params.append('cod_convenio', cod_convenio || '1');
    params.append('data_solicitacao', new Date().toISOString().slice(0, 19).replace('T', ' '));
    params.append('status', '1'); // 1 - Pendente
    params.append('profissional', profissional || '');
    params.append('especialidade', especialidade || '');
    params.append('convenio_nome', convenio_nome || '');

    // Fazer requisição para o backend PHP
    const response = await axios.post(
      'https://sas.makecard.com.br/grava_agendamento_app.php',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000
      }
    );

    if (response.data && response.data.success) {
      const isDuplicatePrevented = response.data.data?.duplicate_prevented;
      console.log(`✅ [${requestId}] Agendamento processado:`, {
        id: response.data.data?.id,
        new_record: response.data.data?.new_record,
        duplicate_prevented: isDuplicatePrevented,
        check_level: response.data.data?.check_level
      });
      
      return NextResponse.json({
        success: true,
        message: isDuplicatePrevented 
          ? 'Agendamento já existia (duplicação evitada)' 
          : 'Agendamento solicitado com sucesso!',
        data: response.data.data,
        requestId
      });
    } else {
      console.log(`❌ [${requestId}] Erro no backend:`, response.data?.message);
      return NextResponse.json({
        success: false,
        message: response.data?.message || 'Erro ao processar agendamento',
        requestId
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Erro ao processar agendamento:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 