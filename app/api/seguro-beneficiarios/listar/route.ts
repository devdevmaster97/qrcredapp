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
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id_associado = searchParams.get('id_associado');
  const id_divisao = searchParams.get('id_divisao');

  if (!id_associado || !id_divisao) {
    return NextResponse.json(
      { success: false, error: 'id_associado e id_divisao são obrigatórios' },
      { status: 400 }
    );
  }

  try {
    const client = await pool.connect();

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

      const result = await client.query(query, [id_associado, id_divisao]);

      return NextResponse.json({
        success: true,
        beneficiarios: result.rows
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Erro ao listar beneficiários:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao listar beneficiários',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
