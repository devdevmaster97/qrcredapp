import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// API para verificar e processar notificações de agendamentos
export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Iniciando verificação de notificações de agendamentos...');

    // Chamar o script PHP que monitora agendamentos
    const response = await axios.get(
      'https://sas.makecard.com.br/check_agendamentos_notifications.php',
      {
        timeout: 30000,
        headers: {
          'User-Agent': 'SAS-App-NotificationChecker/1.0'
        }
      }
    );

    console.log('📥 Resposta recebida:', response.status, response.statusText);

    if (response.data && response.data.success) {
      const results = response.data.results;
      
      console.log(`✅ Sistema executado com sucesso!`);
      console.log(`📊 Total processados: ${results.total_processed}`);
      console.log(`📱 Notificações enviadas: ${results.notifications_sent}`);
      console.log(`❌ Erros: ${results.errors}`);

      return NextResponse.json({
        success: true,
        message: response.data.message,
        results: {
          total_processed: results.total_processed,
          notifications_sent: results.notifications_sent,
          errors: results.errors,
          details: results.details
        }
      });
    } else {
      console.log('⚠️ Resposta sem sucesso ou dados inválidos');
      return NextResponse.json({
        success: false,
        message: 'Erro na verificação de agendamentos',
        error: 'Resposta inválida do servidor'
      });
    }

  } catch (error) {
    console.error('❌ Erro ao verificar notificações de agendamentos:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// POST para forçar verificação manual
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Verificação manual de agendamentos solicitada...');
    
    // Mesmo processamento do GET
    const response = await axios.get(
      'https://sas.makecard.com.br/check_agendamentos_notifications.php',
      {
        timeout: 30000,
        headers: {
          'User-Agent': 'SAS-App-NotificationChecker/1.0'
        }
      }
    );

    if (response.data && response.data.success) {
      const results = response.data.results;
      
      console.log(`✅ Verificação manual concluída!`);
      console.log(`📱 ${results.notifications_sent} notificações enviadas`);

      return NextResponse.json({
        success: true,
        message: 'Verificação manual executada com sucesso',
        results: results,
        manual_trigger: true
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Erro na verificação manual',
        error: 'Resposta inválida do servidor'
      });
    }

  } catch (error) {
    console.error('❌ Erro na verificação manual:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro na verificação manual',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 