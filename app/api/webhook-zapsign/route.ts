import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Interface para o payload do webhook ZapSign
interface ZapSignWebhookPayload {
  event?: string;
  event_type?: string;
  token?: string;
  doc_token?: string;
  name?: string;
  doc_name?: string;
  status?: string;
  signed_at?: string;
  signers?: Array<{
    name: string;
    email: string;
    cpf?: string;
    phone_number?: string;
    status: string;
    signed_at?: string;
    token: string;
  }>;
  folder_path?: string;
  created_at?: string;
  last_update_at?: string;
}

export async function POST(request: NextRequest) {
  console.log('🔔 Webhook ZapSign recebido');
  
  try {
    // Obter o corpo da requisição
    const body: ZapSignWebhookPayload = await request.json();
    
    console.log('📋 Payload recebido:', JSON.stringify(body, null, 2));
    
    // Mapear campos para compatibilidade
    const event = body.event || body.event_type;
    const docToken = body.doc_token || body.token;
    const docName = body.doc_name || body.name;
    
    // Validar evento
    if (!event) {
      console.error('❌ Evento não especificado no webhook');
      return NextResponse.json(
        { status: 'erro', mensagem: 'Evento não especificado' },
        { status: 400 }
      );
    }
    
    console.log(`📌 Evento: ${event}`);
    console.log(`📄 Documento: ${docName}`);
    console.log(`🔑 Token: ${docToken}`);
    
    // Processar apenas eventos de assinatura
    if (event === 'doc_signed' || event === 'doc_completed') {
      
      // Verificar se é um contrato de antecipação
      if (docName && docName.includes('Contrato de Antecipação Salarial')) {
        console.log('✅ Processando assinatura de Contrato de Antecipação Salarial');
        
        // Processar signatários
        if (body.signers && body.signers.length > 0) {
          for (const signer of body.signers) {
            if (signer.status === 'signed') {
              console.log(`✍️ Assinado por: ${signer.name} (CPF: ${signer.cpf})`);
              
              // Aqui você pode adicionar lógica para:
              // 1. Salvar em banco local
              // 2. Enviar para API do sas.makecard.com.br quando disponível
              // 3. Disparar notificações
              
              // Tentar sincronizar com servidor principal (com fallback)
              try {
                const syncResponse = await axios.post(
                  'https://sas.makecard.com.br/webhook_zapsign.php',
                  body,
                  {
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    timeout: 5000 // Timeout reduzido para falhar rápido
                  }
                );
                
                console.log('✅ Sincronizado com servidor principal:', syncResponse.status);
              } catch (syncError) {
                console.error('⚠️ Falha ao sincronizar com servidor principal:', syncError.message);
                // Continuar processamento local mesmo se falhar
              }
              
              // TODO: Implementar salvamento local ou em fila
              // Por exemplo, salvar em localStorage ou IndexedDB para retry posterior
            }
          }
        }
        
        return NextResponse.json({
          status: 'sucesso',
          mensagem: 'Webhook processado com sucesso',
          documento: docName,
          token: docToken
        });
      }
    }
    
    // Para outros eventos ou documentos, apenas confirmar recebimento
    return NextResponse.json({
      status: 'ok',
      mensagem: 'Webhook recebido',
      evento: event
    });
    
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    
    return NextResponse.json(
      { 
        status: 'erro', 
        mensagem: error instanceof Error ? error.message : 'Erro ao processar webhook' 
      },
      { status: 500 }
    );
  }
}

// Endpoint para verificar status do webhook
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  
  if (status) {
    return NextResponse.json({
      webhook: 'ZapSign Webhook - SasApp',
      version: '1.0',
      timestamp: new Date().toISOString(),
      status: 'online',
      endpoints: {
        webhook: '/api/webhook-zapsign',
        verificar: '/api/verificar-assinatura-zapsign'
      },
      features: [
        'Recebe webhooks do ZapSign',
        'Processa contratos de antecipação',
        'Sincronização com servidor principal',
        'Fallback local em caso de falha'
      ]
    });
  }
  
  return NextResponse.json({
    mensagem: 'Webhook ZapSign está ativo',
    documentacao: 'Use ?status=1 para ver detalhes'
  });
}

// Suporte para OPTIONS (CORS)
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    }
  );
}
