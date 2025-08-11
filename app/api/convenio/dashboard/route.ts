import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Obter o token do cookie
    const cookieStore = cookies();
    const encodedToken = cookieStore.get('convenioToken')?.value;

    if (!encodedToken) {
      return NextResponse.json(
        { success: false, message: 'Token não encontrado' },
        { status: 401 }
      );
    }

    // Decodificar o token para obter as credenciais
    let tokenData;
    try {
      tokenData = JSON.parse(atob(encodedToken));
    } catch (error) {
      console.error('Erro ao decodificar token:', error);
      return NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401 }
      );
    }

    // Criar parâmetros no formato form-urlencoded para enviar para a API PHP
    const params = new URLSearchParams();
    params.append('userconv', tokenData.user);
    params.append('passconv', tokenData.senha);
    params.append('cod_convenio', tokenData.id);

    // Usar a API de autenticação que já retorna dados do convênio
    const response = await axios.post('https://sas.makecard.com.br/convenio_autenticar_app.php', 
      params, 
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    // Extrair JSON válido da resposta, ignorando warnings HTML
    let jsonData;
    try {
      const responseText = response.data;
      const jsonStart = responseText.indexOf('{');
      if (jsonStart !== -1) {
        const jsonString = responseText.substring(jsonStart);
        jsonData = JSON.parse(jsonString);
      } else {
        throw new Error('JSON não encontrado na resposta');
      }
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError);
      return NextResponse.json({
        success: false,
        message: 'Erro no formato da resposta do servidor'
      }, { status: 500 });
    }

    // Verificar se a resposta foi bem-sucedida
    if (jsonData && jsonData.tipo_login === 'login sucesso') {
      // Buscar dados reais para o dashboard usando as novas APIs
      try {
        const codConvenio = jsonData.cod_convenio;
        const mesCorrente = jsonData.mes_corrente;

        console.log('🔍 Dashboard Debug - codConvenio:', codConvenio, 'mesCorrente:', mesCorrente);
        console.log('🔍 Dashboard Debug - jsonData completo:', JSON.stringify(jsonData, null, 2));

        // Buscar dados das APIs em paralelo
        const [lancamentosResponse, vendasResponse, estornosResponse] = await Promise.allSettled([
          // Total de Lançamentos
          axios.post('https://sas.makecard.com.br/total_lancamentos_convenio_app.php', 
            new URLSearchParams({
              convenio: codConvenio.toString(),
              mes: mesCorrente
            }), 
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          ),
          
          // Total de Vendas
          axios.post('https://sas.makecard.com.br/total_vendas_convenio_app.php', 
            new URLSearchParams({
              convenio: codConvenio.toString(),
              mes: mesCorrente
            }), 
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          ),
          
          // Total de Estornos
          axios.post('https://sas.makecard.com.br/total_estornos_convenio_app.php', 
            new URLSearchParams({
              convenio: codConvenio.toString(),
              mes: mesCorrente
            }), 
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          )
        ]);

        // Processar resultados
        let totalLancamentos = 0;
        let totalVendas = 0;
        let totalEstornos = 0;

        console.log('🔍 Resposta Lançamentos:', lancamentosResponse.status, 
          lancamentosResponse.status === 'fulfilled' ? lancamentosResponse.value.data : lancamentosResponse.reason);
        
        console.log('🔍 Resposta Vendas:', vendasResponse.status, 
          vendasResponse.status === 'fulfilled' ? vendasResponse.value.data : vendasResponse.reason);
        
        console.log('🔍 Resposta Estornos:', estornosResponse.status, 
          estornosResponse.status === 'fulfilled' ? estornosResponse.value.data : estornosResponse.reason);

        if (lancamentosResponse.status === 'fulfilled' && lancamentosResponse.value.data?.success) {
          totalLancamentos = lancamentosResponse.value.data.total_lancamentos || 0;
        }

        if (vendasResponse.status === 'fulfilled' && vendasResponse.value.data?.success) {
          totalVendas = vendasResponse.value.data.total_vendas || 0;
        }

        if (estornosResponse.status === 'fulfilled' && estornosResponse.value.data?.success) {
          totalEstornos = estornosResponse.value.data.total_estornos || 0;
        }

        return NextResponse.json({
          success: true,
          data: {
            totalLancamentos,
            totalVendas,
            totalEstornos,
            totalAssociados: jsonData.total_associados || 0,
            mesCorrente,
            codConvenio
          }
        });
      } catch (dashboardError) {
        console.error('Erro ao buscar dados do dashboard:', dashboardError);
        // Em caso de erro, retornar valores padrão
        return NextResponse.json({
          success: true,
          data: {
            totalLancamentos: 0,
            totalVendas: 0,
            totalEstornos: 0,
            totalAssociados: 0,
            mesCorrente: jsonData.mes_corrente || '',
            codConvenio: jsonData.cod_convenio || 0
          }
        });
      }
    } else {
      return NextResponse.json({
        success: false,
        message: 'Sessão expirada ou inválida'
      }, { status: 401 });
    }
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}