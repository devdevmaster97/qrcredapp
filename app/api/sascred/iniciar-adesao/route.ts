import { NextRequest, NextResponse } from 'next/server';

/**
 * API para registrar início de adesão SasCred
 * Salva dados temporários para uso posterior no webhook ZapSign
 * Resolve problema de divisão incorreta ao gravar na tabela associados_sasmais
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📝 Iniciando registro de adesão SasCred:', {
      codigo: body.codigo,
      cpf: body.cpf?.substring(0, 3) + '***',
      email: body.email,
      id_associado: body.id_associado,
      id_divisao: body.id_divisao
    });
    
    // Validar campos obrigatórios
    if (!body.codigo || !body.cpf || !body.email || !body.id_associado || !body.id_divisao) {
      return NextResponse.json(
        { 
          status: 'erro', 
          mensagem: 'Campos obrigatórios: codigo, cpf, email, id_associado, id_divisao'
        },
        { status: 400 }
      );
    }

    // Incluir arquivo de conexão com banco
    const { Pool } = require('pg');
    
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'seu_banco',
      user: process.env.DB_USER || 'seu_usuario',
      password: process.env.DB_PASSWORD || 'sua_senha',
    });

    // Inserir ou atualizar registro de adesão pendente
    const query = `
      INSERT INTO sind.adesoes_pendentes 
        (codigo, cpf, email, id_associado, id_divisao, nome, celular, doc_token, status)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, 'pendente')
      ON CONFLICT (cpf, email) 
      DO UPDATE SET
        codigo = EXCLUDED.codigo,
        id_associado = EXCLUDED.id_associado,
        id_divisao = EXCLUDED.id_divisao,
        nome = EXCLUDED.nome,
        celular = EXCLUDED.celular,
        doc_token = EXCLUDED.doc_token,
        data_inicio = NOW(),
        data_expiracao = NOW() + INTERVAL '24 hours',
        status = 'pendente'
      RETURNING id, codigo, id_associado, id_divisao
    `;

    const values = [
      body.codigo,
      body.cpf,
      body.email,
      body.id_associado,
      body.id_divisao,
      body.nome || null,
      body.celular || null,
      body.doc_token || null
    ];

    console.log('📝 Executando query para salvar adesão pendente...');
    
    const result = await pool.query(query, values);
    
    await pool.end();

    if (result.rows.length > 0) {
      const registro = result.rows[0];
      
      console.log('✅ Adesão pendente registrada com sucesso:', {
        id: registro.id,
        codigo: registro.codigo,
        id_associado: registro.id_associado,
        id_divisao: registro.id_divisao
      });

      return NextResponse.json({
        status: 'sucesso',
        mensagem: 'Adesão pendente registrada com sucesso',
        dados: {
          id: registro.id,
          codigo: registro.codigo,
          id_associado: registro.id_associado,
          id_divisao: registro.id_divisao
        }
      });
    } else {
      throw new Error('Nenhum registro foi inserido');
    }

  } catch (error) {
    console.error('❌ Erro ao registrar adesão pendente:', error);
    
    return NextResponse.json({
      status: 'erro',
      mensagem: 'Erro ao registrar adesão pendente',
      erro_detalhes: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
