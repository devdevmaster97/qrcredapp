import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'seu_banco',
  user: process.env.DB_USER || 'seu_usuario',
  password: process.env.DB_PASSWORD || 'sua_senha',
  max: 1,
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 10000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET(request: NextRequest) {
  console.log('📋 API LISTAR - Iniciando...');
  try {
    const { searchParams } = new URL(request.url);
    const id_associado = searchParams.get('id_associado');
    const id_divisao = searchParams.get('id_divisao');

    console.log('📋 Parâmetros recebidos:', { id_associado, id_divisao });

    if (!id_associado || !id_divisao) {
      return NextResponse.json(
        { success: false, error: 'id_associado e id_divisao são obrigatórios' },
        { status: 400 }
      );
    }

    console.log('🔌 Tentando conectar ao banco...');
    const client = await pool.connect();
    console.log('✅ Conectado ao banco com sucesso');

    try {
      const query = `
        SELECT 
          id_beneficiario,
          id_associado,
          id_divisao,
          cpf_zap,
          nome_zap,
          nome_beneficiario,
          data_nascimento,
          parentesco,
          percentual,
          status,
          doc_token,
          data_criacao,
          data_assinatura
        FROM sind.seguro_beneficiarios
        WHERE id_associado = $1 AND id_divisao = $2
        ORDER BY id_beneficiario ASC
      `;

      console.log('🔍 Executando query de listagem...');
      const result = await client.query(query, [id_associado, id_divisao]);
      console.log('📊 Beneficiários encontrados:', result.rows.length);

      return NextResponse.json({
        success: true,
        beneficiarios: result.rows
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ ERRO COMPLETO ao listar beneficiários:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A');
    
    // Capturar detalhes específicos do erro PostgreSQL
    const errorDetails: any = {
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      name: error instanceof Error ? error.name : 'Unknown',
    };
    
    // Se for erro do PostgreSQL, capturar detalhes adicionais
    if (error && typeof error === 'object') {
      const pgError = error as any;
      if (pgError.code) errorDetails.code = pgError.code;
      if (pgError.detail) errorDetails.detail = pgError.detail;
      if (pgError.table) errorDetails.table = pgError.table;
      if (pgError.schema) errorDetails.schema = pgError.schema;
    }
    
    console.error('❌ Detalhes do erro:', errorDetails);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao buscar beneficiários',
        details: errorDetails
      },
      { status: 500 }
    );
  }
}
