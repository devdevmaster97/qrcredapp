import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Recuperar o token de autenticação dos cookies
    const cookieStore = cookies();
    const tokenEncoded = cookieStore.get('convenioToken')?.value;
    
    if (!tokenEncoded) {
      return NextResponse.json(
        { success: false, message: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Decodificar o token para obter os dados do convênio
    const tokenData = JSON.parse(atob(tokenEncoded));
    
    console.log('🔍 API MÊS CORRENTE - Token decodificado:', {
      user: tokenData.user,
      id: tokenData.id,
      divisao: tokenData.divisao || tokenData.id_divisao,
      timestamp: tokenData.timestamp
    });
    
    // Obter código da divisão (pode estar como divisao ou id_divisao no token)
    const codigoDivisao = tokenData.divisao || tokenData.id_divisao || tokenData.id;
    
    if (!codigoDivisao) {
      console.log('❌ MÊS CORRENTE - Código divisão não encontrado no token');
      return NextResponse.json(
        { success: false, message: 'Código divisão não encontrado' },
        { status: 400 }
      );
    }
    
    // Criar parâmetros para a API PHP
    const params = new URLSearchParams();
    params.append('divisao', codigoDivisao.toString());
    
    console.log('📤 API MÊS CORRENTE - Enviando para PHP:', {
      url: 'https://sas.makecard.com.br/meses_corrente_app.php',
      divisao: codigoDivisao
    });
    
    // Fazer requisição para a API PHP
    const response = await axios.post('https://sas.makecard.com.br/meses_corrente_app.php', 
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'SasApp/1.0',
        },
        timeout: 15000,
        validateStatus: () => true,
        transformResponse: [(data) => {
          // Tratamento robusto da resposta
          try {
            if (typeof data === 'object') {
              return data;
            }
            
            if (typeof data === 'string') {
              // Limpeza de warnings PHP
              let cleanData = data;
              cleanData = data.replace(/<br\s*\/?>\s*<b>(?:Deprecated|Notice|Warning|Fatal error)[^}]*?<\/b>[^}]*?<br\s*\/?>/gi, '');
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
              
              return JSON.parse(cleanData);
            }
            
            return data;
          } catch (parseError) {
            console.error('❌ Erro no parse da resposta (mês corrente):', parseError);
            console.log('📄 Dados brutos recebidos (mês corrente):', data);
            return { erro_parse: true, dados_brutos: data };
          }
        }]
      }
    );

    console.log('📥 MÊS CORRENTE - Resposta API PHP:', response.data);
    
    // Verificar se houve erro no parse
    if (response.data && response.data.erro_parse) {
      console.log('❌ Erro no parse da resposta de mês corrente - dados brutos:', response.data.dados_brutos);
      return NextResponse.json({
        success: false,
        message: 'Erro no formato da resposta do servidor',
        debug: {
          erro: 'Parse JSON falhou ao buscar mês corrente',
          dados_brutos: response.data.dados_brutos
        }
      }, { status: 500 });
    }

    const jsonData = response.data;

    // Verificar se a resposta foi bem-sucedida
    if (jsonData && (jsonData.success || jsonData.abreviacao)) {
      console.log('✅ MÊS CORRENTE - Dados recebidos:', {
        abreviacao: jsonData.abreviacao,
        id_divisao: jsonData.id_divisao,
        status: jsonData.status
      });
      
      const response = NextResponse.json({
        success: true,
        data: {
          mes_corrente: jsonData.abreviacao,
          id_divisao: jsonData.id_divisao,
          status: jsonData.status
        }
      });
      
      // Headers anti-cache
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      
      return response;
    } else {
      console.log('❌ MÊS CORRENTE - API PHP retornou erro ou dados inválidos:', jsonData);
      return NextResponse.json({
        success: false,
        message: jsonData.message || 'Erro ao buscar mês corrente'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ MÊS CORRENTE - Erro geral:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao buscar mês corrente' },
      { status: 500 }
    );
  }
}
