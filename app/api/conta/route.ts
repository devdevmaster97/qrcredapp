import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    let matricula: string;
    let empregador: string | number;
    let mes: string;
    let divisao: string | number;
    let id: string | number;
    
    // Verificar o Content-Type e processar a request apropriadamente
    const contentType = request.headers.get('Content-Type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      matricula = formData.get('matricula') as string;
      empregador = formData.get('empregador') as string;
      mes = formData.get('mes') as string;
      divisao = formData.get('divisao') as string;
      id = formData.get('id') as string;
    } else {
      // Assume JSON
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
      console.log('Faltam parâmetros obrigatórios');
      return NextResponse.json(
        { error: 'Matricula, empregador e mês são obrigatórios' },
        { status: 400 }
      );
    }

    // Preparar os dados para enviar ao backend
    const payload = new URLSearchParams();
    payload.append('matricula', matricula);
    payload.append('empregador', empregador.toString());
    payload.append('mes', mes);
    if (divisao) {
      const divisaoInt = parseInt(String(divisao), 10);
      if (!isNaN(divisaoInt)) {
        payload.append('divisao', divisaoInt.toString());
      }
    }
    if (id) {
      const idInt = parseInt(String(id), 10);
      if (!isNaN(idInt)) {
        payload.append('id', idInt.toString());
      }
    }
    
    console.log('Dados sendo enviados para conta_app.php:', {
      matricula,
      empregador: empregador.toString(),
      mes,
      divisao,
      id
    });
    console.log('Payload completo (URLSearchParams):', payload.toString());
    console.log('Parâmetros individuais do payload:');
    const entries = Array.from(payload.entries());
    entries.forEach(([key, value]) => {
      console.log(`  ${key}: "${value}" (tipo: ${typeof value})`);
    });
    
    // Enviar a requisição para o backend
    const response = await axios.post(
      'https://sas.makecard.com.br/conta_app.php',
      payload,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000, // 10 segundos de timeout
      }
    );

    console.log('Resposta do endpoint conta:', response.data);
    console.log('Status da resposta:', response.status);
    console.log('Headers da resposta:', response.headers);
    console.log('Tipo da resposta:', typeof response.data);
    console.log('É array?', Array.isArray(response.data));
    console.log('Quantidade de registros:', Array.isArray(response.data) ? response.data.length : 'N/A');
    
    if (Array.isArray(response.data) && response.data.length > 0) {
      console.log('Primeiro registro:', response.data[0]);
    } else if (response.data && typeof response.data === 'object') {
      console.log('Resposta como objeto:', response.data);
    }

    // Verificar e retornar a resposta
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Erro na API de conta:', error);
    
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