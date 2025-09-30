import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API MÊS CORRENTE - Iniciada (GET)');
    
    // Verificar token de autenticação
    const cookieStore = cookies();
    const tokenEncoded = cookieStore.get('convenioToken')?.value;
    
    if (!tokenEncoded) {
      console.log('❌ MÊS CORRENTE - Token não encontrado');
      return NextResponse.json(
        { success: false, message: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Decodificar e verificar expiração do token
    const tokenData = JSON.parse(atob(tokenEncoded));
    const tokenTime = tokenData.timestamp;
    const currentTime = Date.now();
    const tokenAge = currentTime - tokenTime;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias em milissegundos
    
    console.log('🔍 MÊS CORRENTE - Verificação de token:', {
      tokenAgeInMinutes: Math.floor(tokenAge / 60000),
      maxAgeInMinutes: Math.floor(maxAge / 60000),
      isExpired: tokenAge > maxAge
    });
    
    if (tokenAge > maxAge) {
      console.log('❌ MÊS CORRENTE - Token expirado');
      return NextResponse.json({
        success: false,
        message: 'Sessão expirada. Faça login novamente.'
      }, { status: 401 });
    }
    
    // Recuperar parâmetros da URL para logs
    const { searchParams } = new URL(request.url);
    const timestamp = searchParams.get('t');
    const platform = searchParams.get('platform');
    const divisaoParam = searchParams.get('divisao');
    
    console.log('🔍 API MÊS CORRENTE - Parâmetros recebidos:', {
      timestamp,
      platform,
      divisao: divisaoParam,
      url: request.url
    });
    
    let codigoDivisao: string;
    
    // Se divisao foi passada como parâmetro, usar ela diretamente
    if (divisaoParam) {
      codigoDivisao = divisaoParam;
      console.log('🔍 API MÊS CORRENTE - Usando divisão do parâmetro:', codigoDivisao);
    } else {
      console.log('❌ MÊS CORRENTE - Divisão não informada como parâmetro');
      return NextResponse.json(
        { 
          success: false, 
          message: 'Parâmetro divisao é obrigatório',
          error: 'DIVISAO_OBRIGATORIA'
        },
        { status: 400 }
      );
    }
    
    if (!codigoDivisao) {
      console.log('❌ MÊS CORRENTE - Código divisão vazio');
      return NextResponse.json(
        { 
          success: false, 
          message: 'Código divisão não pode ser vazio',
          error: 'DIVISAO_VAZIA'
        },
        { status: 400 }
      );
    }
    
    // Criar parâmetros para a API PHP
    const params = new URLSearchParams();
    params.append('divisao', codigoDivisao.toString());
    
    console.log('📤 API MÊS CORRENTE - Enviando para PHP:', {
      url: 'https://sas.makecard.com.br/meses_corrente_app.php',
      divisao: codigoDivisao,
      params: params.toString()
    });
    
    // Fazer requisição para a API PHP com timeout menor e tratamento robusto
    const response = await axios.post('https://sas.makecard.com.br/meses_corrente_app.php', 
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'SasApp/1.0',
        },
        timeout: 10000, // Reduzido para 10 segundos
        validateStatus: (status) => {
          console.log('📊 Status HTTP recebido da API PHP:', status);
          return status >= 200 && status < 600; // Aceitar todos os status para debug
        }
      }
    );

    console.log('📥 MÊS CORRENTE - Resposta completa da API PHP:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    });
    
    // Verificar status HTTP da resposta
    if (response.status !== 200) {
      console.error('❌ API PHP retornou status não-200:', response.status);
      return NextResponse.json({
        success: false,
        message: `Erro na API externa: HTTP ${response.status}`,
        error: 'API_EXTERNA_ERRO',
        details: {
          status: response.status,
          statusText: response.statusText,
          data: response.data
        }
      }, { status: 502 }); // Bad Gateway
    }

    // Processar resposta
    let jsonData;
    try {
      if (typeof response.data === 'string') {
        // Limpeza de warnings PHP
        let cleanData = response.data;
        cleanData = cleanData.replace(/<br\s*\/?\>\s*<b>(?:Deprecated|Notice|Warning|Fatal error)[^}]*?<\/b>[^}]*?<br\s*\/?>/gi, '');
        cleanData = cleanData.replace(/<br\s*\/?>/gi, '');
        cleanData = cleanData.trim();
        
        // Extrair JSON válido
        const regexMatch = cleanData.match(/({.*})/);
        if (regexMatch) {
          cleanData = regexMatch[1];
        } else {
          const jsonStart = cleanData.indexOf('{');
          const jsonEnd = cleanData.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1) {
            cleanData = cleanData.substring(jsonStart, jsonEnd + 1);
          }
        }
        
        jsonData = JSON.parse(cleanData);
      } else {
        jsonData = response.data;
      }
    } catch (parseError) {
      console.error('❌ Erro no parse da resposta (mês corrente):', parseError);
      console.log('📄 Dados brutos recebidos (mês corrente):', response.data);
      return NextResponse.json({
        success: false,
        message: 'Erro no formato da resposta do servidor',
        error: 'PARSE_ERROR',
        debug: {
          erro: parseError instanceof Error ? parseError.message : String(parseError),
          dados_brutos: response.data
        }
      }, { status: 502 });
    }

    console.log('📥 MÊS CORRENTE - Dados processados:', jsonData);

    // Verificar se a resposta foi bem-sucedida
    if (jsonData && jsonData.abreviacao) {
      console.log('✅ MÊS CORRENTE - Dados válidos recebidos:', {
        abreviacao: jsonData.abreviacao,
        id_divisao: jsonData.id_divisao,
        status: jsonData.status
      });
      
      const successResponse = NextResponse.json({
        success: true,
        data: {
          abreviacao: jsonData.abreviacao,
          id_divisao: jsonData.id_divisao,
          status: jsonData.status
        }
      });
      
      // Headers anti-cache
      successResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      successResponse.headers.set('Pragma', 'no-cache');
      successResponse.headers.set('Expires', '0');
      
      return successResponse;
    } else {
      console.log('❌ MÊS CORRENTE - API PHP retornou dados inválidos:', jsonData);
      return NextResponse.json({
        success: false,
        message: 'Dados inválidos recebidos da API externa',
        error: 'DADOS_INVALIDOS',
        debug: jsonData
      }, { status: 502 });
    }
    
  } catch (error) {
    console.error('❌ MÊS CORRENTE - Erro geral:', error);
    
    let errorMessage = 'Erro interno do servidor';
    let errorCode = 'ERRO_INTERNO';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Timeout na conexão com a API externa';
        errorCode = 'TIMEOUT';
        statusCode = 504; // Gateway Timeout
      } else if (error.response) {
        errorMessage = `Erro na API externa: ${error.response.status}`;
        errorCode = 'API_EXTERNA_ERRO';
        statusCode = 502; // Bad Gateway
      } else if (error.request) {
        errorMessage = 'Sem resposta da API externa';
        errorCode = 'SEM_RESPOSTA';
        statusCode = 503; // Service Unavailable
      }
    }
    
    return NextResponse.json({
      success: false,
      message: errorMessage,
      error: errorCode,
      details: error instanceof Error ? error.message : String(error)
    }, { status: statusCode });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 API MÊS CORRENTE - Iniciada (POST)');
    
    // Verificar token de autenticação
    const cookieStore = cookies();
    const tokenEncoded = cookieStore.get('convenioToken')?.value;
    
    if (!tokenEncoded) {
      console.log('❌ MÊS CORRENTE POST - Token não encontrado');
      return NextResponse.json(
        { success: false, message: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Decodificar e verificar expiração do token
    const tokenData = JSON.parse(atob(tokenEncoded));
    const tokenTime = tokenData.timestamp;
    const currentTime = Date.now();
    const tokenAge = currentTime - tokenTime;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias em milissegundos
    
    console.log('🔍 MÊS CORRENTE POST - Verificação de token:', {
      tokenAgeInMinutes: Math.floor(tokenAge / 60000),
      maxAgeInMinutes: Math.floor(maxAge / 60000),
      isExpired: tokenAge > maxAge
    });
    
    if (tokenAge > maxAge) {
      console.log('❌ MÊS CORRENTE POST - Token expirado');
      return NextResponse.json({
        success: false,
        message: 'Sessão expirada. Faça login novamente.'
      }, { status: 401 });
    }
    
    // Processar dados da requisição POST
    const body = await request.json();
    const { abreviacao } = body;
    
    console.log('🔍 API MÊS CORRENTE - Dados POST recebidos:', {
      abreviacao,
      body
    });
    
    let codigoDivisao: string;
    
    // Para POST, usar abreviacao do body
    if (abreviacao) {
      codigoDivisao = abreviacao;
      console.log('🔍 API MÊS CORRENTE - Usando divisão do POST body:', codigoDivisao);
    } else {
      console.log('❌ MÊS CORRENTE - Abreviação não informada no POST');
      return NextResponse.json(
        { 
          success: false, 
          message: 'Campo abreviacao é obrigatório no POST',
          error: 'ABREVIACAO_OBRIGATORIA'
        },
        { status: 400 }
      );
    }
    
    if (!codigoDivisao) {
      console.log('❌ MÊS CORRENTE - Código divisão vazio');
      return NextResponse.json(
        { 
          success: false, 
          message: 'Código divisão não pode ser vazio',
          error: 'DIVISAO_VAZIA'
        },
        { status: 400 }
      );
    }
    
    // Criar parâmetros para a API PHP
    const params = new URLSearchParams();
    params.append('divisao', codigoDivisao.toString());
    
    console.log('📤 API MÊS CORRENTE - Enviando para PHP (POST):', {
      url: 'https://sas.makecard.com.br/meses_corrente_app.php',
      divisao: codigoDivisao,
      params: params.toString()
    });
    
    // Fazer requisição para a API PHP com timeout menor e tratamento robusto
    const response = await axios.post('https://sas.makecard.com.br/meses_corrente_app.php', 
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'SasApp/1.0',
        },
        timeout: 10000, // Reduzido para 10 segundos
        validateStatus: (status) => {
          console.log('📊 Status HTTP recebido da API PHP (POST):', status);
          return status >= 200 && status < 600; // Aceitar todos os status para debug
        }
      }
    );

    console.log('📥 MÊS CORRENTE - Resposta completa da API PHP (POST):', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    });
    
    // Verificar status HTTP da resposta
    if (response.status !== 200) {
      console.error('❌ API PHP retornou status não-200 (POST):', response.status);
      return NextResponse.json({
        success: false,
        message: `Erro na API externa: HTTP ${response.status}`,
        error: 'API_EXTERNA_ERRO',
        details: {
          status: response.status,
          statusText: response.statusText,
          data: response.data
        }
      }, { status: 502 }); // Bad Gateway
    }

    // Processar resposta
    let jsonData;
    try {
      if (typeof response.data === 'string') {
        // Limpeza de warnings PHP
        let cleanData = response.data;
        cleanData = cleanData.replace(/<br\s*\/?\>\s*<b>(?:Deprecated|Notice|Warning|Fatal error)[^}]*?<\/b>[^}]*?<br\s*\/?>/gi, '');
        cleanData = cleanData.replace(/<br\s*\/?>/gi, '');
        cleanData = cleanData.trim();
        
        // Extrair JSON válido
        const regexMatch = cleanData.match(/({.*})/);
        if (regexMatch) {
          cleanData = regexMatch[1];
        } else {
          const jsonStart = cleanData.indexOf('{');
          const jsonEnd = cleanData.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1) {
            cleanData = cleanData.substring(jsonStart, jsonEnd + 1);
          }
        }
        
        jsonData = JSON.parse(cleanData);
      } else {
        jsonData = response.data;
      }
    } catch (parseError) {
      console.error('❌ Erro no parse da resposta (mês corrente POST):', parseError);
      console.log('📄 Dados brutos recebidos (mês corrente POST):', response.data);
      return NextResponse.json({
        success: false,
        message: 'Erro no formato da resposta do servidor',
        error: 'PARSE_ERROR',
        debug: {
          erro: parseError instanceof Error ? parseError.message : String(parseError),
          dados_brutos: response.data
        }
      }, { status: 502 });
    }

    console.log('📥 MÊS CORRENTE - Dados processados (POST):', jsonData);

    // Verificar se a resposta foi bem-sucedida
    if (jsonData && jsonData.abreviacao) {
      console.log('✅ MÊS CORRENTE - Dados válidos recebidos (POST):', {
        abreviacao: jsonData.abreviacao,
        id_divisao: jsonData.id_divisao,
        status: jsonData.status
      });
      
      const successResponse = NextResponse.json({
        success: true,
        data: {
          abreviacao: jsonData.abreviacao,
          id_divisao: jsonData.id_divisao,
          status: jsonData.status
        }
      });
      
      // Headers anti-cache
      successResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      successResponse.headers.set('Pragma', 'no-cache');
      successResponse.headers.set('Expires', '0');
      
      return successResponse;
    } else {
      console.log('❌ MÊS CORRENTE - API PHP retornou dados inválidos (POST):', jsonData);
      return NextResponse.json({
        success: false,
        message: 'Dados inválidos recebidos da API externa',
        error: 'DADOS_INVALIDOS',
        debug: jsonData
      }, { status: 502 });
    }
    
  } catch (error) {
    console.error('❌ MÊS CORRENTE - Erro geral (POST):', error);
    
    let errorMessage = 'Erro interno do servidor';
    let errorCode = 'ERRO_INTERNO';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Timeout na conexão com a API externa';
        errorCode = 'TIMEOUT';
        statusCode = 504; // Gateway Timeout
      } else if (error.response) {
        errorMessage = `Erro na API externa: ${error.response.status}`;
        errorCode = 'API_EXTERNA_ERRO';
        statusCode = 502; // Bad Gateway
      } else if (error.request) {
        errorMessage = 'Sem resposta da API externa';
        errorCode = 'SEM_RESPOSTA';
        statusCode = 503; // Service Unavailable
      }
    }
    
    return NextResponse.json({
      success: false,
      message: errorMessage,
      error: errorCode,
      details: error instanceof Error ? error.message : String(error)
    }, { status: statusCode });
  }
}
