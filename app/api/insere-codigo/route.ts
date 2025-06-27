import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * API para inserir códigos de recuperação diretamente no banco de dados
 * Esta API tenta ambos os métodos de inserção para garantir que o código seja gravado
 * @param request Requisição com cartão e código
 * @returns Resposta com status da operação
 */
export async function POST(request: NextRequest) {
  try {
    // Extrair dados do formulário
    const formData = await request.formData();
    const cartao = formData.get('cartao') as string;
    const codigo = formData.get('codigo') as string;

    // Validar campos obrigatórios
    if (!cartao) {
      return NextResponse.json(
        { success: false, message: 'Número do cartão é obrigatório' },
        { status: 400 }
      );
    }

    if (!codigo) {
      return NextResponse.json(
        { success: false, message: 'Código de recuperação é obrigatório' },
        { status: 400 }
      );
    }

    // Limpar o cartão (remover não numéricos)
    const cartaoLimpo = cartao.replace(/\D/g, '');
    
    console.log('Inserindo código de recuperação:', { cartao: cartaoLimpo, codigo });

    // Resultado da operação
    const resultado = {
      gerenciaAPI: false,
      adminAPI: false,
      mensagem: ''
    };

    // Tentar primeiro método: gerencia_codigo_recuperacao.php
    try {
      const paramsGerencia = new URLSearchParams();
      paramsGerencia.append('cartao', cartaoLimpo);
      paramsGerencia.append('codigo', codigo);
      paramsGerencia.append('operacao', 'inserir');
      paramsGerencia.append('admin_token', 'chave_segura_123');
      
      console.log('Chamando API gerencia_codigo_recuperacao.php...');
      
      const responseGerencia = await axios.post(
        'https://sas.makecard.com.br/gerencia_codigo_recuperacao.php',
        paramsGerencia,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 8000
        }
      );
      
      console.log('Resposta da API gerencia_codigo_recuperacao:', responseGerencia.data);
      resultado.gerenciaAPI = true;
      resultado.mensagem += 'API gerencia_codigo: OK. ';
    } catch (gerenciaError) {
      console.error('Erro na API gerencia_codigo_recuperacao:', gerenciaError);
      resultado.mensagem += `API gerencia_codigo: ERRO (${gerenciaError instanceof Error ? gerenciaError.message : 'desconhecido'}). `;
    }

    // Tentar segundo método: admin_codigos_recuperacao.php
    try {
      const paramsAdmin = new URLSearchParams();
      paramsAdmin.append('admin_token', 'chave_segura_123');
      paramsAdmin.append('operacao', 'inserir_direto');
      paramsAdmin.append('cartao', cartaoLimpo);
      paramsAdmin.append('codigo', codigo);
      
      console.log('Chamando API admin_codigos_recuperacao.php...');
      
      const responseAdmin = await axios.post(
        'https://sas.makecard.com.br/admin_codigos_recuperacao.php',
        paramsAdmin,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 8000
        }
      );
      
      console.log('Resposta da API admin_codigos_recuperacao:', responseAdmin.data);
      resultado.adminAPI = true;
      resultado.mensagem += 'API admin_codigos: OK. ';
    } catch (adminError) {
      console.error('Erro na API admin_codigos_recuperacao:', adminError);
      resultado.mensagem += `API admin_codigos: ERRO (${adminError instanceof Error ? adminError.message : 'desconhecido'}). `;
    }

    // Verificar se pelo menos um método funcionou
    if (resultado.gerenciaAPI || resultado.adminAPI) {
      return NextResponse.json({
        success: true,
        message: `Código inserido com sucesso em pelo menos um método. ${resultado.mensagem}`,
        resultado
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: `Falha ao inserir código. ${resultado.mensagem}`,
          resultado
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro ao processar inserção de código:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao processar inserção de código',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 