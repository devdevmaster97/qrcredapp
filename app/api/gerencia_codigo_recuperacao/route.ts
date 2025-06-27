import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * API para gerenciar códigos de recuperação
 * Permite inserir, atualizar ou excluir códigos de recuperação
 * @param request Requisição com operação, cartão e código
 * @returns Resposta com status da operação
 */
export async function POST(request: NextRequest) {
  try {
    // Extrair dados do formulário
    const formData = await request.formData();
    const cartao = formData.get('cartao') as string;
    const codigo = formData.get('codigo') as string;
    const operacao = formData.get('operacao') as string;

    // Validar campos obrigatórios
    if (!cartao) {
      return NextResponse.json(
        { success: false, message: 'Número do cartão é obrigatório' },
        { status: 400 }
      );
    }

    if (!codigo && operacao !== 'excluir') {
      return NextResponse.json(
        { success: false, message: 'Código de verificação é obrigatório' },
        { status: 400 }
      );
    }

    if (!operacao || !['inserir', 'atualizar', 'excluir'].includes(operacao)) {
      return NextResponse.json(
        { success: false, message: 'Operação inválida. Use: inserir, atualizar ou excluir' },
        { status: 400 }
      );
    }

    // Limpar o cartão (remover não numéricos)
    const cartaoLimpo = cartao.replace(/\D/g, '');
    
    console.log(`Operação ${operacao} de código:`, { cartao: cartaoLimpo, codigo });

    // Preparar parâmetros para a API
    const params = new URLSearchParams();
    params.append('cartao', cartaoLimpo);
    
    if (codigo) {
      params.append('codigo', codigo);
    }
    
    params.append('operacao', operacao);
    params.append('admin_token', 'chave_segura_123');
    
    // Chamar a API externa para gerenciar o código
    const response = await axios.post(
      'https://sas.makecard.com.br/gerencia_codigo_recuperacao.php',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      }
    );
    
    console.log(`Resposta da API para operação ${operacao}:`, response.data);
    
    // Verificar resposta da operação
    if (response.data.status === 'sucesso') {
      return NextResponse.json({
        success: true,
        message: `Operação ${operacao} realizada com sucesso`,
        data: response.data
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: response.data.erro || `Erro na operação ${operacao}`,
          data: response.data
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Erro ao gerenciar código de recuperação:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao processar solicitação',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 