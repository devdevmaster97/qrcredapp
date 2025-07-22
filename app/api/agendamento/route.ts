import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📥 BODY RECEBIDO NA API:', JSON.stringify(body, null, 2));
    
    const { cod_associado, id_empregador, cod_convenio, profissional, especialidade, convenio_nome } = body;
    
    console.log('📥 CAMPOS EXTRAÍDOS:', {
      cod_associado, 
      id_empregador, 
      cod_convenio, 
      profissional, 
      especialidade, 
      convenio_nome
    });

    // Log detalhado para rastrear chamadas à API
    const requestId = Math.random().toString(36).substr(2, 9);
    console.log(`📋 [${requestId}] API Agendamento chamada:`, {
      cod_associado,
      id_empregador,
      cod_convenio,
      profissional,
      especialidade,
      convenio_nome,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent')?.slice(0, 50)
    });

    // Log adicional para verificar tipos e valores exatos
    console.log(`📋 [${requestId}] Verificação de tipos:`, {
      profissional_type: typeof profissional,
      profissional_value: `"${profissional}"`,
      profissional_length: profissional?.length,
      especialidade_type: typeof especialidade,
      especialidade_value: `"${especialidade}"`,
      especialidade_length: especialidade?.length,
      convenio_nome_type: typeof convenio_nome,
      convenio_nome_value: `"${convenio_nome}"`,
      convenio_nome_length: convenio_nome?.length,
      cod_convenio_value: `"${cod_convenio}"`
    });

    // Validar dados obrigatórios
    if (!cod_associado || !id_empregador) {
      console.log(`❌ [${requestId}] Dados obrigatórios não fornecidos`);
      return NextResponse.json(
        { success: false, message: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      );
    }

    // Garantir que os novos campos não sejam undefined ou null
    const profissionalLimpo = (profissional && profissional.toString().trim() !== '') ? profissional.toString().trim() : '';
    const especialidadeLimpa = (especialidade && especialidade.toString().trim() !== '') ? especialidade.toString().trim() : '';
    const convenioNomeLimpo = (convenio_nome && convenio_nome.toString().trim() !== '') ? convenio_nome.toString().trim() : '';

    // Log dos campos limpos
    console.log(`📋 [${requestId}] Campos limpos:`, {
      profissionalLimpo,
      especialidadeLimpa,
      convenioNomeLimpo
    });

    // Preparar dados para enviar ao backend - IMPORTANTE: usar nomes exatos esperados pelo PHP
    const params = new URLSearchParams();
    params.append('cod_associado', cod_associado.toString());
    params.append('id_empregador', id_empregador.toString());
    params.append('cod_convenio', cod_convenio?.toString() || '1');
    params.append('data_solicitacao', new Date().toISOString().slice(0, 19).replace('T', ' '));
    params.append('status', '1'); // 1 - Pendente
    
    // NOVOS CAMPOS - garantir que sejam sempre strings válidas
    params.append('profissional', profissionalLimpo);
    params.append('especialidade', especialidadeLimpa);
    params.append('convenio_nome', convenioNomeLimpo);

    // Log completo dos parâmetros que serão enviados
    console.log(`📤 [${requestId}] PARÂMETROS PARA BACKEND PHP:`, {
      cod_associado: params.get('cod_associado'),
      id_empregador: params.get('id_empregador'),
      cod_convenio: params.get('cod_convenio'),
      data_solicitacao: params.get('data_solicitacao'),
      status: params.get('status'),
      profissional: params.get('profissional'),
      especialidade: params.get('especialidade'),
      convenio_nome: params.get('convenio_nome')
    });
    
    console.log(`📤 [${requestId}] STRING COMPLETA ENVIADA:`, params.toString());
    
    // Verificar se os campos não estão vazios
    const camposVazios = [];
    const profissionalParam = params.get('profissional');
    const especialidadeParam = params.get('especialidade');
    const convenioNomeParam = params.get('convenio_nome');
    
    if (!profissionalParam || profissionalParam.trim() === '') camposVazios.push('profissional');
    if (!especialidadeParam || especialidadeParam.trim() === '') camposVazios.push('especialidade');
    if (!convenioNomeParam || convenioNomeParam.trim() === '') camposVazios.push('convenio_nome');queb
    
    if (camposVazios.length > 0) {
      console.log(`⚠️ [${requestId}] ATENÇÃO: Campos vazios detectados:`, camposVazios);
    }

    // Fazer requisição para o backend PHP
    const response = await axios.post(
      'https://sas.makecard.com.br/grava_agendamento_app.php',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000 // Aumentar timeout para 15 segundos
      }
    );

    // Log da resposta completa do backend
    console.log(`📥 [${requestId}] Resposta completa do backend:`, {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers
    });

    // Log específico para debug de gravação
    console.log(`🔍 [${requestId}] ANÁLISE DA RESPOSTA DO PHP:`, {
      success: response.data?.success,
      message: response.data?.message,
      id_gerado: response.data?.data?.id,
      duplicate_prevented: response.data?.data?.duplicate_prevented,
      new_record: response.data?.data?.new_record,
      dados_retornados: response.data?.data
    });

    if (response.data && response.data.success) {
      const isDuplicatePrevented = response.data.data?.duplicate_prevented;
      console.log(`✅ [${requestId}] Agendamento processado com sucesso:`, {
        id: response.data.data?.id,
        new_record: response.data.data?.new_record,
        duplicate_prevented: isDuplicatePrevented,
        check_level: response.data.data?.check_level,
        profissional_gravado: response.data.data?.profissional,
        especialidade_gravada: response.data.data?.especialidade,
        convenio_nome_gravado: response.data.data?.convenio_nome
      });
      
      return NextResponse.json({
        success: true,
        message: isDuplicatePrevented 
          ? 'Agendamento já existia (duplicação evitada)' 
          : 'Agendamento solicitado com sucesso!',
        data: response.data.data,
        requestId,
        // Retornar os dados enviados para confirmação
        dadosEnviados: {
          profissional: profissionalLimpo,
          especialidade: especialidadeLimpa,
          convenio_nome: convenioNomeLimpo
        }
      });
    } else {
      console.log(`❌ [${requestId}] Erro no backend - resposta inválida:`, {
        responseData: response.data,
        status: response.status
      });
      return NextResponse.json({
        success: false,
        message: response.data?.message || 'Erro ao processar agendamento no backend',
        requestId,
        debugInfo: {
          backendResponse: response.data,
          httpStatus: response.status
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Erro ao processar agendamento:', error);
    
    // Log detalhado do erro
    if (axios.isAxiosError(error)) {
      console.error('❌ Detalhes do erro Axios:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        }
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