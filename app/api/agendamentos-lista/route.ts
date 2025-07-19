import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cod_associado, id_empregador } = body;

    // Validar dados obrigatórios
    if (!cod_associado || !id_empregador) {
      return NextResponse.json(
        { success: false, message: 'Código do associado e ID do empregador são obrigatórios' },
        { status: 400 }
      );
    }

    // Preparar dados para enviar ao backend
    const params = new URLSearchParams();
    params.append('cod_associado', cod_associado);
    params.append('id_empregador', id_empregador.toString());

    // Fazer requisição para o backend PHP
    const response = await axios.post(
      'https://sas.makecard.com.br/lista_agendamentos_app.php',
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
        data: response.data.data || []
      });
    } else {
      return NextResponse.json({
        success: false,
        message: response.data?.message || 'Erro ao buscar agendamentos'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    
    // Por enquanto, retornar uma lista vazia em caso de erro
    // Isso permite que a interface funcione mesmo sem o backend implementado
    return NextResponse.json({
      success: true,
      data: []
    });
  }
} 