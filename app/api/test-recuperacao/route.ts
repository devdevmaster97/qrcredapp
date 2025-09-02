import { NextRequest, NextResponse } from 'next/server';

/**
 * API de teste para recuperação de senha
 * Permite testar o fluxo sem fazer chamadas reais
 */
export async function POST(request: NextRequest) {
  try {
    const { cartao, metodo } = await request.json();
    
    console.log('=== TESTE RECUPERAÇÃO ===');
    console.log('Cartão:', cartao);
    console.log('Método:', metodo);
    console.log('Timestamp:', new Date().toISOString());
    
    if (!cartao || !metodo) {
      return NextResponse.json(
        { success: false, message: 'Cartão e método são obrigatórios' },
        { status: 400 }
      );
    }

    if (!['email', 'sms', 'whatsapp'].includes(metodo)) {
      return NextResponse.json(
        { success: false, message: 'Método inválido' },
        { status: 400 }
      );
    }

    const cartaoLimpo = cartao.replace(/\D/g, '');
    
    // Simular dados do associado
    const dadosSimulados = {
      matricula: cartaoLimpo,
      email: 'teste@exemplo.com',
      cel: '11999999999',
      nome: 'Usuário Teste'
    };
    
    console.log('Dados simulados:', dadosSimulados);
    
    // Simular geração de código
    const codigo = Math.floor(100000 + Math.random() * 900000);
    console.log('Código gerado:', codigo);
    
    // Simular envio bem-sucedido
    const destino = metodo === 'email' 
      ? 'te***@ex***.com'
      : '11***999';
    
    console.log('Destino mascarado:', destino);
    console.log('=== FIM TESTE ===');
    
    return NextResponse.json({
      success: true,
      message: `Código de recuperação enviado com sucesso para o ${metodo === 'email' ? 'e-mail' : metodo === 'sms' ? 'celular via SMS' : 'WhatsApp'} cadastrado.`,
      destino: destino,
      teste: true,
      codigo: codigo, // Apenas para teste
      dadosAssociado: dadosSimulados
    });
    
  } catch (error) {
    console.error('Erro no teste de recuperação:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro no teste de recuperação',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
