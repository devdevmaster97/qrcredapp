import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  console.log('🔥 API /api/conta INICIADA - Recebendo requisição');
  console.log('🔥 URL da requisição:', request.url);
  console.log('🔥 Method:', request.method);
  console.log('🔥 Headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    let matricula: string;
    let empregador: string | number;
    let mes: string;
    let divisao: string | number;
    let id: string | number;
    
    // Verificar o Content-Type e processar a request apropriadamente
    const contentType = request.headers.get('Content-Type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      matricula = formData.get('matricula') as string;
      empregador = formData.get('empregador') as string;
      mes = formData.get('mes') as string;
      divisao = formData.get('divisao') as string;
      id = formData.get('id') as string;
    } else {
      // Assume JSON
      const body = await request.json();
      matricula = body.matricula;
      empregador = body.empregador;
      mes = body.mes;
      divisao = body.divisao;
      id = body.id;
    }
    
    // Debug dos parâmetros recebidos
    console.log('Parâmetros recebidos para conta:', { matricula, empregador, mes, divisao, id });
    console.log('Tipos dos parâmetros:', { 
      matricula: typeof matricula, 
      empregador: typeof empregador, 
      mes: typeof mes, 
      divisao: typeof divisao, 
      id: typeof id 
    });

    // Verificar dados necessários
    if (!matricula || !empregador || !mes) {
      console.log('Faltam parâmetros obrigatórios');
      return NextResponse.json(
        { error: 'Matricula, empregador e mês são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar dados do associado para obter o ID (campo integer da tabela sind.associado)
    console.log('🔍 Buscando dados do associado para obter ID...');
    
    const associadoResponse = await axios.post(
      'https://sas.makecard.com.br/localizaasapp.php',
      `matricula=${encodeURIComponent(matricula)}&empregador=${encodeURIComponent(empregador.toString())}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('🔍 Resposta da API do associado:', associadoResponse.data);

    if (!associadoResponse.data || !associadoResponse.data.id) {
      console.error('❌ ID do associado não encontrado');
      return NextResponse.json(
        { error: 'ID do associado não encontrado' },
        { status: 400 }
      );
    }

    if (!associadoResponse.data.id_divisao) {
      console.error('❌ Divisão do associado não encontrada');
      return NextResponse.json(
        { error: 'Divisão do associado não encontrada' },
        { status: 400 }
      );
    }

    const idAssociado = associadoResponse.data.id;
    const divisaoAssociado = associadoResponse.data.id_divisao;
    console.log('✅ ID do associado obtido:', idAssociado);
    console.log('✅ Divisão do associado obtida:', divisaoAssociado);

    // Preparar os dados para enviar ao backend
    const payload = new URLSearchParams();
    payload.append('matricula', matricula);
    payload.append('empregador', empregador.toString());
    payload.append('mes', mes);
    payload.append('id', idAssociado.toString()); // ID obrigatório do associado
    payload.append('divisao', divisaoAssociado.toString()); // Divisão obrigatória do associado
    
    console.log('Dados sendo enviados para conta_app.php:', {
      matricula,
      empregador: empregador.toString(),
      mes,
      divisao: divisaoAssociado,
      id: idAssociado
    });
    console.log('Payload completo (URLSearchParams):', payload.toString());
    console.log('Parâmetros individuais do payload:');
    const entries = Array.from(payload.entries());
    entries.forEach(([key, value]) => {
      console.log(`  ${key}: "${value}" (tipo: ${typeof value})`);
    });
    
    // Enviar a requisição para o backend
    const response = await axios.post(
      'https://sas.makecard.com.br/conta_app.php',
      payload,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000, // 10 segundos de timeout
      }
    );

    console.log('Resposta do endpoint conta:', response.data);
    console.log('Status da resposta:', response.status);
    console.log('Headers da resposta:', response.headers);
    console.log('Tipo da resposta:', typeof response.data);
    console.log('É array?', Array.isArray(response.data));
    console.log('Quantidade de registros:', Array.isArray(response.data) ? response.data.length : 'N/A');
    
    if (Array.isArray(response.data) && response.data.length > 0) {
      console.log('Primeiro registro:', response.data[0]);
    } else if (response.data && typeof response.data === 'object') {
      console.log('Resposta como objeto:', response.data);
    }

    // Verificar e retornar a resposta
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('🔥 ERRO na API de conta:', error);
    console.error('🔥 Stack trace:', error instanceof Error ? error.stack : 'N/A');
    
    let errorMessage = 'Erro ao processar a requisição';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Timeout na conexão com o servidor';
      } else if (error.response) {
        statusCode = error.response.status;
        errorMessage = `Erro ${statusCode} do servidor`;
        console.log('Dados do erro:', error.response.data);
      } else if (error.request) {
        errorMessage = 'Sem resposta do servidor';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: statusCode }
    );
  }
} 