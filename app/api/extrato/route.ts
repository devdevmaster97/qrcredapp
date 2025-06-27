import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    let matricula: string;
    let empregador: string | number;
    let mes: string;
    
    // Verificar o Content-Type e processar a request apropriadamente
    const contentType = request.headers.get('Content-Type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      matricula = formData.get('matricula') as string;
      empregador = formData.get('empregador') as string;
      mes = formData.get('mes') as string;
    } else {
      // Assume JSON
      const body = await request.json();
      matricula = body.matricula;
      empregador = body.empregador;
      mes = body.mes;
    }
    
    // Debug dos parâmetros recebidos
    console.log('Parâmetros recebidos para extrato:', { matricula, empregador, mes });

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
    
    console.log('Dados sendo enviados para extrato_app.php:', {
      matricula,
      empregador: empregador.toString(),
      mes
    });
    
    // Enviar a requisição para o backend
    const response = await axios.post(
      'https://sas.makecard.com.br/extrato_app.php',
      payload,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000, // 10 segundos de timeout
      }
    );

    console.log('Resposta do endpoint extrato:', response.data);

    // Verificar e retornar a resposta
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Erro na API de extrato:', error);
    
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