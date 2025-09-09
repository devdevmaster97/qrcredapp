import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  console.log('🔥 API /api/conta INICIADA - Recebendo requisição');
  console.log('🔥 URL da requisição:', request.url);
  console.log('🔥 Method:', request.method);
  console.log('🔥 Headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    let matricula: string;
    let empregador: string | number;
    let mes: string;
    let divisao: string | number;
    let id: string | number;
    
    // Verificar o Content-Type e processar a request apropriadamente
    const contentType = request.headers.get('Content-Type') || '';
    console.log('🔥 Content-Type:', contentType);
    
    if (contentType.includes('multipart/form-data')) {
      console.log('🔥 Processando como FormData');
      const formData = await request.formData();
      matricula = formData.get('matricula') as string;
      empregador = formData.get('empregador') as string;
      mes = formData.get('mes') as string;
      divisao = formData.get('divisao') as string;
      id = formData.get('id') as string;
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      console.log('🔥 Processando como URL encoded');
      const text = await request.text();
      const params = new URLSearchParams(text);
      matricula = params.get('matricula') as string;
      empregador = params.get('empregador') as string;
      mes = params.get('mes') as string;
      divisao = params.get('divisao') as string;
      id = params.get('id') as string;
    } else {
      console.log('🔥 Processando como JSON');
      const body = await request.json();
      matricula = body.matricula;
      empregador = body.empregador;
      mes = body.mes;
      divisao = body.divisao;
      id = body.id;
    }
    
    // Debug dos parâmetros recebidos
    console.log('Parâmetros recebidos para conta:', { matricula, empregador, mes, divisao, id });
    console.log('Tipos dos parâmetros:', { 
      matricula: typeof matricula, 
      empregador: typeof empregador, 
      mes: typeof mes, 
      divisao: typeof divisao, 
      id: typeof id 
    });

    // Verificar dados necessários
    if (!matricula || !empregador || !mes) {
      console.error('❌ Faltam parâmetros obrigatórios:', {
        matricula: !!matricula,
        empregador: !!empregador,
        mes: !!mes,
        valores: { matricula, empregador, mes }
      });
      return NextResponse.json(
        { 
          error: 'Matricula, empregador e mês são obrigatórios',
          received: { matricula, empregador, mes },
          missing: {
            matricula: !matricula,
            empregador: !empregador,
            mes: !mes
          }
        },
        { status: 400 }
      );
    }

    // Se temos ID e divisão nos parâmetros, usar diretamente
    if (id && divisao) {
      console.log('✅ Usando ID e divisão dos parâmetros:', { id, divisao });
    } else {
      console.error('❌ ID ou divisão não fornecidos nos parâmetros:', {
        id: !!id,
        divisao: !!divisao,
        valores: { id, divisao }
      });
      return NextResponse.json(
        { 
          error: 'ID e divisão do associado são obrigatórios',
          received: { id, divisao },
          missing: {
            id: !id,
            divisao: !divisao
          }
        },
        { status: 400 }
      );
    }

    // Preparar os dados para enviar ao backend
    const payload = new URLSearchParams();
    payload.append('matricula', matricula);
    payload.append('empregador', empregador.toString());
    payload.append('mes', mes);
    payload.append('id', id.toString());
    payload.append('divisao', divisao.toString());

    console.log('📤 Enviando dados para conta_app.php:', {
      matricula,
      empregador,
      mes,
      id,
      divisao
    });

    // Chamar a API conta_app.php
    const response = await axios.post(
      'https://sas.makecard.com.br/conta_app.php',
      payload.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );

    console.log('📋 Resposta da API conta_app.php:', response.data);
    console.log('📋 Status da resposta:', response.status);
    console.log('📋 Tipo da resposta:', typeof response.data);
    console.log('📋 É array?', Array.isArray(response.data));
    
    if (Array.isArray(response.data) && response.data.length > 0) {
      console.log('📋 Primeiro registro:', response.data[0]);
    } else if (response.data && typeof response.data === 'object') {
      console.log('📋 Resposta como objeto:', response.data);
    }

    // Verificar e retornar a resposta
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('🔥 ERRO na API de conta:', error);
    console.error('🔥 Stack trace:', error instanceof Error ? error.stack : 'N/A');
    
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
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        debug: {
          url: request.url,
          method: request.method,
          headers: Object.fromEntries(request.headers.entries())
        }
      },
      { status: statusCode }
    );
  }
} 