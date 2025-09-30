import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Obter o token do cookie
    const cookieStore = cookies();
    const convenioToken = cookieStore.get('convenioToken');

    if (!convenioToken) {
      return NextResponse.json(
        { success: false, message: 'Token não encontrado' },
        { status: 401 }
      );
    }

    // Decodificar o token para obter os dados do convênio
    const tokenData = JSON.parse(atob(convenioToken.value));
    const codConvenio = parseInt(tokenData.id);

    // Verificar se o token não expirou (1 semana = 7 dias)
    const tokenTime = tokenData.timestamp;
    const currentTime = Date.now();
    const tokenAge = currentTime - tokenTime;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias em milissegundos
    
    console.log('🔍 ESTORNOS - Verificação de expiração:', {
      tokenTime: new Date(tokenTime).toISOString(),
      currentTime: new Date(currentTime).toISOString(),
      tokenAgeInMinutes: Math.floor(tokenAge / 60000),
      maxAgeInMinutes: Math.floor(maxAge / 60000),
      isExpired: tokenAge > maxAge
    });
    
    if (tokenAge > maxAge) {
      console.log('❌ ESTORNOS - Token expirado localmente');
      return NextResponse.json({
        success: false,
        message: 'Sessão expirada. Faça login novamente.'
      }, { status: 401 });
    }

    // Preparar dados para enviar para a API PHP
    const params = {
      convenio: codConvenio
    };

    console.log('Enviando requisição para API de estornos realizados:', params);

    // Fazer a requisição para a API PHP
    const response = await axios.post(
      'https://sas.makecard.com.br/estornos_realizados.php',
      params,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Resposta da API estornos_realizados:', response.data);

    if (response.data && response.data.success) {
      return NextResponse.json({
        success: true,
        data: response.data.data
      });
    } else {
      return NextResponse.json({
        success: false,
        message: response.data?.message || 'Erro ao buscar estornos'
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Erro ao buscar estornos:', error);
    
    let errorMessage = 'Erro ao buscar estornos';
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    }
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
} 