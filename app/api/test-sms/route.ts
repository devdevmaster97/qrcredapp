import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * API para testar envio de SMS na recuperação de senha
 * Permite diagnosticar problemas de entrega
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const cartao = formData.get('cartao') as string;
    const celular = formData.get('celular') as string;
    
    if (!cartao && !celular) {
      return NextResponse.json(
        { success: false, message: 'Informe o cartão ou celular para teste' },
        { status: 400 }
      );
    }

    let celularTeste = celular;
    
    // Se foi informado cartão, buscar o celular do associado
    if (cartao && !celular) {
      const params = new URLSearchParams();
      params.append('cartao', cartao.replace(/\D/g, ''));
      
      const responseAssociado = await axios.post(
        'https://sas.makecard.com.br/localiza_associado_app_2.php',
        params,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000
        }
      );
      
      if (!responseAssociado.data?.cel) {
        return NextResponse.json(
          { success: false, message: 'Celular não encontrado para este cartão' },
          { status: 404 }
        );
      }
      
      celularTeste = responseAssociado.data.cel;
    }

    // Formatar celular
    let celularFormatado = celularTeste.replace(/\D/g, '');
    if (!celularFormatado.startsWith('55')) {
      celularFormatado = `55${celularFormatado}`;
    }

    // Gerar código de teste
    const codigoTeste = Math.floor(100000 + Math.random() * 900000);
    const mensagem = `[TESTE] Seu código QRCred: ${codigoTeste}. Este é um teste de SMS.`;

    console.log('=== TESTE SMS ===');
    console.log('Celular original:', celularTeste);
    console.log('Celular formatado:', celularFormatado);
    console.log('Mensagem:', mensagem);

    // Testar múltiplos endpoints
    const resultados = [];

    // Teste 1: Endpoint principal
    try {
      const params1 = new URLSearchParams();
      params1.append('celular', celularFormatado);
      params1.append('mensagem', mensagem);
      params1.append('metodo', 'sms');
      params1.append('sms', 'true');
      
      const response1 = await axios.post(
        'https://sas.makecard.com.br/envia_codigo_recuperacao.php',
        params1,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15000
        }
      );
      
      resultados.push({
        endpoint: 'envia_codigo_recuperacao.php',
        status: 'sucesso',
        resposta: response1.data,
        parametros: params1.toString()
      });
    } catch (error) {
      resultados.push({
        endpoint: 'envia_codigo_recuperacao.php',
        status: 'erro',
        erro: error instanceof Error ? error.message : String(error)
      });
    }

    // Teste 2: Endpoint direto de SMS
    try {
      const params2 = new URLSearchParams();
      params2.append('celular', celularFormatado);
      params2.append('mensagem', mensagem);
      params2.append('sms', 'true');
      params2.append('token', 'chave_segura_123');
      
      const response2 = await axios.post(
        'https://sas.makecard.com.br/envia_sms_direto.php',
        params2,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15000
        }
      );
      
      resultados.push({
        endpoint: 'envia_sms_direto.php',
        status: 'sucesso',
        resposta: response2.data,
        parametros: params2.toString()
      });
    } catch (error) {
      resultados.push({
        endpoint: 'envia_sms_direto.php',
        status: 'erro',
        erro: error instanceof Error ? error.message : String(error)
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Teste de SMS executado',
      celular: celularFormatado,
      resultados: resultados,
      diagnostico: {
        celularOriginal: celularTeste,
        celularFormatado: celularFormatado,
        tamanho: celularFormatado.length,
        valido: celularFormatado.length >= 12 && celularFormatado.startsWith('55')
      }
    });

  } catch (error) {
    console.error('Erro no teste de SMS:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao executar teste de SMS',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
