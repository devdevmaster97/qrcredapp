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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id_associado, id_divisao, quantidade } = body;

    if (!id_associado || !id_divisao || !quantidade) {
      return NextResponse.json(
        { success: false, error: 'id_associado, id_divisao e quantidade são obrigatórios' },
        { status: 400 }
      );
    }

    if (quantidade < 1 || quantidade > 4) {
      return NextResponse.json(
        { success: false, error: 'Quantidade deve ser entre 1 e 4' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verificar quantos beneficiários já existem
      const checkQuery = `
        SELECT COUNT(*) as total
        FROM sind.seguro_beneficiarios
        WHERE id_associado = $1 AND id_divisao = $2
      `;
      const checkResult = await client.query(checkQuery, [id_associado, id_divisao]);
      const totalExistente = parseInt(checkResult.rows[0].total);

      if (totalExistente >= 4) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Você já possui 4 beneficiários cadastrados (limite máximo)' },
          { status: 400 }
        );
      }

      if (totalExistente + quantidade > 4) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { 
            success: false, 
            error: `Você só pode ter até 4 beneficiários. Você já tem ${totalExistente}.` 
          },
          { status: 400 }
        );
      }

      // Inserir beneficiários
      const insertQuery = `
        INSERT INTO sind.seguro_beneficiarios 
        (id_associado, id_divisao, status)
        VALUES ($1, $2, 'pendente')
        RETURNING id_beneficiario
      `;

      const beneficiariosCriados = [];

      for (let i = 0; i < quantidade; i++) {
        const result = await client.query(insertQuery, [id_associado, id_divisao]);
        beneficiariosCriados.push(result.rows[0]);
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: `${quantidade} beneficiário(s) criado(s) com sucesso`,
        beneficiarios: beneficiariosCriados
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Erro ao criar beneficiários:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao criar beneficiários',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
