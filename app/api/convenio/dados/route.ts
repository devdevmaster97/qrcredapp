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
    
    console.log('🔍 API DADOS - Token decodificado:', {
      user: tokenData.user,
      id: tokenData.id,
      timestamp: tokenData.timestamp,
      timestampFormatted: new Date(tokenData.timestamp).toISOString()
    });
    
    // Criar parâmetros no formato form-urlencoded para enviar para a API PHP
    const params = new URLSearchParams();
    params.append('userconv', tokenData.user);
    params.append('passconv', tokenData.senha || '');
    
    console.log('📤 API DADOS - Enviando para PHP:', params.toString());
    
    // Usar a mesma API de login com tratamento robusto para dispositivos Xiaomi
    const response = await axios.post('https://sas.makecard.com.br/convenio_autenticar_app.php', 
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
          // Tratamento robusto da resposta para compatibilidade com Xiaomi
          try {
            if (typeof data === 'object') {
              return data;
            }
            
            if (typeof data === 'string') {
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
              } else {
                // 3. Buscar manualmente por { e }
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
            console.error('❌ Erro no parse da resposta (dados):', parseError);
            console.log('📄 Dados brutos recebidos (dados):', data);
            return { erro_parse: true, dados_brutos: data };
          }
        }]
      }
    );

    console.log('Resposta API Dados:', response.data);
    console.log('🔍 Status resposta dados:', response.status);
    console.log('🔍 Tipo resposta dados:', typeof response.data);

    // Verificar se houve erro no parse da resposta
    if (response.data && response.data.erro_parse) {
      console.log('❌ Erro no parse da resposta de dados - dados brutos:', response.data.dados_brutos);
      return NextResponse.json({
        success: false,
        message: 'Erro no formato da resposta do servidor',
        debug: {
          erro: 'Parse JSON falhou ao buscar dados',
          dados_brutos: response.data.dados_brutos
        }
      }, { status: 500 });
    }

    const jsonData = response.data;

    // Verificar se os dados foram retornados corretamente
    if (jsonData && jsonData.tipo_login === 'login sucesso') {
      console.log('🔍 DADOS CRÍTICOS DE DEBUG (API DADOS):', {
        usuario_do_token: tokenData.user,
        cod_convenio_retornado: jsonData.cod_convenio,
        razaosocial_retornada: jsonData.razaosocial,
        userconv_na_resposta: jsonData.userconv,
        passconv_na_resposta: jsonData.passconv
      });
      
      // Se a chamada for bem-sucedida, retornar os dados do convênio
      // Headers anti-cache para dispositivos móveis
      const response = NextResponse.json({
        success: true,
        data: {
          cod_convenio: jsonData.cod_convenio,
          razaosocial: jsonData.razaosocial,
          nome_fantasia: jsonData.nomefantasia,
          endereco: jsonData.endereco,
          bairro: jsonData.bairro,
          cidade: jsonData.cidade,
          estado: jsonData.estado,
          cnpj: jsonData.cnpj,
          cpf: jsonData.cpf,
          numero: jsonData.numero,
          cep: jsonData.cep,
          cel: jsonData.cel,
          tel: jsonData.tel,
          email: jsonData.email,
          parcelas: jsonData.parcela_conv,
          divulga: jsonData.divulga,
          pede_senha: jsonData.pede_senha,
          latitude: jsonData.latitude,
          longitude: jsonData.longitude,
          id_categoria: jsonData.id_categoria,
          contato: jsonData.contato,
          senha: jsonData.senha,
          aceito_termo: jsonData.aceita_termo
        }
      });
      
      // Adicionar headers anti-cache para dispositivos móveis
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      
      return response;
    } else {
      return NextResponse.json({
        success: false,
        message: 'Sessão expirada ou inválida'
      }, { status: 401 });
    }
  } catch (error) {
    console.error('Erro ao buscar dados do convênio:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao buscar dados do convênio' },
      { status: 500 }
    );
  }
} 