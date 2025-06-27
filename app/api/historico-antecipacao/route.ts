import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    // Obter os dados da solicitação
    let matricula, empregador;
    
    try {
      const formData = await request.formData();
      matricula = formData.get('matricula')?.toString();
      empregador = formData.get('empregador')?.toString();
      console.log('Parâmetros recebidos (FormData):', { matricula, empregador });
    } catch (error) {
      // Se não for FormData, tentar como JSON
      const data = await request.json();
      matricula = data.matricula;
      empregador = data.empregador;
      console.log('Parâmetros recebidos (JSON):', { matricula, empregador });
    }

    // Verificar parâmetros obrigatórios
    if (!matricula || !empregador) {
      return NextResponse.json(
        { error: 'Matrícula e empregador são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Preparar a requisição para o backend
    const formData = new FormData();
    formData.append('matricula', matricula);
    formData.append('empregador', empregador);
    
    console.log('Enviando requisição para o backend com matrícula:', matricula, 'e empregador:', empregador);
    
    // Fazer a requisição para o endpoint do backend
    const response = await axios.post(
      'https://sas.makecard.com.br/historico_antecipacao_app.php',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 10000, // 10 segundos
      }
    );
    
    console.log('Resposta do backend:', response.data);
    
    // Verificar se a resposta é um array
    if (Array.isArray(response.data)) {
      return NextResponse.json(response.data);
    } 
    
    // Se a resposta for um objeto único, converter para array
    if (response.data && typeof response.data === 'object') {
      // Se for um objeto vazio ou sem as propriedades esperadas, retornar array vazio
      if (Object.keys(response.data).length === 0 || !response.data.id) {
        return NextResponse.json([]);
      }
      
      // Se for um único objeto, retornar como array
      return NextResponse.json([response.data]);
    }
    
    // Se a resposta não for array nem objeto, retornar array vazio
    return NextResponse.json([]);
    
  } catch (error) {
    console.error('Erro ao buscar histórico de antecipações:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // O servidor respondeu com um status fora do intervalo 2xx
        console.error('Erro de resposta:', error.response.status, error.response.data);
        return NextResponse.json(
          { error: `Erro ao buscar histórico: ${error.response.status}` },
          { status: error.response.status }
        );
      } else if (error.request) {
        // A requisição foi feita mas não houve resposta
        console.error('Erro de requisição:', error.request);
        return NextResponse.json(
          { error: 'Servidor não respondeu à solicitação' },
          { status: 503 }
        );
      }
    }
    
    // Para outros tipos de erro
    return NextResponse.json(
      { error: 'Erro ao buscar histórico de antecipações' },
      { status: 500 }
    );
  }
} 