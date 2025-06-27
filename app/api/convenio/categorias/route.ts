import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    const response = await axios.get('https://sas.makecard.com.br/categorias_class_app.php');
    
    // Garantir que a resposta seja um array
    const categorias = Array.isArray(response.data) ? response.data : [];
    
    return NextResponse.json({
      success: true,
      data: categorias
    });

  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    // Retornar um array vazio em caso de erro
    return NextResponse.json({
      success: true,
      data: []
    });
  }
} 