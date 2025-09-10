import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Tipo para a resposta da API ZapSign (signatário individual)
interface ZapSignSigner {
  external_id: string;
  token: string;
  status: string;
  name: string;
  lock_name: boolean;
  email: string;
  lock_email: boolean;
  hide_email: boolean;
  blank_email: boolean;
  phone_country: string;
  phone_number: string;
  lock_phone: boolean;
  hide_phone: boolean;
  blank_phone: boolean;
  times_viewed: number;
  last_view_at: string | null;
  signed_at: string | null;
  auth_mode: string;
  qualification: string;
  require_selfie_photo: boolean;
  require_document_photo: boolean;
  geo_latitude: string | null;
  geo_longitude: string | null;
  redirect_link: string;
  resend_attempts: {
    whatsapp: number;
    email: number;
    sms: number;
  };
  send_automatic_whatsapp_signed_file: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar dados recebidos
    if (!body.signer_token) {
      return NextResponse.json(
        { 
          status: 'erro', 
          mensagem: 'Token do signatário é obrigatório.' 
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

    const signerToken = body.signer_token.trim();
    
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

    console.log('🔍 Verificando assinatura digital para signer_token:', signerToken);

    // Headers para requisições ao ZapSign
    const headers = {
      'Authorization': `Bearer ${zapSignToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // 🎯 Consulta DIRETA ao signatário pelo token
    console.log('📞 Consultando signatário diretamente no ZapSign...');
    const signerResponse = await fetch(`https://api.zapsign.com.br/api/v1/signers/${signerToken}/`, {
      method: 'GET',
      headers: headers
    });

    console.log('📡 Status da resposta:', signerResponse.status);

    if (!signerResponse.ok) {
      if (signerResponse.status === 404) {
        console.log('❌ Signatário não encontrado');
        return NextResponse.json(
          { 
            status: 'nao_encontrado', 
            mensagem: 'Token do signatário não encontrado ou inválido.' 
          },
          { 
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            }
          }
        );
      } else {
        console.error('❌ Erro ao consultar signatário:', signerResponse.status);
        return NextResponse.json(
          { 
            status: 'erro', 
            mensagem: `Erro ao consultar API do ZapSign: ${signerResponse.status}` 
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

    const signerData: ZapSignSigner = await signerResponse.json();
    
    console.log('📊 Dados do signatário recebidos:');
    console.log('👤 Nome:', signerData.name);
    console.log('📧 Email:', signerData.email);
    console.log('📱 Telefone:', signerData.phone_number);
    console.log('📝 Status:', signerData.status);
    console.log('🕒 Assinado em:', signerData.signed_at);

    // 🎯 VERIFICAR STATUS DA ASSINATURA
    if (signerData.status === 'signed') {
      console.log('✅ ASSINATURA COMPLETA! Status: signed');
      
      return NextResponse.json(
        { 
          status: 'ok', 
          mensagem: `Assinatura digital completa para ${signerData.name}`,
          assinado: true,
          signatario: {
            token: signerData.token,
            nome: signerData.name,
            email: signerData.email,
            telefone: signerData.phone_number,
            status: signerData.status,
            assinado_em: signerData.signed_at,
            visualizacoes: signerData.times_viewed,
            ultima_visualizacao: signerData.last_view_at
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
    } else {
      console.log(`❌ ASSINATURA NÃO COMPLETA. Status atual: ${signerData.status}`);
      
      return NextResponse.json(
        { 
          status: 'pendente', 
          mensagem: `Assinatura não finalizada. Status: ${signerData.status}`,
          assinado: false,
          signatario: {
            token: signerData.token,
            nome: signerData.name,
            email: signerData.email,
            telefone: signerData.phone_number,
            status: signerData.status,
            visualizacoes: signerData.times_viewed,
            ultima_visualizacao: signerData.last_view_at
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
  const signerToken = searchParams.get('signer_token');
  
  if (!signerToken) {
    return NextResponse.json(
      { status: 'erro', mensagem: 'Token do signatário é obrigatório.' },
      { status: 400 }
    );
  }
  
  // Redirecionar para POST
  return POST(new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ signer_token: signerToken })
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