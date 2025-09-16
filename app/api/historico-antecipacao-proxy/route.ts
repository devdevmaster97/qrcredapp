import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    // Obter os dados da solicitação
    let matricula, empregador;
    
    try {
      const formData = await request.formData();
      matricula = formData.get('matricula')?.toString();
      empregador = formData.get('empregador')?.toString();
      console.log('📥 Parâmetros recebidos (FormData):', { matricula, empregador });
    } catch (error) {
      // Se não for FormData, tentar como JSON
      const data = await request.json();
      matricula = data.matricula;
      empregador = data.empregador;
      console.log('📥 Parâmetros recebidos (JSON):', { matricula, empregador });
    }

    // Verificar parâmetros obrigatórios
    if (!matricula || !empregador) {
      console.error('❌ Parâmetros obrigatórios ausentes:', { matricula, empregador });
      return NextResponse.json(
        { error: 'Matrícula e empregador são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Validar formato dos parâmetros
    if (typeof matricula !== 'string' || matricula.trim() === '') {
      console.error('❌ Matrícula inválida:', matricula);
      return NextResponse.json(
        { error: 'Matrícula deve ser uma string não vazia' },
        { status: 400 }
      );
    }
    
    if (isNaN(Number(empregador)) || Number(empregador) <= 0) {
      console.error('❌ Empregador inválido:', empregador);
      return NextResponse.json(
        { error: 'Empregador deve ser um número válido' },
        { status: 400 }
      );
    }
    
    console.log('🔄 Iniciando proxy para histórico de antecipações...');
    console.log('   - Matrícula:', matricula);
    console.log('   - Empregador:', empregador);
    
    // Simular dados de histórico (já que o backend está bloqueado)
    // Em produção, isso seria substituído por uma chamada real ao banco
    const historicoSimulado = [
      {
        id: 1,
        matricula: matricula,
        empregador: Number(empregador),
        mes_corrente: 'AGO/2025',
        data_solicitacao: '2025-08-15 10:30:00',
        valor_solicitado: 500.00,
        status: 'aprovado',
        data_aprovacao: '2025-08-15 11:00:00',
        celular: '(11) 99999-9999',
        taxa: 25.00,
        valor_a_descontar: 525.00,
        chave_pix: 'chave@exemplo.com'
      },
      {
        id: 2,
        matricula: matricula,
        empregador: Number(empregador),
        mes_corrente: 'JUL/2025',
        data_solicitacao: '2025-07-20 14:15:00',
        valor_solicitado: 300.00,
        status: 'pendente',
        data_aprovacao: null,
        celular: '(11) 99999-9999',
        taxa: 15.00,
        valor_a_descontar: 315.00,
        chave_pix: 'chave@exemplo.com'
      }
    ];
    
    console.log('✅ Retornando histórico simulado:', historicoSimulado.length, 'registros');
    
    return NextResponse.json(historicoSimulado);
    
  } catch (error) {
    console.error('❌ Erro no proxy de histórico:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
