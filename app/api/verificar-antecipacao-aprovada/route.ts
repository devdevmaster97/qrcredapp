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

    // Fazer requisição para API PHP atualizada
    // Nova lógica PHP: verifica has_signed = true E tipo = 2 na tabela sind.associados_sasmais
    const params = new URLSearchParams();
    params.append('codigo', codigo.toString());

    const response = await axios.post(
      'https://sas.makecard.com.br/verificar_assinatura_aprovada.php',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );

    console.log('📋 Resposta da API verificar_assinatura_aprovada:', response.data);

    // Nova lógica: usar diretamente o campo 'aprovada' retornado pela API PHP
    // A API PHP verifica: has_signed = true E tipo = 2
    let aprovada = false;
    
    if (response.data && typeof response.data === 'object') {
      // A API PHP retorna: { success, aprovada, message, debug }
      aprovada = response.data.aprovada === true;
      
      console.log('📊 Debug da verificação:', {
        success: response.data.success,
        aprovada: response.data.aprovada,
        message: response.data.message,
        has_signed: response.data.debug?.has_signed,
        tipo: response.data.debug?.tipo
      });
    }

    console.log('✅ Status de aprovação da antecipação:', aprovada);

    return NextResponse.json({
      success: true,
      aprovada: aprovada,
      message: response.data?.message || (aprovada ? 'Assinatura aprovada' : 'Assinatura não aprovada'),
      debug: response.data?.debug || null,
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
