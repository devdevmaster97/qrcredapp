import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { randomInt } from 'crypto';

// Armazenamento em memória para controle de rate limiting
const enviosRecentes: { [key: string]: number } = {};
const INTERVALO_MINIMO_ENVIO = 60000; // 1 minuto em milissegundos

// Controle de requisições em andamento para evitar duplicatas
const requisicoesEmAndamento: { [key: string]: Promise<any> } = {};

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

    // Controle de requisições simultâneas
    const chaveEnvio = `${cartaoLimpo}_${metodo}`;
    const agora = Date.now();
    
    // Verificar se já existe uma requisição em andamento para este cartão/método
    if (chaveEnvio in requisicoesEmAndamento) {
      console.log('⚠️ Requisição já em andamento para:', chaveEnvio);
      try {
        // Aguardar a requisição em andamento
        const resultado = await requisicoesEmAndamento[chaveEnvio];
        return resultado;
      } catch (error) {
        console.error('Erro na requisição em andamento:', error);
        delete requisicoesEmAndamento[chaveEnvio];
      }
    }
    
    // Rate limiting
    if (enviosRecentes[chaveEnvio] && (agora - enviosRecentes[chaveEnvio]) < INTERVALO_MINIMO_ENVIO) {
      const tempoRestante = Math.ceil((INTERVALO_MINIMO_ENVIO - (agora - enviosRecentes[chaveEnvio])) / 1000);
      return NextResponse.json({
        success: false,
        message: `Aguarde ${tempoRestante} segundos antes de solicitar um novo código.`
      }, { status: 429 });
    }

    // Marcar requisição como em andamento ANTES de processar
    const promiseRequisicao = processarRecuperacao(cartaoLimpo, metodo, agora);
    requisicoesEmAndamento[chaveEnvio] = promiseRequisicao;
    
    try {
      const resultado = await promiseRequisicao;
      return resultado;
    } finally {
      // Limpar requisição em andamento
      delete requisicoesEmAndamento[chaveEnvio];
    }
  } catch (error) {
    console.error('=== ERRO GERAL CAPTURADO ===');
    console.error('Timestamp:', new Date().toISOString());
    console.error('Erro:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    
    // Identificar em que etapa o erro ocorreu
    let etapaErro = 'Desconhecida';
    if (error instanceof Error) {
      if (error.message.includes('JSON.parse')) {
        etapaErro = 'Parse do JSON de entrada';
      } else if (error.message.includes('localiza_associado')) {
        etapaErro = 'Busca do associado (localiza_associado_app_cartao.php)';
      } else if (error.message.includes('envia_codigo_recuperacao')) {
        etapaErro = 'Envio do código (envia_codigo_recuperacao.php)';
      } else if (error.message.includes('axios')) {
        etapaErro = 'Requisição HTTP (axios)';
      } else if (error.message.includes('timeout')) {
        etapaErro = 'Timeout na requisição';
      }
    }
    
    console.error('Etapa do erro:', etapaErro);
    console.error('===============================');
    
    return NextResponse.json(
      { 
        success: false, 
        message: `Erro interno do servidor na etapa: ${etapaErro}`,
        debug: {
          etapa: etapaErro,
          erro: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

/**
 * Processa a recuperação de senha
 */
async function processarRecuperacao(cartaoLimpo: string, metodo: string, agora: number) {
  try {

    const chaveEnvio = `${cartaoLimpo}_${metodo}`;

    // Buscar dados do associado
    console.log('=== ETAPA 1: BUSCAR DADOS DO ASSOCIADO ===');
    console.log('Buscando dados do associado...');
    console.log('URL:', 'https://sas.makecard.com.br/localiza_associado_app_cartao.php');
    console.log('Cartão enviado:', cartaoLimpo);
    
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
      console.log('✅ SUCESSO - Resposta associado:', responseAssociado.data);
      console.log('Status HTTP:', responseAssociado.status);
    } catch (apiError) {
      console.error('❌ ERRO NA API LOCALIZA_ASSOCIADO_APP_CARTAO.PHP');
      console.error('Detalhes do erro:', apiError);
      console.error('Axios error details:', {
        message: apiError instanceof Error ? apiError.message : String(apiError),
        code: (apiError as any)?.code,
        response: (apiError as any)?.response?.data
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Erro ao conectar com localiza_associado_app_cartao.php',
          debug: {
            api: 'localiza_associado_app_cartao.php',
            erro: apiError instanceof Error ? apiError.message : String(apiError)
          }
        },
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
    let respostaAPI = null;

    try {
      console.log('=== ETAPA 2: ENVIAR CÓDIGO ===');
      console.log(`Iniciando envio por ${metodo}...`);
      console.log('URL de envio:', 'https://sas.makecard.com.br/envia_codigo_recuperacao.php');
      
      if (metodo === 'email') {
        console.log('📧 Enviando por email...');
        console.log('Email destino:', dadosAssociado.email);
        
        const paramsEmail = new URLSearchParams();
        paramsEmail.append('cartao', cartaoLimpo);
        paramsEmail.append('metodo', 'email');
        paramsEmail.append('codigo', codigo.toString());
        paramsEmail.append('email', dadosAssociado.email);
        paramsEmail.append('celular', dadosAssociado.cel || '');

        console.log('Parâmetros enviados para API de email:', {
          cartao: cartaoLimpo,
          metodo: 'email',
          codigo: codigo.toString(),
          email: dadosAssociado.email,
          celular: dadosAssociado.cel || ''
        });

        try {
          console.log('🔄 Fazendo requisição para envia_codigo_recuperacao.php (EMAIL)...');
          const responseEmail = await axios.post(
            'https://sas.makecard.com.br/envia_codigo_recuperacao.php',
            paramsEmail,  
            {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              timeout: 15000
            }
          );

          console.log('✅ Resposta da API de email:', responseEmail.data);
          console.log('Status HTTP email:', responseEmail.status);
          console.log('Tipo da resposta:', typeof responseEmail.data);
          console.log('Resposta como string:', String(responseEmail.data));
          console.log('Resposta serializada:', JSON.stringify(responseEmail.data));
          
          // Armazenar resposta para debug
          respostaAPI = responseEmail.data;
          
          // A API PHP retorna "enviado" para sucesso ou JSON para erro
          // Remover espaços extras da resposta
          const respostaTratada = typeof responseEmail.data === 'string' ? responseEmail.data.trim() : responseEmail.data;
          sucesso = respostaTratada === 'enviado';
          
          // Se não for "enviado", verificar se é um JSON de erro
          if (!sucesso && typeof responseEmail.data === 'object' && responseEmail.data.erro) {
            console.error('❌ API retornou erro:', responseEmail.data.erro);
            throw new Error(`API PHP retornou erro: ${responseEmail.data.erro}`);
          } else if (!sucesso) {
            console.error('❌ Resposta inesperada da API:', responseEmail.data);
          }
        } catch (emailError) {
          console.error('❌ ERRO ESPECÍFICO NA API DE EMAIL (envia_codigo_recuperacao.php)');
          console.error('Detalhes do erro email:', emailError);
          console.error('Axios email error:', {
            message: emailError instanceof Error ? emailError.message : String(emailError),
            code: (emailError as any)?.code,
            response: (emailError as any)?.response?.data,
            status: (emailError as any)?.response?.status
          });
          const errorMsg = emailError instanceof Error ? emailError.message : String(emailError);
          throw new Error(`Falha na API envia_codigo_recuperacao.php (EMAIL): ${errorMsg}`);
        }

      } else if (metodo === 'sms') {
        console.log('📱 Enviando por SMS...');
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

        console.log('Parâmetros enviados para API de SMS:', {
          cartao: cartaoLimpo,
          metodo: 'sms',
          codigo: codigo.toString(),
          email: dadosAssociado.email || '',
          celular: celularFormatado
        });

        try {
          console.log('🔄 Fazendo requisição para envia_codigo_recuperacao.php (SMS)...');
          const responseSMS = await axios.post(
            'https://sas.makecard.com.br/envia_codigo_recuperacao.php',
            paramsSMS,
            {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              timeout: 15000
            }
          );

          console.log('✅ Resposta da API de SMS:', responseSMS.data);
          console.log('Status HTTP SMS:', responseSMS.status);
          console.log('Tipo da resposta SMS:', typeof responseSMS.data);
          
          // Armazenar resposta para debug
          respostaAPI = responseSMS.data;
          
          // A API PHP retorna "enviado" para sucesso ou JSON para erro
          // Remover espaços extras da resposta
          const respostaTratadaSMS = typeof responseSMS.data === 'string' ? responseSMS.data.trim() : responseSMS.data;
          sucesso = respostaTratadaSMS === 'enviado';
          
          // Se não for "enviado", verificar se é um JSON de erro
          if (!sucesso && typeof responseSMS.data === 'object' && responseSMS.data.erro) {
            console.error('❌ API retornou erro:', responseSMS.data.erro);
            throw new Error(`API PHP retornou erro: ${responseSMS.data.erro}`);
          } else if (!sucesso) {
            console.error('❌ Resposta inesperada da API:', responseSMS.data);
          }
        } catch (smsError) {
          console.error('❌ ERRO ESPECÍFICO NA API DE SMS (envia_codigo_recuperacao.php)');
          console.error('Detalhes do erro SMS:', smsError);
          console.error('Axios SMS error:', {
            message: smsError instanceof Error ? smsError.message : String(smsError),
            code: (smsError as any)?.code,
            response: (smsError as any)?.response?.data,
            status: (smsError as any)?.response?.status
          });
          const errorMsg = smsError instanceof Error ? smsError.message : String(smsError);
          throw new Error(`Falha na API envia_codigo_recuperacao.php (SMS): ${errorMsg}`);
        }

      } else if (metodo === 'whatsapp') {
        console.log('💬 Enviando por WhatsApp...');
        const celularLimpo = dadosAssociado.cel.replace(/\D/g, '');
        console.log('Celular WhatsApp original:', dadosAssociado.cel, 'Limpo:', celularLimpo);
        
        const paramsWhatsApp = new URLSearchParams();
        paramsWhatsApp.append('cartao', cartaoLimpo);
        paramsWhatsApp.append('metodo', 'whatsapp');
        paramsWhatsApp.append('codigo', codigo.toString());
        paramsWhatsApp.append('email', dadosAssociado.email || '');
        paramsWhatsApp.append('celular', celularLimpo);

        console.log('Parâmetros enviados para API de WhatsApp:', {
          cartao: cartaoLimpo,
          metodo: 'whatsapp',
          codigo: codigo.toString(),
          email: dadosAssociado.email || '',
          celular: celularLimpo
        });

        try {
          console.log('🔄 Fazendo requisição para envia_codigo_recuperacao.php (WHATSAPP)...');
          const responseWhatsApp = await axios.post(
            'https://sas.makecard.com.br/envia_codigo_recuperacao.php',
            paramsWhatsApp,
            {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              timeout: 15000
            }
          );

          console.log('✅ Resposta da API de WhatsApp:', responseWhatsApp.data);
          console.log('Status HTTP WhatsApp:', responseWhatsApp.status);
          console.log('Tipo da resposta WhatsApp:', typeof responseWhatsApp.data);
          
          // Armazenar resposta para debug
          respostaAPI = responseWhatsApp.data;
          
          // A API PHP retorna "enviado" para sucesso ou JSON para erro
          // Remover espaços extras da resposta
          const respostaTratadaWhatsApp = typeof responseWhatsApp.data === 'string' ? responseWhatsApp.data.trim() : responseWhatsApp.data;
          sucesso = respostaTratadaWhatsApp === 'enviado';
          
          // Se não for "enviado", verificar se é um JSON de erro
          if (!sucesso && typeof responseWhatsApp.data === 'object' && responseWhatsApp.data.erro) {
            console.error('❌ API retornou erro:', responseWhatsApp.data.erro);
            throw new Error(`API PHP retornou erro: ${responseWhatsApp.data.erro}`);
          } else if (!sucesso) {
            console.error('❌ Resposta inesperada da API:', responseWhatsApp.data);
          }
        } catch (whatsappError) {
          console.error('❌ ERRO ESPECÍFICO NA API DE WHATSAPP (envia_codigo_recuperacao.php)');
          console.error('Detalhes do erro WhatsApp:', whatsappError);
          console.error('Axios WhatsApp error:', {
            message: whatsappError instanceof Error ? whatsappError.message : String(whatsappError),
            code: (whatsappError as any)?.code,
            response: (whatsappError as any)?.response?.data,
            status: (whatsappError as any)?.response?.status
          });
          const errorMsg = whatsappError instanceof Error ? whatsappError.message : String(whatsappError);
          throw new Error(`Falha na API envia_codigo_recuperacao.php (WHATSAPP): ${errorMsg}`);
        }
      }

      console.log('=== VERIFICANDO RESULTADO DO ENVIO ===');
      console.log('Sucesso:', sucesso);
      console.log('Método:', metodo);
      
      if (sucesso) {
        codigosRecuperacao[chaveCodigoCompleta].enviado = true;
        console.log('✅ Código enviado com sucesso - Retornando resposta positiva');
        
        return NextResponse.json({
          success: true,
          message: `Código enviado para o ${metodo === 'email' ? 'e-mail' : metodo === 'sms' ? 'celular via SMS' : 'WhatsApp'} cadastrado.`,
          destino: metodo === 'email' 
            ? mascaraEmail(dadosAssociado.email) 
            : mascaraTelefone(dadosAssociado.cel)
        });
      } else {
        console.error('❌ FALHA NO ENVIO - RESPOSTA INESPERADA');
        console.error('API:', 'envia_codigo_recuperacao.php');
        console.error('Método:', metodo);
        console.error('Resposta esperada: "enviado"');
        console.error('Resposta recebida (VALOR EXATO):', JSON.stringify(respostaAPI));
        console.error('Tipo da resposta:', typeof respostaAPI);
        console.error('Sucesso:', sucesso);
        console.error('Comparação direta:', `"${respostaAPI}" === "enviado"`, respostaAPI === 'enviado');
        
        // Se o email foi enviado mas a API não retornou "enviado", 
        // pode ser um problema na inserção do código no banco
        if (metodo === 'email') {
          console.error('🚨 EMAIL FOI ENVIADO MAS API NÃO RETORNOU "enviado"');
          console.error('Possível problema: Inserção do código no banco PostgreSQL falhou');
          console.error('Verifique o arquivo recuperacao_debug.log no servidor PHP');
        }
        
        // Limpar controles para permitir nova tentativa
        const chaveCodigoCompleta = `${cartaoLimpo}_${metodo}`;
        delete codigosRecuperacao[chaveCodigoCompleta];
        delete enviosRecentes[chaveEnvio];
        
        return NextResponse.json(
          { 
            success: false, 
            message: `API envia_codigo_recuperacao.php (${metodo.toUpperCase()}) - Email enviado mas resposta inesperada: "${respostaAPI}"`,
            debug: {
              api: 'envia_codigo_recuperacao.php',
              metodo: metodo,
              resposta_esperada: 'enviado',
              resposta_recebida: respostaAPI,
              tipo_resposta: typeof respostaAPI,
              comparacao: `"${respostaAPI}" === "enviado"`,
              resultado_comparacao: respostaAPI === 'enviado'
            }
          },
          { status: 500 }
        );
      }

    } catch (envioError) {
      console.error('=== ERRO DETALHADO NO ENVIO ===');
      console.error('Método:', metodo);
      console.error('Cartão:', cartaoLimpo);
      console.error('Dados do associado:', dadosAssociado);
      console.error('Erro completo:', envioError);
      console.error('Stack trace:', envioError instanceof Error ? envioError.stack : 'N/A');
      
      // Identificar qual API causou o erro
      let apiErro = 'Desconhecida';
      if (envioError instanceof Error) {
        if (envioError.message.includes('localiza_associado_app_cartao')) {
          apiErro = 'localiza_associado_app_cartao.php';
        } else if (envioError.message.includes('envia_codigo_recuperacao')) {
          apiErro = 'envia_codigo_recuperacao.php';
        } else if (envioError.message.includes('email')) {
          apiErro = 'envia_codigo_recuperacao.php (email)';
        } else if (envioError.message.includes('SMS')) {
          apiErro = 'envia_codigo_recuperacao.php (SMS)';
        } else if (envioError.message.includes('WhatsApp')) {
          apiErro = 'envia_codigo_recuperacao.php (WhatsApp)';
        }
      }
      
      console.error('API que causou o erro:', apiErro);
      console.error('================================');
      
      // Limpar controles
      const chaveCodigoCompleta = `${cartaoLimpo}_${metodo}`;
      delete codigosRecuperacao[chaveCodigoCompleta];
      delete enviosRecentes[chaveEnvio];
      
      return NextResponse.json(
        { 
          success: false, 
          message: `Erro ao enviar código via ${metodo}. API: ${apiErro}. Tente novamente.`,
          debug: {
            metodo,
            api: apiErro,
            erro: envioError instanceof Error ? envioError.message : String(envioError)
          }
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('=== ERRO GERAL CAPTURADO ===');
    console.error('Timestamp:', new Date().toISOString());
    console.error('Erro:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    
    // Identificar em que etapa o erro ocorreu
    let etapaErro = 'Desconhecida';
    if (error instanceof Error) {
      if (error.message.includes('JSON.parse')) {
        etapaErro = 'Parse do JSON de entrada';
      } else if (error.message.includes('localiza_associado')) {
        etapaErro = 'Busca do associado (localiza_associado_app_cartao.php)';
      } else if (error.message.includes('envia_codigo_recuperacao')) {
        etapaErro = 'Envio do código (envia_codigo_recuperacao.php)';
      } else if (error.message.includes('axios')) {
        etapaErro = 'Requisição HTTP (axios)';
      } else if (error.message.includes('timeout')) {
        etapaErro = 'Timeout na requisição';
      }
    }
    
    console.error('Etapa do erro:', etapaErro);
    console.error('===============================');
    
    return NextResponse.json(
      { 
        success: false, 
        message: `Erro interno do servidor na etapa: ${etapaErro}`,
        debug: {
          etapa: etapaErro,
          erro: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      },
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
