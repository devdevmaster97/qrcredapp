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
    
    // Criar parâmetros no formato form-urlencoded para enviar para a API PHP
    const params = new URLSearchParams();
    params.append('userconv', tokenData.user);
    params.append('passconv', tokenData.senha || '');
    
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
              // Múltiplas estratégias de limpeza para garantir compatibilidade
              let cleanData = data;
              
              // 1. Remover warnings PHP do início
              cleanData = cleanData.replace(/^.*?({.*}).*$/, '$1').trim();
              
              // 2. Se não encontrou JSON, tentar extrair manualmente
              if (!cleanData.startsWith('{')) {
                const jsonStart = data.indexOf('{');
                const jsonEnd = data.lastIndexOf('}');
                if (jsonStart !== -1 && jsonEnd !== -1) {
                  cleanData = data.substring(jsonStart, jsonEnd + 1);
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
      // Se a chamada for bem-sucedida, retornar os dados do convênio
      return NextResponse.json({
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