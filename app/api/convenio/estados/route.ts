import { NextResponse } from 'next/server';
import axios from 'axios';

interface Estado {
  sigla: string;
  nome: string;
}

// Forçar rota dinâmica para evitar timeout no build
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await axios.get('https://servicodados.ibge.gov.br/api/v1/localidades/estados', {
      timeout: 10000 // 10 segundos timeout
    });
    
    // Ordenar estados por nome
    const estados = response.data
      .map((estado: Estado) => ({
        sigla: estado.sigla,
        nome: estado.nome
      }))
      .sort((a: Estado, b: Estado) => a.nome.localeCompare(b.nome));
    
    return NextResponse.json({
      success: true,
      data: estados
    });

  } catch (error) {
    console.error('Erro ao buscar estados:', error);
    // Retornar lista padrão de estados em caso de erro
    const estadosPadrao = [
      { sigla: 'SP', nome: 'São Paulo' },
      { sigla: 'RJ', nome: 'Rio de Janeiro' },
      { sigla: 'MG', nome: 'Minas Gerais' },
      { sigla: 'RS', nome: 'Rio Grande do Sul' },
      { sigla: 'PR', nome: 'Paraná' },
      { sigla: 'SC', nome: 'Santa Catarina' }
    ];
    
    return NextResponse.json({
      success: true,
      data: estadosPadrao
    });
  }
} 