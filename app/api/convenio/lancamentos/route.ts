import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Obter o token do cookie
    const cookieStore = request.cookies;
    const convenioToken = cookieStore.get('convenioToken');

    if (!convenioToken) {
      return NextResponse.json(
        { success: false, message: 'Token não encontrado' },
        { status: 401 }
      );
    }

    // Decodificar o token para obter os dados do convênio
    const tokenData = JSON.parse(atob(convenioToken.value));
    const codConvenio = tokenData.id;

    // Criar parâmetros para a API PHP
    const params = new URLSearchParams();
    params.append('cod_convenio', codConvenio.toString());

    // Fazer a requisição para a API PHP
    const response = await axios.get(
      'https://sas.makecard.com.br/listar_lancamentos_convenio_app.php',
      {
        params,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('Resposta API Lançamentos:', response.data);

    // DEBUG: Verificar especificamente AGO/2025
    if (response.data.lancamentos) {
      const temAgo2025 = response.data.lancamentos.some((l: any) => l.mes === 'AGO/2025');
      const mesesUnicos = Array.from(new Set(response.data.lancamentos.map((l: any) => l.mes)));
      console.log('🔍 DEBUG API - Total lançamentos retornados:', response.data.lancamentos.length);
      console.log('🔍 DEBUG API - Tem AGO/2025 na resposta?', temAgo2025);
      console.log('🔍 DEBUG API - Meses únicos na resposta:', mesesUnicos);
      console.log('🔍 DEBUG API - Código do convênio:', codConvenio);
    }

    if (response.data.success) {
      return NextResponse.json({
        success: true,
        data: response.data.lancamentos
      });
    } else {
      return NextResponse.json({
        success: false,
        message: response.data.message || 'Erro ao buscar lançamentos'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Erro ao buscar lançamentos:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao buscar lançamentos' },
      { status: 500 }
    );
  }
} 