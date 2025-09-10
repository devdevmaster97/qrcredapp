import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 API verificar-senha iniciada');
    
    // Processar dados da requisição
    const body = await request.json();
    const { matricula, senha, id_associado } = body;
    
    // Validar parâmetros obrigatórios
    if (!matricula || !senha) {
      console.error('❌ Parâmetros obrigatórios não fornecidos:', { matricula: !!matricula, senha: !!senha, id_associado: !!id_associado });
      return NextResponse.json(
        { 
          success: false,
          error: 'Matrícula e senha são obrigatórios' 
        },
        { status: 400 }
      );
    }
    
    console.log('🔐 Verificando senha para matrícula:', matricula);
    console.log('🔐 ID do associado:', id_associado);
    
    // Preparar dados para enviar ao backend PHP
    const formData = new URLSearchParams();
    formData.append('matricula', matricula);
    formData.append('senha', senha);
    
    // Adicionar id_associado se fornecido
    if (id_associado) {
      formData.append('id_associado', id_associado.toString());
      console.log('📤 Incluindo id_associado:', id_associado);
    }
    
    console.log('📤 Enviando dados para consulta_pass_assoc.php');
    
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
    
    console.log('📄 Resposta bruta da API PHP:', response.data);
    
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
    
    // Verificar se a senha está correta
    if (parsedData.situacao === 1) {
      console.log('✅ Senha verificada com sucesso');
      
      return NextResponse.json({
        success: true,
        data: parsedData,
        message: 'Senha verificada com sucesso'
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } else {
      console.log('❌ Senha incorreta - situacao:', parsedData.situacao);
      
      return NextResponse.json({
        success: false,
        error: 'Senha incorreta'
      }, { status: 401 });
    }
    
  } catch (error) {
    console.error('❌ Erro na API verificar-senha:', error);
    
    let errorMessage = 'Erro ao verificar senha';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Timeout na verificação de senha';
        statusCode = 408;
      } else if (error.response) {
        statusCode = error.response.status;
        errorMessage = `Erro ${statusCode} na verificação de senha`;
        console.log('Dados do erro:', error.response.data);
      } else if (error.request) {
        errorMessage = 'Sem resposta do servidor de verificação';
        statusCode = 503;
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage, 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: statusCode }
    );
  }
}
