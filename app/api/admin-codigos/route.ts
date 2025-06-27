import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * API para listar os códigos de recuperação armazenados no banco de dados
 * Esta rota só deve funcionar em ambiente de desenvolvimento ou com autenticação
 * @returns Lista de códigos de recuperação
 */
export async function GET(request: NextRequest) {
  // Verificar se é ambiente de desenvolvimento
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { message: 'Esta rota só está disponível em ambiente de desenvolvimento' },
      { status: 403 }
    );
  }

  try {
    // Chamar a API para listar os códigos
    const response = await axios.get(
      'https://sas.makecard.com.br/admin_codigos_recuperacao.php',
      {
        params: {
          admin_token: 'chave_segura_123' // Token de autenticação para desenvolvimento
        }
      }
    );

    // Verificar resposta
    if (response.data.status === 'sucesso') {
      return NextResponse.json({
        success: true,
        codigos: response.data.codigos,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: response.data.erro || 'Erro ao listar códigos' 
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Erro ao consultar códigos de recuperação:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao consultar códigos de recuperação',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 