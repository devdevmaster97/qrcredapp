/**
 * =====================================================
 * LISTENER DE NOTIFICAÇÕES PUSH EM TEMPO REAL
 * =====================================================
 * Este script conecta ao PostgreSQL e escuta notificações
 * de novos lançamentos via LISTEN/NOTIFY.
 * 
 * Quando um lançamento é inserido, envia push notification
 * APENAS para o usuário específico daquele lançamento.
 * =====================================================
 */
require('dotenv').config();

const { Client } = require('pg');
const axios = require('axios');

// =====================================================
// CONFIGURAÇÃO DO BANCO DE DADOS
// =====================================================
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // SSL Configuration
  ssl: process.env.DB_SSL === 'false' ? false : {
    rejectUnauthorized: false
  },
  // Manter conexão ativa
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};

// URL da API Next.js que envia as push notifications
const API_URL = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

// Cliente PostgreSQL
const client = new Client(dbConfig);

// =====================================================
// FUNÇÃO PRINCIPAL - INICIAR LISTENER
// =====================================================
async function iniciarListener() {
  try {
    // Conectar ao banco
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL');
    console.log(`📡 Banco: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);
    console.log('👂 Aguardando notificações de novos lançamentos...\n');

    // Escutar o canal 'new_lancamento'
    await client.query('LISTEN new_lancamento');
    console.log('🔔 Canal "new_lancamento" ativo\n');

    // Handler para notificações recebidas
    client.on('notification', async (msg) => {
      try {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔔 NOVA NOTIFICAÇÃO RECEBIDA!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`⏰ Timestamp: ${new Date().toLocaleString('pt-BR')}`);
        console.log(`📢 Canal: ${msg.channel}`);
        
        // Parse do payload JSON
        const payload = JSON.parse(msg.payload);
        console.log('\n📦 Dados do Lançamento:');
        console.log(`   👤 Cartão: ${payload.cartao}`);
        console.log(`   📝 Associado: ${payload.nome_associado} (${payload.associado})`);
        console.log(`   💰 Valor: R$ ${payload.valor}`);
        console.log(`   📄 Descrição: ${payload.descricao}`);
        console.log(`   🏢 Convênio: ${payload.convenio}`);
        console.log(`   📅 Data: ${payload.data} ${payload.hora}`);
        console.log(`   🆔 ID Lançamento: ${payload.lancamento_id}`);

        // Enviar para API Next.js que dispara o push notification
        console.log('\n📤 Enviando para API de Push Notifications...');
        
        const response = await axios.post(
          `${API_URL}/api/notify-lancamento`,
          {
            cartao: payload.cartao,
            valor: payload.valor,
            descricao: payload.descricao,
            convenio: payload.convenio,
            mes: payload.mes,
            id_lancamento: payload.lancamento_id,
            nome_associado: payload.nome_associado,
            data: payload.data,
            hora: payload.hora
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000
          }
        );

        console.log('✅ Push Notification enviado com sucesso!');
        console.log(`   📊 Resultado: ${response.data.message || 'OK'}`);
        console.log(`   📱 Dispositivos notificados: ${response.data.sent || 0}`);
        if (response.data.failed > 0) {
          console.log(`   ⚠️  Falhas: ${response.data.failed}`);
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      } catch (error) {
        console.error('\n❌ ERRO ao processar notificação:');
        console.error(`   Mensagem: ${error.message}`);
        if (error.response) {
          console.error(`   Status: ${error.response.status}`);
          console.error(`   Dados: ${JSON.stringify(error.response.data)}`);
        }
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      }
    });

    // Manter conexão ativa com ping periódico
    setInterval(async () => {
      try {
        await client.query('SELECT 1');
        console.log(`💓 Ping - Conexão ativa (${new Date().toLocaleTimeString('pt-BR')})`);
      } catch (error) {
        console.error('❌ Erro no ping da conexão:', error.message);
        console.error('🔄 Tentando reconectar...');
        process.exit(1);
      }
    }, 30000); // Ping a cada 30 segundos

  } catch (error) {
    console.error('\n❌ ERRO FATAL ao conectar ao banco:');
    console.error(`   Mensagem: ${error.message}`);
    console.error(`   Código: ${error.code}`);
    console.error('\n💡 Verifique:');
    console.error('   1. Se o PostgreSQL está rodando');
    console.error('   2. Se as credenciais estão corretas');
    console.error('   3. Se o banco de dados existe');
    console.error('   4. Se as variáveis de ambiente estão configuradas\n');
    process.exit(1);
  }
}

// =====================================================
// TRATAMENTO DE SINAIS - ENCERRAMENTO GRACIOSO
// =====================================================
async function encerrarGraciosamente(sinal) {
  console.log(`\n\n👋 Recebido sinal ${sinal} - Encerrando listener...`);
  
  try {
    // Parar de escutar
    await client.query('UNLISTEN new_lancamento');
    console.log('🔕 Canal "new_lancamento" desativado');
    
    // Fechar conexão
    await client.end();
    console.log('✅ Conexão com PostgreSQL encerrada');
    console.log('👋 Listener encerrado com sucesso!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao encerrar:', error.message);
    process.exit(1);
  }
}

// Capturar sinais de encerramento
process.on('SIGINT', () => encerrarGraciosamente('SIGINT'));
process.on('SIGTERM', () => encerrarGraciosamente('SIGTERM'));

// Capturar erros não tratados
process.on('uncaughtException', (error) => {
  console.error('\n❌ ERRO NÃO TRATADO:');
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ PROMISE REJEITADA NÃO TRATADA:');
  console.error('Motivo:', reason);
  process.exit(1);
});

// =====================================================
// INICIAR O LISTENER
// =====================================================
console.log('\n╔═══════════════════════════════════════════════════╗');
console.log('║   🔔 LISTENER DE PUSH NOTIFICATIONS EM TEMPO REAL ║');
console.log('╚═══════════════════════════════════════════════════╝\n');

iniciarListener();
