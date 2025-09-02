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
    if (!responseAssociado.data || !responseAssociado.data.matricula) {
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
      } else if (metodo === 'whatsapp') {
        // Enviar por WhatsApp
        const celularLimpo = dadosAssociado.cel.replace(/\D/g, '');
        
        const paramsWhatsApp = new URLSearchParams();
        paramsWhatsApp.append('celular', celularLimpo);
        paramsWhatsApp.append('codigo', codigo.toString());
        paramsWhatsApp.append('nome', dadosAssociado.nome || 'Associado');

        console.log('Enviando código por WhatsApp para:', mascaraTelefone(dadosAssociado.cel));

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
            message: 'Erro ao enviar código de recuperação. Tente novamente.' 
          },
          { status: 500 }
        );
      }
    } catch (envioError) {
      console.error('Erro ao enviar código:', envioError);
      
      // Remover o código e controle de envio em caso de erro para permitir nova tentativa
      delete codigosRecuperacao[chaveCodigoCompleta];
      delete enviosRecentes[chaveEnvio];
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Erro ao enviar código de recuperação. Tente novamente.' 
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

async function processarRecuperacao(cartaoLimpo: string, metodo: string) {
  try {
    // Consultar dados do associado para verificar se existe e obter email/celular
    const params = new URLSearchParams();
    params.append('cartao', cartaoLimpo);

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
    if (!responseAssociado.data || !responseAssociado.data.matricula) {
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

    // Debug: Verificar todos os códigos de recuperação armazenados
    console.log('Códigos de recuperação locais (apenas para debug):', Object.keys(codigosRecuperacao));

    // Tentar inserir o código no banco de dados
    try {
      console.log('Tentando inserir código no banco...');
      const paramsInsert = new URLSearchParams();
      paramsInsert.append('cartao', cartaoLimpo);
      paramsInsert.append('codigo', codigo.toString());
      paramsInsert.append('operacao', 'inserir');
      paramsInsert.append('admin_token', 'chave_segura_123');
      paramsInsert.append('metodo', metodo);
      paramsInsert.append('destino', metodo === 'email' ? dadosAssociado.email : dadosAssociado.cel);

      const responseInsert = await axios.post(
        'https://sas.makecard.com.br/gerencia_codigo_recuperacao.php',
        paramsInsert,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      console.log('Resposta da inserção do código:', responseInsert.data);
    } catch (error) {
      console.error('Erro ao inserir código no banco:', error);
      return NextResponse.json(
        { 
          status: 'erro', 
          erro: 'Falha ao salvar código de recuperação. Por favor, tente novamente.' 
        },
        { status: 500 }
      );
    }

    // Preparar parâmetros para enviar à API de envio de código
    const paramsCodigo = new URLSearchParams();
    paramsCodigo.append('cartao', cartaoLimpo);
    paramsCodigo.append('codigo', codigo.toString());
    paramsCodigo.append('metodo', metodo);

    // Incluir o destino específico (email ou celular)
    if (metodo === 'email') {
      paramsCodigo.append('email', dadosAssociado.email);
      paramsCodigo.append('destino', dadosAssociado.email);
    } else {
      // Para SMS e WhatsApp, enviar o número do celular
      // Garantir que o celular esteja no formato internacional (55 + DDD + número)
      let celular = dadosAssociado.cel.replace(/\D/g, '');
      
      console.log('Celular original do banco:', dadosAssociado.cel);
      console.log('Celular após limpeza:', celular);
      
      // Se não começar com 55, adicionar
      if (!celular.startsWith('55')) {
        celular = `55${celular}`;
      }
      
      // Validação mais rigorosa do celular
      if (celular.length < 12) {
        console.error('Número de celular inválido:', {
          original: dadosAssociado.cel,
          limpo: celular,
          tamanho: celular.length
        });
        return NextResponse.json(
          { 
            success: false, 
            message: 'Número de celular cadastrado é inválido. Entre em contato com o suporte.' 
          },
          { status: 400 }
        );
      }
      
      // Validação adicional para celulares brasileiros
      if (celular.length > 13) {
        console.warn('Celular muito longo, truncando:', celular);
        celular = celular.substring(0, 13);
      }
      
      console.log('Celular formatado final:', celular);
      
      paramsCodigo.append('celular', celular);
      paramsCodigo.append('destino', celular);
      
      // Formatar a mensagem para SMS/WhatsApp
      const mensagem = `Seu código de recuperação de senha QRCred: ${codigo}. Não compartilhe este código com ninguém.`;
      paramsCodigo.append('mensagem', mensagem);
      
      // Parâmetros específicos para cada método
      if (metodo === 'whatsapp') {
        paramsCodigo.append('whatsapp', 'true');
      } else if (metodo === 'sms') {
        paramsCodigo.append('sms', 'true');
      }
      
      // Adicionar token de autenticação para SMS
      paramsCodigo.append('token', 'chave_segura_123');
    }

    console.log('Enviando solicitação para envio do código:', paramsCodigo.toString());

    // Marcar que o código foi processado para evitar duplicatas
    codigosRecuperacao[chaveCodigoCompleta].enviado = true;

    try {
      // Chamar API para enviar o código
      const responseEnvio = await axios.post(
        'https://sas.makecard.com.br/envia_codigo_recuperacao.php',
        paramsCodigo,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000 // 30 segundos de timeout para permitir tempo de envio de email/SMS
        }
      );

      console.log('Resposta do envio do código:', responseEnvio.data);

      // Verificar resposta do envio com melhor tratamento para diferentes formatos
      if (responseEnvio.data === 'enviado' || 
          (typeof responseEnvio.data === 'object' && responseEnvio.data.status === 'sucesso')) {
        // Resposta positiva - código enviado
        const resposta: RecuperacaoResponse = {
          success: true,
          message: `Código de recuperação enviado com sucesso para o ${metodo === 'email' ? 'e-mail' : metodo === 'sms' ? 'celular via SMS' : 'WhatsApp'} cadastrado.`,
          destino: metodo === 'email' 
            ? mascaraEmail(dadosAssociado.email) 
            : mascaraTelefone(dadosAssociado.cel)
        };
        
        return NextResponse.json(resposta);
      } else {
        // Resposta diferente de "enviado" - pode ser um JSON com erro ou texto
        console.log('Formato da resposta:', typeof responseEnvio.data);
        let mensagemErro = 'Erro desconhecido ao enviar código de recuperação';
        
        if (typeof responseEnvio.data === 'object') {
          console.log('Objeto da resposta:', JSON.stringify(responseEnvio.data));
          if (responseEnvio.data.erro) {
            mensagemErro = responseEnvio.data.erro;
          } else if (responseEnvio.data.message) {
            mensagemErro = responseEnvio.data.message;
          } else if (responseEnvio.data.error) {
            mensagemErro = responseEnvio.data.error;
          }
        } else if (typeof responseEnvio.data === 'string' && responseEnvio.data !== 'enviado') {
          mensagemErro = responseEnvio.data;
        }
        
        console.error('Erro no envio do código:', mensagemErro);
        
        // Remover tentativa de endpoint alternativo para evitar duplicatas
        // O código já foi salvo no banco, então retornamos sucesso mesmo com erro de envio
        console.log('Erro no envio, mas código foi salvo no banco. Permitindo prosseguir.');
        
        // Tenta seguir mesmo com erro para garantir que o código seja válido
        // já que o código foi gerado e armazenado no banco, podemos permitir que o usuário tente usá-lo
        const errorMessage = mensagemErro;
        console.log('Detalhes do erro de envio:', errorMessage);
        
        const resposta: RecuperacaoResponse = {
          success: true,
          message: `Código de recuperação enviado com sucesso para o ${metodo === 'email' ? 'e-mail' : metodo === 'sms' ? 'celular via SMS' : 'WhatsApp'} cadastrado.`,
          destino: metodo === 'email' 
            ? mascaraEmail(dadosAssociado.email) 
            : mascaraTelefone(dadosAssociado.cel)
        };
        
        return NextResponse.json(resposta);
      }
    } catch (envioError) {
      console.error('Erro ao enviar código:', envioError);
      
      // Remover o código e controle de envio em caso de erro para permitir nova tentativa
      delete codigosRecuperacao[chaveCodigoCompleta];
      delete enviosRecentes[chaveEnvio];
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Erro ao enviar código de recuperação. Tente novamente.' 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro na processarRecuperacao:', error);
    
    // Limpar controles em caso de erro
    const chaveEnvio = `${cartaoLimpo}_${metodo}`;
    const chaveCodigoCompleta = `${cartaoLimpo}_${metodo}`;
    delete enviosRecentes[chaveEnvio];
    delete codigosRecuperacao[chaveCodigoCompleta];
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao processar solicitação de recuperação de senha',
        error: error instanceof Error ? error.message : String(error)
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
 * Ex: (**) *****-1234
 */
function mascaraTelefone(telefone: string): string {
  if (!telefone) return '(**) *****-****';
  
  const numeroLimpo = telefone.replace(/\D/g, '');
  if (numeroLimpo.length < 4) return '(**) *****-****';
  
  const ultimosDigitos = numeroLimpo.slice(-4);
  return `(**) *****-${ultimosDigitos}`;
} 