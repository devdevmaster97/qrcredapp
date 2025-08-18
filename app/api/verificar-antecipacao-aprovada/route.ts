import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codigo } = body;

    console.log('🔍 Verificando aprovação de antecipação para código:', codigo);

    if (!codigo) {
      return NextResponse.json({
        success: false,
        message: 'Código do associado é obrigatório',
        aprovada: false
      });
    }

    // Fazer requisição para API PHP que verifica assinaturas digitais aprovadas
    const params = new URLSearchParams();
    params.append('codigo', codigo.toString());
    params.append('tipo', 'antecipação'); // Usar com acento como provavelmente está no banco

    const response = await axios.post(
      'https://sas.makecard.com.br/verificar_assinatura_aprovada_debug.php',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );

    console.log('📋 Resposta da API verificar_assinatura_aprovada:', response.data);

    // Verificar se a resposta indica aprovação
    let aprovada = false;
    
    if (response.data) {
      // Se a API retornar dados, verificar se há aprovação
      if (typeof response.data === 'object') {
        // Verificar se tem valor_aprovado e data_pgto preenchidos
        aprovada = !!(response.data.valor_aprovado && response.data.data_pgto && response.data.tipo === 'antecipacao');
      } else if (typeof response.data === 'string') {
        // Se retornar string, verificar conteúdo
        aprovada = response.data.toLowerCase().includes('aprovado') || response.data.toLowerCase().includes('aprovada');
      }
    }

    console.log('✅ Status de aprovação da antecipação:', aprovada);

    return NextResponse.json({
      success: true,
      aprovada: aprovada,
      detalhes: response.data
    });

  } catch (error) {
    console.error('❌ Erro ao verificar aprovação da antecipação:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao verificar status de aprovação da antecipação',
      aprovada: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
