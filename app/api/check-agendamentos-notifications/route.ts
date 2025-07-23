import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// GET - Verificar agendamentos e enviar notificações
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Iniciando verificação de agendamentos para notificações...');

    // Buscar agendamentos que precisam de notificação
    const response = await axios.post(
      'https://sas.makecard.com.br/check_agendamentos_notifications_app.php',
      new URLSearchParams({
        action: 'check_pending_notifications'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000 // 30 segundos para essa operação mais lenta
      }
    );

    console.log('📥 Resposta do backend:', {
      success: response.data?.success,
      totalNotifications: response.data?.notifications?.length || 0
    });

    if (response.data && response.data.success && response.data.notifications) {
      const notifications = response.data.notifications;
      const results = [];

      console.log(`📬 Processando ${notifications.length} notificações...`);

      // Processar cada notificação
      for (const notification of notifications) {
        try {
          const result = await processNotification(notification);
          results.push(result);
        } catch (error) {
          console.error(`❌ Erro ao processar notificação para agendamento ${notification.agendamento_id}:`, error);
          results.push({
            agendamento_id: notification.agendamento_id,
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      console.log(`✅ Processamento concluído: ${successCount} sucessos, ${errorCount} erros`);

      return NextResponse.json({
        success: true,
        message: `Processadas ${notifications.length} notificações`,
        results: {
          total: notifications.length,
          success: successCount,
          errors: errorCount,
          details: results
        }
      });
    } else {
      console.log('ℹ️ Nenhuma notificação pendente encontrada');
      return NextResponse.json({
        success: true,
        message: 'Nenhuma notificação pendente',
        results: {
          total: 0,
          success: 0,
          errors: 0,
          details: []
        }
      });
    }

  } catch (error) {
    console.error('❌ Erro na verificação de notificações:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao verificar notificações',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// POST - Forçar verificação para um usuário específico (para debug)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userCard } = body;

    if (!userCard) {
      return NextResponse.json(
        { success: false, message: 'UserCard é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`🔍 Verificação forçada para usuário: ${userCard}`);

    // Buscar agendamentos específicos do usuário
    const response = await axios.post(
      'https://sas.makecard.com.br/check_agendamentos_notifications_app.php',
      new URLSearchParams({
        action: 'check_user_notifications',
        user_card: userCard.toString()
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000
      }
    );

    if (response.data && response.data.success && response.data.notifications) {
      const notifications = response.data.notifications;
      const results = [];

      for (const notification of notifications) {
        try {
          const result = await processNotification(notification);
          results.push(result);
        } catch (error) {
          console.error(`❌ Erro ao processar notificação:`, error);
          results.push({
            agendamento_id: notification.agendamento_id,
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Processadas ${notifications.length} notificações para o usuário`,
        results
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'Nenhuma notificação pendente para este usuário',
        results: []
      });
    }

  } catch (error) {
    console.error('❌ Erro na verificação forçada:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao verificar notificações do usuário',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// Função auxiliar para processar uma notificação
async function processNotification(notification: any) {
  const { 
    agendamento_id, 
    user_card, 
    tipo_notificacao, 
    data_agendada, 
    profissional, 
    especialidade, 
    convenio_nome 
  } = notification;

  console.log(`📬 Processando notificação ${tipo_notificacao} para agendamento ${agendamento_id}`);

  try {
    // Buscar subscriptions do usuário
    const subscriptionsResponse = await axios.post(
      'https://sas.makecard.com.br/manage_push_subscriptions_app.php',
      new URLSearchParams({
        action: 'list',
        user_card: user_card.toString()
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000
      }
    );

    if (!subscriptionsResponse.data?.success || !subscriptionsResponse.data?.subscriptions?.length) {
      console.log(`⚠️ Nenhuma subscription ativa encontrada para usuário ${user_card}`);
      return {
        agendamento_id,
        success: false,
        error: 'Nenhuma subscription ativa'
      };
    }

    const subscriptions = subscriptionsResponse.data.subscriptions;
    console.log(`📱 Encontradas ${subscriptions.length} subscriptions para o usuário`);

    // Gerar conteúdo da notificação baseado no tipo
    const notificationContent = generateNotificationContent(
      tipo_notificacao, 
      data_agendada, 
      profissional, 
      especialidade, 
      convenio_nome
    );

    // Enviar push notification para cada subscription
    const pushResults = [];
    for (const subscription of subscriptions) {
      try {
        // Verificar configurações do usuário
        const settings = subscription.settings ? JSON.parse(subscription.settings) : {};
        
        // Verificar se o tipo de notificação está habilitado
        if (!isNotificationEnabled(tipo_notificacao, settings)) {
          console.log(`📵 Notificação ${tipo_notificacao} desabilitada para esta subscription`);
          continue;
        }

        const pushResult = await sendPushNotification(
          subscription,
          notificationContent
        );
        pushResults.push(pushResult);
      } catch (error) {
        console.error(`❌ Erro ao enviar push para subscription:`, error);
        pushResults.push({
          subscription_id: subscription.id,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    // Marcar notificação como enviada no backend
    await markNotificationAsSent(agendamento_id, tipo_notificacao);

    const successfulPushes = pushResults.filter(r => r.success).length;
    
    return {
      agendamento_id,
      success: successfulPushes > 0,
      tipo_notificacao,
      pushes_sent: successfulPushes,
      total_subscriptions: subscriptions.length,
      details: pushResults
    };

  } catch (error) {
    console.error(`❌ Erro ao processar notificação:`, error);
    return {
      agendamento_id,
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

// Gerar conteúdo da notificação
function generateNotificationContent(tipo: string, dataAgendada: string, profissional: string, especialidade: string, convenioNome: string) {
  const dataFormatada = new Date(dataAgendada).toLocaleString('pt-BR');
  
  switch (tipo) {
    case 'agendamento_confirmado':
      return {
        title: '✅ Agendamento Confirmado!',
        body: `Seu agendamento foi confirmado para ${dataFormatada}${profissional ? ` com ${profissional}` : ''}`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        data: {
          url: '/dashboard/agendamentos',
          agendamento_confirmado: true
        }
      };
    
    case 'lembrete_24h':
      return {
        title: '⏰ Lembrete: Agendamento Amanhã',
        body: `Você tem agendamento amanhã às ${dataFormatada}${especialidade ? ` - ${especialidade}` : ''}`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        data: {
          url: '/dashboard/agendamentos',
          lembrete: '24h'
        }
      };
    
    case 'lembrete_1h':
      return {
        title: '🚨 Lembrete: Agendamento em 1 hora',
        body: `Seu agendamento é em 1 hora!${convenioNome ? ` Local: ${convenioNome}` : ''}`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        data: {
          url: '/dashboard/agendamentos',
          lembrete: '1h',
          urgente: true
        }
      };
    
    default:
      return {
        title: '📅 Notificação de Agendamento',
        body: `Você tem uma atualização no seu agendamento`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        data: {
          url: '/dashboard/agendamentos'
        }
      };
  }
}

// Verificar se o tipo de notificação está habilitado
function isNotificationEnabled(tipo: string, settings: any) {
  if (!settings || !settings.enabled) return false;
  
  switch (tipo) {
    case 'agendamento_confirmado':
      return settings.agendamentoConfirmado !== false;
    case 'lembrete_24h':
      return settings.lembrete24h !== false;
    case 'lembrete_1h':
      return settings.lembrete1h !== false;
    default:
      return true;
  }
}

// Enviar push notification
async function sendPushNotification(subscription: any, content: any) {
  try {
    // Enviar via backend PHP que terá as chaves VAPID
    const response = await axios.post(
      'https://sas.makecard.com.br/send_push_notification_app.php',
      new URLSearchParams({
        endpoint: subscription.endpoint,
        p256dh_key: subscription.p256dh_key,
        auth_key: subscription.auth_key,
        title: content.title,
        body: content.body,
        icon: content.icon,
        badge: content.badge,
        data: JSON.stringify(content.data)
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000
      }
    );

    return {
      subscription_id: subscription.id,
      success: response.data?.success || false,
      response: response.data
    };
  } catch (error) {
    console.error('❌ Erro ao enviar push notification:', error);
    return {
      subscription_id: subscription.id,
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

// Marcar notificação como enviada
async function markNotificationAsSent(agendamentoId: number, tipoNotificacao: string) {
  try {
    await axios.post(
      'https://sas.makecard.com.br/check_agendamentos_notifications_app.php',
      new URLSearchParams({
        action: 'mark_sent',
        agendamento_id: agendamentoId.toString(),
        tipo_notificacao: tipoNotificacao
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000
      }
    );
  } catch (error) {
    console.error('❌ Erro ao marcar notificação como enviada:', error);
  }
} 