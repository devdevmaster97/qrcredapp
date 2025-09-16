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
      console.error('❌ Parâmetros obrigatórios ausentes:', { matricula, empregador });
      return NextResponse.json(
        { error: 'Matrícula e empregador são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Validar formato dos parâmetros
    if (typeof matricula !== 'string' || matricula.trim() === '') {
      console.error('❌ Matrícula inválida:', matricula);
      return NextResponse.json(
        { error: 'Matrícula deve ser uma string não vazia' },
        { status: 400 }
      );
    }
    
    if (isNaN(Number(empregador)) || Number(empregador) <= 0) {
      console.error('❌ Empregador inválido:', empregador);
      return NextResponse.json(
        { error: 'Empregador deve ser um número válido' },
        { status: 400 }
      );
    }
    
    // Preparar a requisição para o backend
    const formData = new FormData();
    formData.append('matricula', matricula);
    formData.append('empregador', empregador);
    
    console.log('📤 Preparando requisição para o backend:');
    console.log('   - Matrícula:', matricula, '(tipo:', typeof matricula, ')');
    console.log('   - Empregador:', empregador, '(tipo:', typeof empregador, ')');
    console.log('   - URL:', 'https://sas.makecard.com.br/historico_antecipacao_app.php');
    
    // Teste de conectividade básica
    console.log('🔍 Testando conectividade com o servidor...');
    try {
      const testResponse = await axios.get('https://sas.makecard.com.br/', { timeout: 5000 });
      console.log('✅ Servidor acessível - Status:', testResponse.status);
    } catch (testError) {
      console.log('⚠️ Servidor pode estar inacessível:', testError instanceof Error ? testError.message : 'Erro desconhecido');
    }
    
    // Fazer a requisição para o endpoint do backend
    console.log('🔍 Enviando requisição para histórico de antecipações...');
    
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
    
    console.log('✅ Resposta recebida do backend:', {
      status: response.status,
      statusText: response.statusText,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data)
    });
    
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
        console.error('🚨 Erro de resposta do backend:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
        
        // Tratamento específico para erro 403
        if (error.response.status === 403) {
          console.error('🚫 Acesso negado (403) - Possíveis causas:');
          console.error('   - Matrícula ou empregador inválidos');
          console.error('   - Usuário sem permissão para acessar histórico');
          console.error('   - Backend rejeitando requisição por segurança');
          
          return NextResponse.json(
            { 
              error: 'Acesso negado ao histórico de antecipações',
              details: 'Verifique se a matrícula e empregador estão corretos',
              status: 403
            },
            { status: 403 }
          );
        }
        
        return NextResponse.json(
          { 
            error: `Erro ao buscar histórico: ${error.response.status}`,
            details: error.response.data || 'Erro desconhecido do servidor'
          },
          { status: error.response.status }
        );
      } else if (error.request) {
        // A requisição foi feita mas não houve resposta
        console.error('🚨 Erro de requisição - servidor não respondeu:', error.request);
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