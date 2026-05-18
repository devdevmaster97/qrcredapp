import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

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

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id_beneficiario, id_associado } = body;

    console.log('🗑️ DELETE - Parâmetros recebidos:', { id_beneficiario, id_associado });

    if (!id_beneficiario || !id_associado) {
      return NextResponse.json(
        { success: false, error: 'id_beneficiario e id_associado são obrigatórios' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Primeiro, verificar todos os beneficiários do associado
      const allQuery = `
        SELECT id_beneficiario, nome_beneficiario, status
        FROM sind.seguro_beneficiarios
        WHERE id_associado = $1
      `;
      const allResult = await client.query(allQuery, [id_associado]);
      console.log('📋 Todos os beneficiários do associado:', allResult.rows);

      // Verificar se o beneficiário existe e pertence ao associado
      const checkQuery = `
        SELECT status
        FROM sind.seguro_beneficiarios
        WHERE id_beneficiario = $1 AND id_associado = $2
      `;
      const checkResult = await client.query(checkQuery, [id_beneficiario, id_associado]);
      console.log('🔍 Resultado da verificação:', checkResult.rows);

      if (checkResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Beneficiário não encontrado' },
          { status: 404 }
        );
      }

      const status = checkResult.rows[0].status;

      if (status === 'assinado') {
        return NextResponse.json(
          { success: false, error: 'Não é possível excluir beneficiário já assinado' },
          { status: 400 }
        );
      }

      // Excluir beneficiário
      const deleteQuery = `
        DELETE FROM sind.seguro_beneficiarios
        WHERE id_beneficiario = $1 AND id_associado = $2
      `;
      await client.query(deleteQuery, [id_beneficiario, id_associado]);

      return NextResponse.json({
        success: true,
        message: 'Beneficiário excluído com sucesso'
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Erro ao excluir beneficiário:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao excluir beneficiário',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
