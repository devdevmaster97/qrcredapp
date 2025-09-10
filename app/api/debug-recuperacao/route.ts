import { NextRequest, NextResponse } from 'next/server';
import { codigosRecuperacao } from '../recuperacao-senha/route';

export const dynamic = 'force-dynamic';

/**
 * API para debug da recuperação de senha
 * Mostra todos os códigos armazenados e permite diagnóstico
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cartao = searchParams.get('cartao');
    
    if (cartao) {
      // Buscar códigos específicos para um cartão
      const cartaoLimpo = cartao.replace(/\D/g, '');
      const codigosCartao = Object.entries(codigosRecuperacao)
        .filter(([chave]) => chave.startsWith(cartaoLimpo))
        .map(([chave, dados]) => ({
          chave,
          ...dados,
          tempoDecorrido: Math.floor((Date.now() - dados.timestamp) / 1000),
          expirado: (Date.now() - dados.timestamp) > 600000 // 10 minutos
        }));
      
      return NextResponse.json({
        success: true,
        cartao: cartaoLimpo,
        codigos: codigosCartao,
        total: codigosCartao.length
      });
    }
    
    // Mostrar todos os códigos
    const todosOsCodigos = Object.entries(codigosRecuperacao).map(([chave, dados]) => ({
      chave,
      ...dados,
      tempoDecorrido: Math.floor((Date.now() - dados.timestamp) / 1000),
      expirado: (Date.now() - dados.timestamp) > 600000
    }));
    
    return NextResponse.json({
      success: true,
      codigos: todosOsCodigos,
      total: todosOsCodigos.length,
      agora: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Erro no debug de recuperação:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao executar debug',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Limpar códigos expirados
 */
export async function DELETE(request: NextRequest) {
  try {
    const agora = Date.now();
    const chavesParaRemover: string[] = [];
    
    // Identificar códigos expirados (mais de 10 minutos)
    for (const [chave, dados] of Object.entries(codigosRecuperacao)) {
      if ((agora - dados.timestamp) > 600000) {
        chavesParaRemover.push(chave);
      }
    }
    
    // Remover códigos expirados
    chavesParaRemover.forEach(chave => {
      delete codigosRecuperacao[chave];
    });
    
    return NextResponse.json({
      success: true,
      message: `${chavesParaRemover.length} códigos expirados removidos`,
      removidos: chavesParaRemover
    });
    
  } catch (error) {
    console.error('Erro ao limpar códigos:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao limpar códigos expirados',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
