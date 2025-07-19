import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cod_associado, id_empregador, cod_convenio, profissional, especialidade, convenio_nome } = body;

    // Log para rastrear chamadas à API
    console.log('📋 API Agendamento chamada:', {
      cod_associado,
      profissional,
      especialidade,
      timestamp: new Date().toISOString()
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
      console.log('✅ Agendamento salvo com sucesso:', response.data.data?.id);
      return NextResponse.json({
        success: true,
        message: 'Agendamento solicitado com sucesso!',
        data: response.data.data
      });
    } else {
      console.log('❌ Erro no backend:', response.data?.message);
      return NextResponse.json({
        success: false,
        message: response.data?.message || 'Erro ao processar agendamento'
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