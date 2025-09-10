import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 API verificar-senha iniciada');
    
    // Processar dados da requisição
    const body = await request.json();
    const { matricula, senha, id_associado, empregador } = body;
    
    // Validar parâmetros obrigatórios
    if (!matricula || !senha || !id_associado || !empregador) {
      console.error('❌ Parâmetros obrigatórios não fornecidos:', { 
        matricula: !!matricula, 
        senha: !!senha, 
        id_associado: !!id_associado,
        empregador: !!empregador 
      });
      return NextResponse.json(
        { 
          success: false,
          error: 'Matrícula, senha, ID do associado e empregador são obrigatórios' 
        },
        { status: 400 }
      );
    }
    
    console.log('🔐 Verificando senha para matrícula:', matricula);
    console.log('🔐 ID do associado:', id_associado);
    console.log('🔐 Empregador:', empregador);
    
    // Preparar dados para enviar ao backend PHP (usando os nomes corretos que o PHP espera)
    const formData = new URLSearchParams();
    formData.append('matricula', matricula);
    formData.append('pass', senha); // PHP espera 'pass', não 'senha'
    formData.append('id_associado', id_associado.toString());
    formData.append('empregador', empregador.toString());
    
    console.log('📤 Incluindo empregador:', empregador);
    
    console.log('📤 Enviando dados para consulta_pass_assoc.php');
    console.log('📤 Parâmetros enviados:', formData.toString());
    
    // Chamar API PHP externa
    const response = await axios.post(
      'https://sas.makecard.com.br/consulta_pass_assoc.php',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        timeout: 15000, // 15 segundos de timeout
      }
    );
    
    console.log('📄 Status da resposta PHP:', response.status);
    console.log('📄 Headers da resposta PHP:', response.headers);
    console.log('📄 Resposta bruta da API PHP:', response.data);
    console.log('📄 Tipo da resposta:', typeof response.data);
    console.log('📄 Tamanho da resposta:', response.data ? String(response.data).length : 0);
    
    // Verificar se a resposta é válida
    if (!response.data) {
      console.error('❌ Resposta vazia da API PHP');
      return NextResponse.json(
        { 
          success: false,
          error: 'Resposta vazia do servidor' 
        },
        { status: 500 }
      );
    }
    
    // Tentar fazer parsing da resposta
    let parsedData;
    try {
      if (typeof response.data === 'string') {
        parsedData = JSON.parse(response.data);
      } else {
        parsedData = response.data;
      }
    } catch (parseError) {
      console.error('❌ Erro ao fazer parsing da resposta:', parseError);
      console.error('❌ Resposta recebida:', response.data);
      return NextResponse.json(
        { 
          success: false,
          error: 'Erro ao processar resposta do servidor' 
        },
        { status: 500 }
      );
    }
    
    console.log('📄 Dados parseados da API PHP:', parsedData);
    
    // Extrair situacao da nova estrutura padronizada do PHP
    const situacao = parsedData.data?.situacao || parsedData.situacao;
    console.log('📄 Valor específico de situacao:', situacao);
    console.log('📄 Tipo de situacao:', typeof situacao);
    console.log('📄 Success do PHP:', parsedData.success);
    
    // Verificar se a senha está correta (PHP retorna 'certo' ou 'errado')
    if (situacao === 'certo') {
      console.log('✅ Senha verificada com sucesso');
      
      return NextResponse.json({
        success: true,
        data: {
          ...parsedData,
          situacao: 1 // Converter para formato esperado pelo frontend
        },
        message: 'Senha verificada com sucesso'
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } else if (situacao === 'errado') {
      console.log('❌ Senha incorreta - situacao:', situacao);
      
      return NextResponse.json({
        success: false,
        error: 'Senha incorreta'
      }, { status: 401 });
    } else {
      // Caso seja uma mensagem de erro do banco ou outro erro
      console.log('❌ Erro retornado pelo PHP - situacao:', situacao);
      console.log('❌ Dados completos do PHP:', JSON.stringify(parsedData, null, 2));
      
      // Verificar se é um erro específico de conexão ou parâmetros
      const errorMessage = situacao || parsedData.error || 'Erro desconhecido';
      
      // Se contém palavras-chave de erro de banco, tratar como erro de servidor
      if (typeof errorMessage === 'string' && (
        errorMessage.includes('Connection') || 
        errorMessage.includes('PDO') || 
        errorMessage.includes('database') ||
        errorMessage.includes('SQL') ||
        errorMessage.includes('SQLSTATE')
      )) {
        return NextResponse.json({
          success: false,
          error: 'Erro temporário no servidor. Tente novamente em alguns instantes.'
        }, { status: 503 });
      }
      
      return NextResponse.json({
        success: false,
        error: `Erro na verificação: ${errorMessage}`
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Erro na API verificar-senha:', error);
    
    // Log detalhado do erro
    if (axios.isAxiosError(error)) {
      console.error('❌ Erro Axios - Status:', error.response?.status);
      console.error('❌ Erro Axios - Data:', error.response?.data);
      console.error('❌ Erro Axios - Headers:', error.response?.headers);
      console.error('❌ Erro Axios - Config URL:', error.config?.url);
      console.error('❌ Erro Axios - Message:', error.message);
      console.error('❌ Erro Axios - Code:', error.code);
      
      // Se houve resposta do servidor mas com erro
      if (error.response) {
        const responseData = error.response.data;
        console.error('❌ Resposta de erro do PHP:', responseData);
        
        return NextResponse.json(
          { 
            success: false,
            error: `Erro do servidor PHP: ${error.response.status} - ${responseData || 'Resposta vazia'}` 
          },
          { status: 500 }
        );
      }
      
      // Se não conseguiu conectar
      if (error.request) {
        console.error('❌ Requisição feita mas sem resposta:', error.request);
        return NextResponse.json(
          { 
            success: false,
            error: 'Não foi possível conectar com o servidor de verificação de senha' 
          },
          { status: 500 }
        );
      }
      
      // Erro de timeout
      if (error.code === 'ECONNABORTED') {
        return NextResponse.json(
          { 
            success: false,
            error: 'Timeout na verificação de senha - servidor demorou para responder' 
          },
          { status: 408 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: `Erro interno do servidor: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      },
      { status: 500 }
    );
  }
}
