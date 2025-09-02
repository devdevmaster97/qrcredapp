import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { randomInt } from 'crypto';

// Armazenamento em memória para controle de rate limiting
const enviosRecentes: { [key: string]: number } = {};
const INTERVALO_MINIMO_ENVIO = 60000; // 1 minuto em milissegundos

// Controle de requisições em andamento para evitar duplicatas
const requisicoesEmAndamento: { [key: string]: Promise<any> } = {};

// Armazenamento em memória para códigos de recuperação (apenas para debug/desenvolvimento)
export const codigosRecuperacao: { [key: string]: { codigo: string; timestamp: number; metodo: string; enviado: boolean } } = {};

// Interface para a resposta da API de recuperação
interface RecuperacaoResponse {
  success: boolean;
  message: string;
  destino?: string;
  codigoTemp?: string;
}

/**
 * API para recuperação de senha
 * Envia um código para o e-mail ou celular cadastrado
 * @param request Requisição com cartão e método de recuperação (email, sms, whatsapp)
 * @returns Resposta com status da operação
 */
export async function POST(request: NextRequest) {
  console.log('=== POST RECUPERAÇÃO INICIADO ===');
  try {
    console.log('Fazendo parse do JSON...');
    const { cartao, metodo } = await request.json();
    console.log('JSON parseado com sucesso:', { cartao, metodo });

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

    // Consultar dados do associado para verificar se existe e obter email/celular
    const params = new URLSearchParams();
    params.append('cartao', cartaoLimpo);

    console.log('=== INÍCIO RECUPERAÇÃO ===');
    console.log('Cartão limpo:', cartaoLimpo);
    console.log('Método:', metodo);
    console.log('Timestamp:', new Date().toISOString());
    console.log('Buscando dados do associado para recuperação de senha:', cartaoLimpo);

    const responseAssociado = await axios.post(
      'https://sas.makecard.com.br/localiza_associado_app_2.php',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000 // 10 segundos de timeout
      }
    );

    console.log('Resposta localiza_associado_app_2:', responseAssociado.data);

    // Verificar se o associado foi encontrado
    // A API PHP retorna situacao: 3 quando não encontra o cartão
    if (!responseAssociado.data || responseAssociado.data.situacao === 3 || !responseAssociado.data.matricula) {
      console.log('Cartão não encontrado na base de dados, situacao:', responseAssociado.data?.situacao);
      return NextResponse.json(
        { success: false, message: 'Cartão não encontrado' },
        { status: 404 }
      );
    }

    const dadosAssociado = responseAssociado.data;

    // Verificar se o método de contato está disponível
    if (metodo === 'email' && !dadosAssociado.email) {
      return NextResponse.json(
        { success: false, message: 'E-mail não cadastrado para este cartão' },
        { status: 400 }
      );
    }

    if ((metodo === 'sms' || metodo === 'whatsapp') && !dadosAssociado.cel) {
      return NextResponse.json(
        { success: false, message: 'Celular não cadastrado para este cartão' },
        { status: 400 }
      );
    }

    // Controle mais rigoroso de duplicatas usando múltiplas verificações
    const chaveEnvio = `${cartaoLimpo}_${metodo}`;
    const agora = Date.now();
    
    // 1. Verificar envios recentes (controle de rate limiting)
    if (enviosRecentes[chaveEnvio] && (agora - enviosRecentes[chaveEnvio]) < INTERVALO_MINIMO_ENVIO) {
      const tempoRestante = Math.ceil((INTERVALO_MINIMO_ENVIO - (agora - enviosRecentes[chaveEnvio])) / 1000);
      console.log('Rate limiting ativo, bloqueando novo envio');
      
      return NextResponse.json({
        success: false,
        message: `Aguarde ${tempoRestante} segundos antes de solicitar um novo código.`,
        rateLimited: true
      }, { status: 429 });
    }
    
    // 2. Verificar se já existe um código válido para reutilizar
    const chaveCodigoVerificacao = `${cartaoLimpo}_${metodo}`;
    const codigoExistente = codigosRecuperacao[chaveCodigoVerificacao];
    
    if (codigoExistente && (agora - codigoExistente.timestamp) < 600000) { // 10 minutos
      console.log('Código válido encontrado, reutilizando para evitar duplicata');
      
      // Marcar como enviado recentemente para bloquear próximas tentativas
      enviosRecentes[chaveEnvio] = agora;
      
      return NextResponse.json({
        success: true,
        message: `Código de recuperação enviado com sucesso para o ${metodo === 'email' ? 'e-mail' : metodo === 'sms' ? 'celular via SMS' : 'WhatsApp'} cadastrado.`,
        destino: metodo === 'email' 
          ? mascaraEmail(dadosAssociado.email) 
          : mascaraTelefone(dadosAssociado.cel),
        codigoReutilizado: true
      });
    }

    // Verificar se já existe um código válido para reutilizar (evitar códigos diferentes)
    const chaveCodigoCompleta = `${cartaoLimpo}_${metodo}`;
    let codigo: number;
    
    if (codigosRecuperacao[chaveCodigoCompleta]) {
      // Reutilizar código existente se ainda for válido (menos de 10 minutos)
      const tempoDecorrido = agora - codigosRecuperacao[chaveCodigoCompleta].timestamp;
      if (tempoDecorrido < 600000) { // 10 minutos
        codigo = parseInt(codigosRecuperacao[chaveCodigoCompleta].codigo);
        console.log('Reutilizando código existente para evitar duplicatas:', codigo);
      } else {
        // Código expirado, gerar novo
        codigo = randomInt(100000, 999999);
        console.log('Código anterior expirado, gerando novo:', codigo);
      }
    } else {
      // Não existe código, gerar novo
      codigo = randomInt(100000, 999999);
      console.log('Gerando novo código:', codigo);
    }

    // Marcar envio como iniciado ANTES de fazer a chamada
    enviosRecentes[chaveEnvio] = agora;
    
    // Armazenar/atualizar código localmente
    codigosRecuperacao[chaveCodigoCompleta] = {
      codigo: codigo.toString(),
      timestamp: agora,
      metodo: metodo,
      enviado: false
    };
    
    console.log('Código de recuperação gerado:', {
      cartao: cartaoLimpo,
      codigo: codigo.toString(),
      metodo
    });

    // Enviar código baseado no método escolhido
    try {
      let sucesso = false;
      let errorMessage = '';

      if (metodo === 'email') {
        // Enviar por e-mail
        const paramsEmail = new URLSearchParams();
        paramsEmail.append('email', dadosAssociado.email);
        paramsEmail.append('codigo', codigo.toString());
        paramsEmail.append('nome', dadosAssociado.nome || 'Associado');

        console.log('Enviando código por e-mail para:', mascaraEmail(dadosAssociado.email));

        try {
          const responseEmail = await axios.post(
            'https://sas.makecard.com.br/envia_codigo_email.php',
            paramsEmail,
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              timeout: 15000
            }
          );

          console.log('Resposta do envio de e-mail:', responseEmail.data);

          if (responseEmail.data === 'enviado' || 
              (typeof responseEmail.data === 'object' && responseEmail.data.status === 'success')) {
            sucesso = true;
            codigosRecuperacao[chaveCodigoCompleta].enviado = true;
          } else {
            errorMessage = typeof responseEmail.data === 'string' ? responseEmail.data : 'Erro desconhecido no envio de e-mail';
          }
        } catch (emailError) {
          console.error('Erro específico no envio de email:', emailError);
          errorMessage = emailError instanceof Error ? emailError.message : 'Erro na comunicação com servidor de email';
        }
      } else if (metodo === 'sms') {
        // Enviar por SMS
        const celularLimpo = dadosAssociado.cel.replace(/\D/g, '');
        
        // Validação do celular
        if (celularLimpo.length < 10 || celularLimpo.length > 11) {
          throw new Error('Número de celular inválido');
        }

        const paramsSMS = new URLSearchParams();
        paramsSMS.append('celular', celularLimpo);
        paramsSMS.append('codigo', codigo.toString());
        paramsSMS.append('token', 'seu_token_aqui'); // Adicionar token se necessário

        console.log('Enviando código por SMS para:', mascaraTelefone(dadosAssociado.cel));

        try {
          const responseSMS = await axios.post(
            'https://sas.makecard.com.br/envia_sms.php',
            paramsSMS,
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              timeout: 15000
            }
          );

          console.log('Resposta do envio de SMS:', responseSMS.data);

          if (responseSMS.data === 'enviado' || 
              (typeof responseSMS.data === 'object' && responseSMS.data.status === 'success')) {
            sucesso = true;
            codigosRecuperacao[chaveCodigoCompleta].enviado = true;
          } else {
            errorMessage = typeof responseSMS.data === 'string' ? responseSMS.data : 'Erro desconhecido no envio de SMS';
          }
        } catch (smsError) {
          console.error('Erro específico no envio de SMS:', smsError);
          errorMessage = smsError instanceof Error ? smsError.message : 'Erro na comunicação com servidor de SMS';
        }
      } else if (metodo === 'whatsapp') {
        // Enviar por WhatsApp
        const celularLimpo = dadosAssociado.cel.replace(/\D/g, '');
        
        const paramsWhatsApp = new URLSearchParams();
        paramsWhatsApp.append('celular', celularLimpo);
        paramsWhatsApp.append('codigo', codigo.toString());
        paramsWhatsApp.append('nome', dadosAssociado.nome || 'Associado');

        console.log('Enviando código por WhatsApp para:', mascaraTelefone(dadosAssociado.cel));

        try {
          const responseWhatsApp = await axios.post(
            'https://sas.makecard.com.br/envia_whatsapp.php',
            paramsWhatsApp,
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              timeout: 15000
            }
          );

          console.log('Resposta do envio de WhatsApp:', responseWhatsApp.data);

          if (responseWhatsApp.data === 'enviado' || 
              (typeof responseWhatsApp.data === 'object' && responseWhatsApp.data.status === 'success')) {
            sucesso = true;
            codigosRecuperacao[chaveCodigoCompleta].enviado = true;
          } else {
            errorMessage = typeof responseWhatsApp.data === 'string' ? responseWhatsApp.data : 'Erro desconhecido no envio de WhatsApp';
          }
        } catch (whatsappError) {
          console.error('Erro específico no envio de WhatsApp:', whatsappError);
          errorMessage = whatsappError instanceof Error ? whatsappError.message : 'Erro na comunicação com servidor de WhatsApp';
        }
      }

      if (sucesso) {
        console.log('Código enviado com sucesso via', metodo);
        
        const resposta: RecuperacaoResponse = {
          success: true,
          message: `Código de recuperação enviado com sucesso para o ${metodo === 'email' ? 'e-mail' : metodo === 'sms' ? 'celular via SMS' : 'WhatsApp'} cadastrado.`,
          destino: metodo === 'email' 
            ? mascaraEmail(dadosAssociado.email) 
            : mascaraTelefone(dadosAssociado.cel)
        };
        
        return NextResponse.json(resposta);
      } else {
        console.log('Falha no envio:', errorMessage);
        
        // Remover o código e controle de envio em caso de erro para permitir nova tentativa
        delete codigosRecuperacao[chaveCodigoCompleta];
        delete enviosRecentes[chaveEnvio];
        
        return NextResponse.json(
          { 
            success: false, 
            message: 'Erro ao enviar código de recuperação. Tente novamente.',
            error: errorMessage
          },
          { status: 500 }
        );
      }
    } catch (envioError) {
      console.error('ERRO DETALHADO no envio de código:', {
        error: envioError,
        message: envioError instanceof Error ? envioError.message : String(envioError),
        stack: envioError instanceof Error ? envioError.stack : undefined,
        cartao: cartaoLimpo,
        metodo: metodo,
        timestamp: new Date().toISOString()
      });
      
      // Remover o código e controle de envio em caso de erro para permitir nova tentativa
      delete codigosRecuperacao[chaveCodigoCompleta];
      delete enviosRecentes[chaveEnvio];
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Erro ao enviar código de recuperação. Tente novamente.',
          error: envioError instanceof Error ? envioError.message : String(envioError)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('ERRO DETALHADO na recuperação de senha:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao processar solicitação de recuperação de senha',
        error: error instanceof Error ? error.message : String(error),
        debug: process.env.NODE_ENV === 'development' ? {
          stack: error instanceof Error ? error.stack : undefined
        } : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Mascara o email para exibição, mostrando apenas parte do email
 * Ex: jo***@gm***.com
 */
function mascaraEmail(email: string): string {
  if (!email || email.indexOf('@') === -1) return '***@***.com';
  
  const [usuario, dominio] = email.split('@');
  const dominioPartes = dominio.split('.');
  const extensao = dominioPartes.pop();
  const nomeUsuarioMascarado = usuario.substring(0, 2) + '***';
  const nomeDominioMascarado = dominioPartes.join('.').substring(0, 2) + '***';
  
  return `${nomeUsuarioMascarado}@${nomeDominioMascarado}.${extensao}`;
}

/**
 * Mascara o telefone para exibição, mostrando apenas parte do número
 * Ex: 11***99
 */
function mascaraTelefone(telefone: string): string {
  if (!telefone) return '***';
  
  const numeroLimpo = telefone.replace(/\D/g, '');
  if (numeroLimpo.length < 8) return '***';
  
  const inicio = numeroLimpo.substring(0, 2);
  const fim = numeroLimpo.substring(numeroLimpo.length - 2);
  
  return `${inicio}***${fim}`;
}
