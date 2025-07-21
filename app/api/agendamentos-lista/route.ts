import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cod_associado, id_empregador } = body;

    // Log detalhado para debug
    const requestId = Math.random().toString(36).substr(2, 9);
    console.log(`📋 [${requestId}] API Agendamentos-Lista chamada:`, {
      cod_associado,
      id_empregador,
      timestamp: new Date().toISOString()
    });

    // Validar dados obrigatórios
    if (!cod_associado || !id_empregador) {
      console.log(`❌ [${requestId}] Dados obrigatórios não fornecidos`);
      return NextResponse.json(
        { success: false, message: 'Código do associado e ID do empregador são obrigatórios' },
        { status: 400 }
      );
    }

    // Preparar dados para enviar ao backend
    const params = new URLSearchParams();
    params.append('cod_associado', cod_associado.toString());
    params.append('id_empregador', id_empregador.toString());

    // Log dos parâmetros enviados
    console.log(`📤 [${requestId}] Enviando para lista_agendamentos_app.php:`, {
      cod_associado: params.get('cod_associado'),
      id_empregador: params.get('id_empregador')
    });

    // Fazer requisição para o backend PHP
    const response = await axios.post(
      'https://sas.makecard.com.br/lista_agendamentos_app.php',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000 // Aumentar timeout
      }
    );

    // Log detalhado da resposta do backend
    console.log(`📥 [${requestId}] Resposta do lista_agendamentos_app.php:`, {
      status: response.status,
      dataType: typeof response.data,
      dataLength: Array.isArray(response.data?.data) ? response.data.data.length : 'N/A',
      rawData: response.data
    });

    // Verificar campos nos agendamentos retornados
    if (response.data?.success && Array.isArray(response.data.data)) {
      const agendamentos = response.data.data;
      
      // Log dos campos presentes em cada agendamento
      agendamentos.forEach((agendamento: any, index: number) => {
        console.log(`📋 [${requestId}] Agendamento ${index + 1}:`, {
          id: agendamento.id,
          cod_associado: agendamento.cod_associado,
          data_solicitacao: agendamento.data_solicitacao,
          status: agendamento.status,
          // NOVOS CAMPOS - verificar se estão presentes
          profissional: agendamento.profissional || 'NÃO INFORMADO',
          especialidade: agendamento.especialidade || 'NÃO INFORMADO',
          convenio_nome: agendamento.convenio_nome || 'NÃO INFORMADO',
          // Todos os campos para debug
          allFields: Object.keys(agendamento)
        });
      });

      console.log(`✅ [${requestId}] ${agendamentos.length} agendamentos encontrados`);
      
      return NextResponse.json({
        success: true,
        data: agendamentos,
        requestId,
        totalAgendamentos: agendamentos.length
      });
    } else if (response.data?.success && (!response.data.data || response.data.data.length === 0)) {
      console.log(`ℹ️ [${requestId}] Nenhum agendamento encontrado`);
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Nenhum agendamento encontrado',
        requestId
      });
    } else {
      console.log(`❌ [${requestId}] Resposta inválida do backend:`, {
        success: response.data?.success,
        hasData: !!response.data?.data,
        dataType: typeof response.data?.data,
        fullResponse: response.data
      });
      
      return NextResponse.json({
        success: false,
        message: response.data?.message || 'Erro ao buscar agendamentos',
        requestId,
        debugInfo: {
          backendResponse: response.data,
          httpStatus: response.status
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Erro ao buscar agendamentos:', error);
    
    // Log detalhado do erro
    if (axios.isAxiosError(error)) {
      console.error('❌ Detalhes do erro Axios:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method
        }
      });
    }
    
    // Por enquanto, retornar uma lista vazia em caso de erro
    // Isso permite que a interface funcione mesmo sem o backend implementado
    console.log('⚠️ Retornando lista vazia devido ao erro');
    return NextResponse.json({
      success: true,
      data: [],
      message: 'Erro temporário ao buscar agendamentos',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
} 