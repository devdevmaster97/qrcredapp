import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    console.log('Iniciando teste de conexão com o servidor');
    
    // Teste 1: Verificar se conseguimos acessar o servidor
    try {
      const resposta1 = await axios.get(
        'https://sas.makecard.com.br/', 
        { timeout: 5000 }
      );
      console.log('Servidor respondeu com status:', resposta1.status);
    } catch (error) {
      console.error('Falha no teste 1:', error);
    }

    // Teste 2: Tentar enviar um cartão com formato fixo (o mesmo que você está tentando)
    try {
      const payload = new URLSearchParams();
      payload.append('cartao', '3552966944');
      payload.append('senha', '251490');

      console.log('Enviando credenciais de teste:', payload.toString());
      
      const resposta2 = await axios.post(
        'https://sas.makecard.com.br/localiza_associado_app_2.php',
        payload,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        }
      );
      
      console.log('Resposta do teste 2:', JSON.stringify(resposta2.data));
      
      return NextResponse.json({
        sucesso: true,
        mensagem: 'Teste de conexão concluído',
        resultadoServidor: resposta2.data
      });
      
    } catch (error) {
      console.error('Falha no teste 2:', error);
      
      if (axios.isAxiosError(error) && error.response) {
        return NextResponse.json({
          sucesso: false,
          mensagem: 'Falha no teste de conexão',
          erro: error.message,
          statusResposta: error.response.status,
          dadosResposta: error.response.data
        }, { status: 500 });
      } else {
        return NextResponse.json({
          sucesso: false,
          mensagem: 'Falha no teste de conexão',
          erro: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('Erro geral no teste de conexão:', error);
    return NextResponse.json({
      sucesso: false,
      mensagem: 'Erro no teste de conexão',
      erro: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 