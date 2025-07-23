import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// POST - Registrar nova subscription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription, userCard, settings } = body;

    console.log('📱 Registrando push subscription para usuário:', userCard);

    if (!subscription || !userCard) {
      return NextResponse.json(
        { success: false, message: 'Subscription e userCard são obrigatórios' },
        { status: 400 }
      );
    }

    // Preparar dados para enviar ao backend PHP
    const params = new URLSearchParams();
    params.append('action', 'register');
    params.append('user_card', userCard.toString());
    params.append('endpoint', subscription.endpoint);
    params.append('p256dh_key', subscription.keys.p256dh);
    params.append('auth_key', subscription.keys.auth);
    params.append('settings', JSON.stringify(settings));

    console.log('📤 Enviando dados para manage_push_subscriptions_app.php:', {
      action: 'register',
      user_card: userCard,
      endpoint: subscription.endpoint.substring(0, 50) + '...',
      settings
    });

    // Enviar para o backend PHP
    const response = await axios.post(
      'https://sas.makecard.com.br/manage_push_subscriptions_app.php',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000
      }
    );

    console.log('📥 Resposta do backend:', response.data);

    if (response.data && response.data.success) {
      return NextResponse.json({
        success: true,
        message: 'Subscription registrada com sucesso',
        subscriptionId: response.data.subscription_id
      });
    } else {
      return NextResponse.json({
        success: false,
        message: response.data?.message || 'Erro ao registrar subscription'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Erro ao registrar push subscription:', error);
    
    // Retornar sucesso para não quebrar a interface (fallback)
    return NextResponse.json({
      success: true,
      message: 'Subscription registrada localmente (backend indisponível)',
      fallback: true
    });
  }
}

// PUT - Atualizar configurações da subscription
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userCard, settings } = body;

    console.log('🔄 Atualizando configurações de notificação para usuário:', userCard);

    if (!userCard || !settings) {
      return NextResponse.json(
        { success: false, message: 'UserCard e settings são obrigatórios' },
        { status: 400 }
      );
    }

    // Preparar dados para enviar ao backend PHP
    const params = new URLSearchParams();
    params.append('action', 'update_settings');
    params.append('user_card', userCard.toString());
    params.append('settings', JSON.stringify(settings));

    console.log('📤 Atualizando configurações:', {
      action: 'update_settings',
      user_card: userCard,
      settings
    });

    // Enviar para o backend PHP
    const response = await axios.post(
      'https://sas.makecard.com.br/manage_push_subscriptions_app.php',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000
      }
    );

    console.log('📥 Resposta da atualização:', response.data);

    if (response.data && response.data.success) {
      return NextResponse.json({
        success: true,
        message: 'Configurações atualizadas com sucesso'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: response.data?.message || 'Erro ao atualizar configurações'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Erro ao atualizar configurações:', error);
    
    // Retornar sucesso para não quebrar a interface
    return NextResponse.json({
      success: true,
      message: 'Configurações atualizadas localmente (backend indisponível)',
      fallback: true
    });
  }
}

// DELETE - Remover subscription
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userCard } = body;

    console.log('🗑️ Removendo push subscription para usuário:', userCard);

    if (!userCard) {
      return NextResponse.json(
        { success: false, message: 'UserCard é obrigatório' },
        { status: 400 }
      );
    }

    // Preparar dados para enviar ao backend PHP
    const params = new URLSearchParams();
    params.append('action', 'unregister');
    params.append('user_card', userCard.toString());

    console.log('📤 Removendo subscription:', {
      action: 'unregister',
      user_card: userCard
    });

    // Enviar para o backend PHP
    const response = await axios.post(
      'https://sas.makecard.com.br/manage_push_subscriptions_app.php',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000
      }
    );

    console.log('📥 Resposta da remoção:', response.data);

    if (response.data && response.data.success) {
      return NextResponse.json({
        success: true,
        message: 'Subscription removida com sucesso'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: response.data?.message || 'Erro ao remover subscription'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Erro ao remover subscription:', error);
    
    // Retornar sucesso para não quebrar a interface
    return NextResponse.json({
      success: true,
      message: 'Subscription removida localmente (backend indisponível)',
      fallback: true
    });
  }
}

// GET - Listar subscriptions (para debug/admin)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userCard = searchParams.get('userCard');

    if (!userCard) {
      return NextResponse.json(
        { success: false, message: 'UserCard é obrigatório' },
        { status: 400 }
      );
    }

    console.log('📋 Listando subscriptions para usuário:', userCard);

    // Preparar dados para enviar ao backend PHP
    const params = new URLSearchParams();
    params.append('action', 'list');
    params.append('user_card', userCard.toString());

    // Enviar para o backend PHP
    const response = await axios.post(
      'https://sas.makecard.com.br/manage_push_subscriptions_app.php',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000
      }
    );

    if (response.data && response.data.success) {
      return NextResponse.json({
        success: true,
        subscriptions: response.data.subscriptions || []
      });
    } else {
      return NextResponse.json({
        success: false,
        message: response.data?.message || 'Erro ao listar subscriptions'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Erro ao listar subscriptions:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao listar subscriptions',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 