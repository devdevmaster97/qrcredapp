import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

// =====================================================
// CONFIGURAÇÃO VAPID PARA PUSH NOTIFICATIONS
// =====================================================
const vapidPublicKey = 'BBkhuawdLxFdinzSuGIlZme8m6fwELiHR6g7xA601KN3NQ9EgAqNUglRFM3vysv_Nc0gwkPqG4aYdPnKK2eY5Yc';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

if (!vapidPrivateKey) {
  console.warn('⚠️ VAPID_PRIVATE_KEY não configurada! Push notifications não funcionarão.');
}

webpush.setVapidDetails(
  'mailto:contato@sascred.com.br',
  vapidPublicKey,
  vapidPrivateKey
);

export const dynamic = 'force-dynamic';

// =====================================================
// POST - ENVIAR NOTIFICAÇÃO DE NOVO LANÇAMENTO
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cartao, valor, descricao, convenio, mes, id_lancamento, nome_associado, data, hora } = body;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📬 [NOTIFY-LANCAMENTO] Nova requisição recebida');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   👤 Cartão: ${cartao}`);
    console.log(`   📝 Associado: ${nome_associado}`);
    console.log(`   💰 Valor: R$ ${valor}`);
    console.log(`   📄 Descrição: ${descricao}`);

    // Validar dados obrigatórios
    if (!cartao || !valor) {
      console.error('❌ Dados obrigatórios faltando');
      return NextResponse.json({
        success: false,
        error: 'Cartão e valor são obrigatórios'
      }, { status: 400 });
    }

    // =====================================================
    // BUSCAR SUBSCRIPTIONS DO USUÁRIO ESPECÍFICO
    // =====================================================
    console.log('\n📡 Buscando subscriptions ativas do usuário...');
    
    const subscriptionsResponse = await fetch(
      'https://sas.makecard.com.br/manage_push_subscriptions_app.php',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ 
          action: 'list', 
          user_card: cartao 
        })
      }
    );

    if (!subscriptionsResponse.ok) {
      console.log('⚠️ Nenhuma subscription encontrada para o cartão:', cartao);
      return NextResponse.json({
        success: true,
        message: 'Usuário não tem notificações ativas',
        sent: 0,
        failed: 0
      });
    }

    const subscriptionsData = await subscriptionsResponse.json();
    const subscriptions = subscriptionsData.subscriptions || [];

    if (subscriptions.length === 0) {
      console.log('⚠️ Usuário não possui dispositivos com notificações ativas');
      return NextResponse.json({
        success: true,
        message: 'Usuário não tem notificações ativas',
        sent: 0,
        failed: 0
      });
    }

    console.log(`✅ Encontradas ${subscriptions.length} subscription(s) ativa(s)`);

    // =====================================================
    // PREPARAR NOTIFICAÇÃO
    // =====================================================
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(valor));

    const notification = {
      title: '💳 Novo Lançamento na Conta',
      body: `${descricao || 'Lançamento'}: ${valorFormatado}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: `lancamento-${id_lancamento}`,
      requireInteraction: false,
      data: {
        url: '/dashboard/extrato',
        type: 'lancamento',
        id: id_lancamento,
        valor: valor,
        descricao: descricao,
        data: data,
        hora: hora
      },
      actions: [
        {
          action: 'view',
          title: 'Ver Extrato'
        },
        {
          action: 'close',
          title: 'Fechar'
        }
      ]
    };

    console.log('\n📤 Enviando push notifications...');

    // =====================================================
    // ENVIAR PARA TODAS AS SUBSCRIPTIONS DO USUÁRIO
    // =====================================================
    let sent = 0;
    let failed = 0;
    const results = [];

    for (const sub of subscriptions) {
      try {
        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key || sub.p256dh,
            auth: sub.auth_key || sub.auth
          }
        };
        
        await webpush.sendNotification(subscription, JSON.stringify(notification));
        sent++;
        results.push({ endpoint: sub.endpoint.substring(0, 50), status: 'success' });
        console.log(`   ✅ Enviado para dispositivo ${sent}`);
      } catch (error: any) {
        failed++;
        results.push({ 
          endpoint: sub.endpoint.substring(0, 50), 
          status: 'failed', 
          error: error.message 
        });
        console.error(`   ❌ Falha no dispositivo: ${error.message}`);
        
        // Se subscription expirou (410), deveria remover do banco
        if (error.statusCode === 410) {
          console.log(`   🗑️ Subscription expirada (410) - deveria ser removida`);
          // TODO: Implementar remoção automática de subscriptions expiradas
        }
      }
    }

    // =====================================================
    // REGISTRAR NO LOG
    // =====================================================
    try {
      await fetch('https://sas.makecard.com.br/log_push_notification.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          cartao: cartao,
          lancamento_id: id_lancamento?.toString() || '',
          title: notification.title,
          body: notification.body,
          sent: sent.toString(),
          failed: failed.toString()
        })
      });
    } catch (logError) {
      console.error('⚠️ Erro ao registrar log:', logError);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Processo concluído: ${sent} enviado(s), ${failed} falha(s)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return NextResponse.json({
      success: true,
      sent,
      failed,
      message: `Notificação enviada para ${sent} dispositivo(s)`,
      results
    });

  } catch (error: any) {
    console.error('\n❌ [NOTIFY-LANCAMENTO] Erro fatal:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro ao enviar notificação'
    }, { status: 500 });
  }
}
