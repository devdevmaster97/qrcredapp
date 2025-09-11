import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const usuario = body.usuario;
    const senha = body.senha;

    // Log para diagnóstico (mesmo padrão do login do associado)
    console.log('API local recebeu requisição de login para usuário:', usuario);

    // Verificar se os dados estão presentes
    if (!usuario || !senha) {
      console.log('Erro: Usuário ou senha ausentes');
      return NextResponse.json(
        { success: false, message: 'Usuário e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Preparar os dados para enviar ao backend (valores SEM aspas como no banco)
    const payload = new URLSearchParams();
    payload.append('userconv', String(usuario).trim());
    payload.append('passconv', String(senha).trim());
    
    // DEBUG: Valores corretos do banco (SEM aspas)
    console.log('🔍 Valores corretos do banco:', {
      banco_usuario_texto: 'sascred',
      banco_password: '123456',
      enviando_usuario: usuario,
      enviando_senha: senha
    });

    console.log('Enviando para o backend:', payload.toString());

    // 🧪 TESTE: Verificar se a API PHP está funcionando
    console.log('🔗 Testando API PHP diretamente...');
    
    // Enviar a requisição para o backend com configurações otimizadas para dispositivos Xiaomi
    const response = await axios.post(
      'https://sas.makecard.com.br/convenio_autenticar_app.php',
      payload,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'SasApp/1.0',
        },
        timeout: 15000, // 15 segundos de timeout para dispositivos mais lentos
        validateStatus: () => true, // Aceitar todas as respostas para melhor diagnóstico
        transformResponse: [(data) => {
          // Tratamento robusto da resposta para compatibilidade com Xiaomi
          try {
            console.log('🔄 Transform Response - Dados recebidos (tipo):', typeof data);
            console.log('🔄 Transform Response - Tamanho:', data ? data.length || 'N/A' : 'null');
            
            // Se já é um objeto, retornar como está
            if (typeof data === 'object') {
              console.log('✅ Dados já são objeto, retornando direto');
              return data;
            }
            
            // Se é string, tentar fazer parse
            if (typeof data === 'string') {
              console.log('🔄 Dados são string, tentando limpar e fazer parse...');
              console.log('📄 String original (primeiros 200 chars):', data.substring(0, 200));
              
              // Múltiplas estratégias de limpeza para remover warnings PHP
              let cleanData = data;
              
              // 1. Remover warnings PHP (Deprecated, Notice, etc.) do início
              cleanData = data.replace(/<br\s*\/?>\s*<b>(?:Deprecated|Notice|Warning|Fatal error)[^}]*?<\/b>[^}]*?<br\s*\/?>/gi, '');
              cleanData = cleanData.replace(/<br\s*\/?>/gi, '');
              cleanData = cleanData.trim();
              
              // 2. Extrair JSON válido
              const regexMatch = cleanData.match(/({.*})/);
              if (regexMatch) {
                cleanData = regexMatch[1];
                console.log('✅ JSON extraído via regex após limpeza de warnings');
              } else {
                // 3. Buscar manualmente por { e }
                const startIndex = cleanData.indexOf('{');
                const endIndex = cleanData.lastIndexOf('}');
                if (startIndex !== -1 && endIndex !== -1) {
                  cleanData = cleanData.substring(startIndex, endIndex + 1);
                  console.log('✅ JSON extraído manualmente após limpeza');
                } else {
                  console.log('❌ Não foi possível encontrar JSON válido na resposta');
                }
              }
              
              console.log('🧹 Dados limpos (primeiros 200 chars):', cleanData.substring(0, 200));
              
              // Tentar parse do JSON limpo
              const parsedData = JSON.parse(cleanData);
              console.log('✅ Parse bem-sucedido');
              return parsedData;
            }
            
            console.log('⚠️ Tipo de dados não reconhecido, retornando como está');
            return data;
          } catch (parseError) {
            console.error('❌ Erro no parse da resposta:', parseError);
            console.log('📄 Dados brutos completos para debug:', data);
            return { erro_parse: true, dados_brutos: data, erro_detalhes: parseError instanceof Error ? parseError.message : String(parseError) };
          }
        }]
      }
    );
    
    console.log('🔍 Status da resposta HTTP:', response.status);
    console.log('🔍 Headers da resposta:', response.headers);
    console.log('🔍 Tipo da resposta:', typeof response.data);
    console.log('🔍 Tamanho da resposta:', JSON.stringify(response.data).length);

    // Log completo da resposta (mesmo padrão do login do associado)
    console.log('Resposta completa do backend:', JSON.stringify(response.data));
    console.log('🔍 Resposta RAW da API PHP:', response.data);
    console.log('🔍 Tipo da resposta:', typeof response.data);

    // Verificar se houve erro no parse da resposta (específico para dispositivos Xiaomi)
    if (response.data && response.data.erro_parse) {
      console.log('❌ Erro no parse da resposta - dados brutos:', response.data.dados_brutos);
      console.log('📄 Conteúdo bruto completo para análise:');
      console.log(response.data.dados_brutos);
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Erro no formato da resposta do servidor',
          debug: {
            erro: 'Parse JSON falhou',
            dados_brutos: response.data.dados_brutos,
            device_info: 'Possível problema de compatibilidade com dispositivo',
            usuario_tentativa: usuario,
            timestamp: new Date().toISOString()
          }
        },
        { status: 500 }
      );
    }

    // Verificação básica da resposta (mesmo padrão do login do associado)
    if (!response.data || typeof response.data !== 'object') {
      console.log('Resposta inválida do backend');
      return NextResponse.json(
        { success: false, message: 'Resposta inválida do servidor' },
        { status: 500 }
      );
    }

    // Verificar se tem os campos de login (específico para convênio)
    if (!response.data.tipo_login) {
      console.log('❌ Resposta sem campo tipo_login - analisando problema');
      console.log('📊 Análise detalhada:', {
        tem_mes_corrente: !!response.data.mes_corrente,
        campos_presentes: Object.keys(response.data),
        possivel_problema: 'Primeira consulta (c_senhaconvenio) funcionou, segunda (convenio) falhou'
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Usuário encontrado mas convênio pode estar inativo. Verifique se cod_convenio existe na tabela convenio com divulga = S',
          debug: {
            responseData: response.data,
            parametrosEnviados: payload.toString(),
            analise: 'API PHP executou primeira consulta (mes_corrente presente) mas não a segunda (convenio)'
          }
        },
        { status: 500 }
      );
    }

    // Processar resposta de login bem-sucedido
    if (response.data.tipo_login === 'login sucesso') {
      // Criar um token JWT ou qualquer outro identificador único
      const token = btoa(JSON.stringify({
        id: response.data.cod_convenio,
        user: usuario,
        senha: senha,
        timestamp: new Date().getTime()
      }));

      // Salvar o token em um cookie
      const cookieStore = cookies();
      cookieStore.set('convenioToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 semana
        path: '/',
      });

      console.log('✅ Login bem-sucedido');
      console.log('🔍 DADOS CRÍTICOS DE DEBUG:', {
        usuario_enviado: usuario,
        senha_enviada: senha,
        cod_convenio_retornado: response.data.cod_convenio,
        razaosocial_retornada: response.data.razaosocial,
        userconv_na_resposta: response.data.userconv,
        passconv_na_resposta: response.data.passconv
      });
      
      const apiResponse = NextResponse.json({
        success: true,
        convenio: {
          cod_convenio: response.data.cod_convenio,
          razaosocial: response.data.razaosocial,
          nome_fantasia: response.data.nomefantasia,
          endereco: response.data.endereco,
          bairro: response.data.bairro,
          cidade: response.data.cidade,
          estado: response.data.estado,
          cnpj: response.data.cnpj,
          cpf: response.data.cpf
        }
      });
      
      // Headers anti-cache para dispositivos móveis
      apiResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      apiResponse.headers.set('Pragma', 'no-cache');
      apiResponse.headers.set('Expires', '0');
      
      return apiResponse;
    } else {
      // Tratar diferentes tipos de erro da API PHP
      console.log('❌ Login falhou:', response.data.tipo_login);
      
      let mensagemErro = 'Usuário ou senha inválidos';
      
      switch (response.data.tipo_login) {
        case 'login incorreto':
          mensagemErro = 'Usuário ou senha incorretos';
          break;
        case 'login vazio':
          mensagemErro = 'Usuário e senha são obrigatórios';
          break;
        default:
          mensagemErro = `Erro de login: ${response.data.tipo_login}`;
      }
      
      return NextResponse.json({
        success: false,
        message: mensagemErro
      }, { status: 401 });
    }

  } catch (error) {
    console.error('Erro na API de login:', error);
    
    // Tentar fornecer detalhes mais específicos sobre o erro (mesmo padrão do associado)
    let errorMessage = 'Erro ao processar a requisição';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Timeout na conexão com o servidor';
      } else if (error.response) {
        statusCode = error.response.status;
        errorMessage = `Erro ${statusCode} do servidor`;
        console.log('Dados do erro:', error.response.data);
      } else if (error.request) {
        errorMessage = 'Sem resposta do servidor';
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        message: errorMessage, 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: statusCode }
    );
  }
}