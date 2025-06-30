import { NextRequest, NextResponse } from 'next/server';

// Tipo para a resposta da API ZapSign
interface ZapSignDocument {
  token: string;
  name: string;
  signers?: Array<{
    cpf?: string;
    name?: string;
    status?: string;
  }>;
}

interface ZapSignListResponse {
  results: ZapSignDocument[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar dados recebidos
    if (!body.cpf) {
      return NextResponse.json(
        { 
          status: 'erro', 
          mensagem: 'CPF é obrigatório.' 
        },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          }
        }
      );
    }

    const cpfProcurado = body.cpf;
    
    // Token do ZapSign (deve estar nas variáveis de ambiente)
    const zapSignToken = process.env.ZAPSIGN_API_TOKEN;
    
    if (!zapSignToken) {
      console.error('❌ Token do ZapSign não configurado');
      return NextResponse.json(
        { 
          status: 'erro', 
          mensagem: 'Configuração de assinatura digital não encontrada.' 
        },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          }
        }
      );
    }

    console.log('🔍 Verificando assinatura digital para CPF:', cpfProcurado);

    // Headers para requisições ao ZapSign
    const headers = {
      'Authorization': `Bearer ${zapSignToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // 📋 Buscar lista de documentos no ZapSign
    console.log('📋 Buscando documentos no ZapSign...');
    const docsResponse = await fetch('https://api.zapsign.com.br/api/v1/docs/', {
      method: 'GET',
      headers: headers
    });

    if (!docsResponse.ok) {
      console.error('❌ Erro ao buscar documentos:', docsResponse.status);
      return NextResponse.json(
        { 
          status: 'erro', 
          mensagem: 'Erro ao acessar API do ZapSign.' 
        },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          }
        }
      );
    }

    const docsData: ZapSignListResponse = await docsResponse.json();
    
    if (!docsData.results) {
      console.error('❌ Resposta inválida do ZapSign');
      return NextResponse.json(
        { 
          status: 'erro', 
          mensagem: 'Resposta inválida da API ZapSign.' 
        },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          }
        }
      );
    }

    console.log(`📄 Encontrados ${docsData.results.length} documentos. Verificando signatários...`);

    // 🔍 Verificar cada documento e seus signatários
    for (const doc of docsData.results) {
      const docToken = doc.token;
      
      console.log(`🔍 Verificando documento: ${doc.name || docToken}`);
      
      // Buscar detalhes do documento
      const docDetailResponse = await fetch(`https://api.zapsign.com.br/api/v1/docs/${docToken}/`, {
        method: 'GET',
        headers: headers
      });

      if (!docDetailResponse.ok) {
        console.log(`⚠️ Erro ao buscar detalhes do documento ${docToken}:`, docDetailResponse.status);
        continue; // Pular para próximo documento
      }

      const docDetails: ZapSignDocument = await docDetailResponse.json();

      // Verificar signatários
      if (docDetails.signers) {
        console.log(`👥 Verificando ${docDetails.signers.length} signatários do documento ${docDetails.name}`);
        
        for (const signer of docDetails.signers) {
          if (signer.cpf) {
            // Remover caracteres não numéricos para comparação
            const cpfSigner = signer.cpf.replace(/\D/g, '');
            const cpfBusca = cpfProcurado.replace(/\D/g, '');
            
            console.log(`🔍 Comparando CPF: ${cpfSigner} vs ${cpfBusca}`);
            
            if (cpfSigner === cpfBusca) {
              console.log(`✅ CPF encontrado! Documento: ${docDetails.name}, Signatário: ${signer.name}`);
              
              return NextResponse.json(
                { 
                  status: 'ok', 
                  mensagem: `CPF já assinou: ${docDetails.name}`,
                  documento: {
                    nome: docDetails.name,
                    token: docDetails.token,
                    signatario: signer.name,
                    status: signer.status
                  }
                },
                { 
                  headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                  }
                }
              );
            }
          }
        }
      }
    }

    // CPF não encontrado em nenhum documento
    console.log('❌ Nenhuma assinatura encontrada para o CPF:', cpfProcurado);
    
    return NextResponse.json(
      { 
        status: 'nao_encontrado', 
        mensagem: 'Nenhuma assinatura encontrada para o CPF informado.' 
      },
      { 
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        }
      }
    );

  } catch (error) {
    console.error('💥 Erro ao verificar assinatura digital:', error);
    
    return NextResponse.json(
      { 
        status: 'erro', 
        mensagem: error instanceof Error ? error.message : 'Erro interno do servidor'
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        }
      }
    );
  }
}

export async function GET(request: NextRequest) {
  // Suporte para requisições GET também (compatibilidade)
  const { searchParams } = new URL(request.url);
  const cpf = searchParams.get('cpf');
  
  if (!cpf) {
    return NextResponse.json(
      { status: 'erro', mensagem: 'CPF é obrigatório.' },
      { status: 400 }
    );
  }
  
  // Redirecionar para POST
  return POST(new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ cpf })
  }));
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    },
  });
} 