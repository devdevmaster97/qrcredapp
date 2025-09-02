import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { randomInt } from 'crypto';

// Armazenamento em memória para controle de rate limiting
const enviosRecentes: { [key: string]: number } = {};
const INTERVALO_MINIMO_ENVIO = 60000; // 1 minuto em milissegundos

// Armazenamento em memória para códigos de recuperação
export const codigosRecuperacao: { [key: string]: { codigo: string; timestamp: number; metodo: string; enviado: boolean } } = {};

/**
 * API simplificada para recuperação de senha
 */
export async function POST(request: NextRequest) {
  console.log('=== RECUPERAÇÃO SENHA SIMPLIFICADA ===');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    // Parse do JSON
    const body = await request.text();
    console.log('Body recebido:', body);
    
    let parsedData;
    try {
      parsedData = JSON.parse(body);
    } catch (parseError) {
      console.error('Erro ao parsear JSON:', parseError);
      return NextResponse.json(
        { success: false, message: 'Dados inválidos' },
        { status: 400 }
      );
    }
    
    const { cartao, metodo } = parsedData;
    console.log('Dados parseados:', { cartao, metodo });

    // Validações básicas
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
    console.log('Cartão limpo:', cartaoLimpo);

    // Rate limiting
    const chaveEnvio = `${cartaoLimpo}_${metodo}`;
    const agora = Date.now();
    
    if (enviosRecentes[chaveEnvio] && (agora - enviosRecentes[chaveEnvio]) < INTERVALO_MINIMO_ENVIO) {
      const tempoRestante = Math.ceil((INTERVALO_MINIMO_ENVIO - (agora - enviosRecentes[chaveEnvio])) / 1000);
      return NextResponse.json({
        success: false,
        message: `Aguarde ${tempoRestante} segundos antes de solicitar um novo código.`
      }, { status: 429 });
    }

    // Buscar dados do associado
    console.log('Buscando dados do associado...');
    const params = new URLSearchParams();
    params.append('cartao', cartaoLimpo);

    let responseAssociado;
    try {
      responseAssociado = await axios.post(
        'https://sas.makecard.com.br/localiza_associado_app_cartao.php',
        params,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000
        }
      );
      console.log('Resposta associado:', responseAssociado.data);
    } catch (apiError) {
      console.error('Erro na API externa:', apiError);
      return NextResponse.json(
        { success: false, message: 'Erro ao conectar com o servidor' },
        { status: 503 }
      );
    }

    // Verificar se associado foi encontrado
    if (!responseAssociado.data || responseAssociado.data.situacao === 3 || !responseAssociado.data.matricula) {
      console.log('Cartão não encontrado, situacao:', responseAssociado.data?.situacao);
      return NextResponse.json(
        { success: false, message: 'Cartão não encontrado' },
        { status: 404 }
      );
    }

    const dadosAssociado = responseAssociado.data;

    // Verificar se método está disponível
    if (metodo === 'email' && !dadosAssociado.email) {
      return NextResponse.json(
        { success: false, message: 'E-mail não cadastrado' },
        { status: 400 }
      );
    }

    if ((metodo === 'sms' || metodo === 'whatsapp') && !dadosAssociado.cel) {
      return NextResponse.json(
        { success: false, message: 'Celular não cadastrado' },
        { status: 400 }
      );
    }

    // Gerar código
    const codigo = randomInt(100000, 999999);
    console.log('Código gerado:', codigo);

    // Marcar envio
    enviosRecentes[chaveEnvio] = agora;
    
    // Armazenar código
    const chaveCodigoCompleta = `${cartaoLimpo}_${metodo}`;
    codigosRecuperacao[chaveCodigoCompleta] = {
      codigo: codigo.toString(),
      timestamp: agora,
      metodo: metodo,
      enviado: false
    };

    // Enviar código
    let sucesso = false;
    let errorMessage = '';

    try {
      console.log(`Iniciando envio por ${metodo}...`);
      
      if (metodo === 'email') {
        console.log('Enviando por email...');
        console.log('Email destino:', dadosAssociado.email);
        
        const paramsEmail = new URLSearchParams();
        paramsEmail.append('cartao', cartaoLimpo);
        paramsEmail.append('metodo', 'email');
        paramsEmail.append('codigo', codigo.toString());
        paramsEmail.append('email', dadosAssociado.email);
        paramsEmail.append('celular', dadosAssociado.cel || '');

        try {
          const responseEmail = await axios.post(
            'https://sas.makecard.com.br/envia_codigo_recuperacao.php',
            paramsEmail,  
            {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              timeout: 15000
            }
          );

          console.log('Resposta email:', responseEmail.data);
          sucesso = responseEmail.data === 'enviado' || 
                    (typeof responseEmail.data === 'object' && responseEmail.data.status === 'success');
        } catch (emailError) {
          console.error('Erro específico no envio de email:', emailError);
          const errorMsg = emailError instanceof Error ? emailError.message : String(emailError);
          throw new Error(`Falha no envio de email: ${errorMsg}`);
        }

      } else if (metodo === 'sms') {
        console.log('Enviando por SMS...');
        const celularLimpo = dadosAssociado.cel.replace(/\D/g, '');
        console.log('Celular original:', dadosAssociado.cel, 'Limpo:', celularLimpo);
        
        if (celularLimpo.length < 10 || celularLimpo.length > 13) {
          throw new Error(`Número de celular inválido: ${celularLimpo} (${celularLimpo.length} dígitos)`);
        }

        let celularFormatado = celularLimpo;
        if (!celularFormatado.startsWith('55') && celularFormatado.length >= 10) {
          celularFormatado = '55' + celularFormatado;
        }
        console.log('Celular formatado:', celularFormatado);

        const paramsSMS = new URLSearchParams();
        paramsSMS.append('cartao', cartaoLimpo);
        paramsSMS.append('metodo', 'sms');
        paramsSMS.append('codigo', codigo.toString());
        paramsSMS.append('email', dadosAssociado.email || '');
        paramsSMS.append('celular', celularFormatado);

        try {
          const responseSMS = await axios.post(
            'https://sas.makecard.com.br/envia_codigo_recuperacao.php',
            paramsSMS,
            {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              timeout: 15000
            }
          );

          console.log('Resposta SMS:', responseSMS.data);
          sucesso = responseSMS.data === 'enviado' || 
                    (typeof responseSMS.data === 'object' && responseSMS.data.status === 'success');
        } catch (smsError) {
          console.error('Erro específico SMS:', smsError);
          const errorMsg = smsError instanceof Error ? smsError.message : String(smsError);
          throw new Error(`Falha no envio de SMS: ${errorMsg}`);
        }

      } else if (metodo === 'whatsapp') {
        console.log('Enviando por WhatsApp...');
        const celularLimpo = dadosAssociado.cel.replace(/\D/g, '');
        console.log('Celular WhatsApp:', celularLimpo);
        
        const paramsWhatsApp = new URLSearchParams();
        paramsWhatsApp.append('cartao', cartaoLimpo);
        paramsWhatsApp.append('metodo', 'whatsapp');
        paramsWhatsApp.append('codigo', codigo.toString());
        paramsWhatsApp.append('email', dadosAssociado.email || '');
        paramsWhatsApp.append('celular', celularLimpo);

        try {
          const responseWhatsApp = await axios.post(
            'https://sas.makecard.com.br/envia_codigo_recuperacao.php',
            paramsWhatsApp,
            {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              timeout: 15000
            }
          );

          console.log('Resposta WhatsApp:', responseWhatsApp.data);
          sucesso = responseWhatsApp.data === 'enviado' || 
                    (typeof responseWhatsApp.data === 'object' && responseWhatsApp.data.status === 'success');
        } catch (whatsappError) {
          console.error('Erro específico WhatsApp:', whatsappError);
          const errorMsg = whatsappError instanceof Error ? whatsappError.message : String(whatsappError);
          throw new Error(`Falha no envio de WhatsApp: ${errorMsg}`);
        }
      }

      if (sucesso) {
        codigosRecuperacao[chaveCodigoCompleta].enviado = true;
        console.log('Código enviado com sucesso');
        
        return NextResponse.json({
          success: true,
          message: `Código enviado para o ${metodo === 'email' ? 'e-mail' : metodo === 'sms' ? 'celular via SMS' : 'WhatsApp'} cadastrado.`,
          destino: metodo === 'email' 
            ? mascaraEmail(dadosAssociado.email) 
            : mascaraTelefone(dadosAssociado.cel)
        });
      } else {
        console.log('Falha no envio');
        // Limpar controles para permitir nova tentativa
        delete codigosRecuperacao[chaveCodigoCompleta];
        delete enviosRecentes[chaveEnvio];
        
        return NextResponse.json(
          { success: false, message: 'Erro ao enviar código. Tente novamente.' },
          { status: 500 }
        );
      }

    } catch (envioError) {
      console.error('Erro no envio:', envioError);
      
      // Limpar controles
      delete codigosRecuperacao[chaveCodigoCompleta];
      delete enviosRecentes[chaveEnvio];
      
      return NextResponse.json(
        { success: false, message: 'Erro ao enviar código. Tente novamente.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Erro geral:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * Mascara o email para exibição
 */
function mascaraEmail(email: string): string {
  if (!email || email.indexOf('@') === -1) return '***@***.com';
  
  const [usuario, dominio] = email.split('@');
  const dominioPartes = dominio.split('.');
  const extensao = dominioPartes.pop() || '';
  const nomeUsuarioMascarado = usuario.substring(0, Math.min(2, usuario.length)) + '***';
  const nomeDominioMascarado = dominioPartes.join('.').substring(0, Math.min(2, dominioPartes.join('.').length)) + '***';
  
  return `${nomeUsuarioMascarado}@${nomeDominioMascarado}.${extensao}`;
}

/**
 * Mascara o telefone para exibição
 */
function mascaraTelefone(telefone: string): string {
  if (!telefone) return '(**) *****-****';
  
  const numeroLimpo = telefone.replace(/\D/g, '');
  if (numeroLimpo.length < 4) return '(**) *****-****';
  
  const ultimosDigitos = numeroLimpo.slice(-4);
  return `(**) *****-${ultimosDigitos}`;
}
