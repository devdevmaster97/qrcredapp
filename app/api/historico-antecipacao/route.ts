import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    // Obter os dados da solicitação
    let matricula, empregador, id_associado, divisao;
    
    try {
      const formData = await request.formData();
      matricula = formData.get('matricula')?.toString();
      empregador = formData.get('empregador')?.toString();
      id_associado = formData.get('id_associado')?.toString();
      divisao = formData.get('divisao')?.toString();
      console.log('Parâmetros recebidos (FormData):', { matricula, empregador, id_associado, divisao });
    } catch (error) {
      // Se não for FormData, tentar como JSON
      const data = await request.json();
      matricula = data.matricula;
      empregador = data.empregador;
      id_associado = data.id_associado;
      divisao = data.divisao;
      console.log('Parâmetros recebidos (JSON):', { matricula, empregador, id_associado, divisao });
    }

    // Verificar parâmetros obrigatórios
    if (!matricula || !empregador || !id_associado || !divisao) {
      console.error('❌ Parâmetros obrigatórios ausentes:', { matricula, empregador, id_associado, divisao });
      return NextResponse.json(
        { error: 'Matrícula, empregador, id_associado e divisão são obrigatórios' },
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
    
    if (isNaN(Number(id_associado)) || Number(id_associado) <= 0) {
      console.error('❌ ID do associado inválido:', id_associado);
      return NextResponse.json(
        { error: 'ID do associado deve ser um número válido' },
        { status: 400 }
      );
    }
    
    if (isNaN(Number(divisao)) || Number(divisao) <= 0) {
      console.error('❌ Divisão inválida:', divisao);
      return NextResponse.json(
        { error: 'Divisão deve ser um número válido' },
        { status: 400 }
      );
    }
    
    console.log('📤 Preparando requisição para o backend:');
    console.log('   - Matrícula:', matricula, '(tipo:', typeof matricula, ')');
    console.log('   - Empregador:', empregador, '(tipo:', typeof empregador, ')');
    console.log('   - ID Associado:', id_associado, '(tipo:', typeof id_associado, ')');
    console.log('   - Divisão:', divisao, '(tipo:', typeof divisao, ')');
    console.log('   - URL:', 'https://sas.makecard.com.br/historico_antecipacao_app.php');
    console.log('   - Método: GET (POST bloqueado pelo servidor)');
    
    // Teste de conectividade básica
    console.log('🔍 Testando conectividade com o servidor...');
    try {
      const testResponse = await axios.get('https://sas.makecard.com.br/', { timeout: 5000 });
      console.log('✅ Servidor acessível - Status:', testResponse.status);
    } catch (testError) {
      console.log('⚠️ Servidor pode estar inacessível:', testError instanceof Error ? testError.message : 'Erro desconhecido');
    }
    
    // Tentar POST primeiro, se falhar com 403, tentar GET
    console.log('🔍 Tentando requisição POST primeiro...');
    
    let response;
    try {
      // Preparar FormData para POST
      const formData = new FormData();
      formData.append('matricula', matricula);
      formData.append('empregador', empregador);
      formData.append('id_associado', id_associado);
      formData.append('divisao', divisao);
      
      response = await axios.post(
        'https://sas.makecard.com.br/historico_antecipacao_app.php',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 10000,
        }
      );
      console.log('✅ POST bem-sucedido');
    } catch (postError) {
      if (axios.isAxiosError(postError) && postError.response?.status === 403) {
        console.log('⚠️ POST falhou com 403, tentando GET...');
        
        // Tentar GET como fallback usando FormData
        const getFormData = new FormData();
        getFormData.append('matricula', matricula);
        getFormData.append('empregador', empregador);
        getFormData.append('id_associado', id_associado);
        getFormData.append('divisao', divisao);
        
        response = await axios.request({
          method: 'GET',
          url: 'https://sas.makecard.com.br/historico_antecipacao_app.php',
          data: getFormData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 10000,
        });
        console.log('✅ GET bem-sucedido');
      } else {
        throw postError;
      }
    }
    
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