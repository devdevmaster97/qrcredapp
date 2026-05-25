import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PHP_BASE_URL = process.env.PHP_BASE_URL || 'https://sas.makecard.com.br/api/seguro-beneficiarios';

let callCounter = 0;
const activeRequests = new Map<string, Promise<any>>();

export async function POST(request: NextRequest) {
  const callId = ++callCounter;
  const timestamp = new Date().toISOString();
  
  console.log(`📝 [CALL #${callId}] API CRIAR - Iniciando às ${timestamp}`);
  
  try {
    const body = await request.json();
    const { id_associado, id_divisao, quantidade } = body;
    
    // Criar chave única para esta requisição
    const requestKey = `${id_associado}-${id_divisao}-${quantidade}`;
    
    // Verificar se já existe uma requisição idêntica em andamento
    if (activeRequests.has(requestKey)) {
      console.log(`⚠️ [CALL #${callId}] REQUISIÇÃO DUPLICADA DETECTADA! Aguardando requisição anterior...`);
      const existingRequest = activeRequests.get(requestKey);
      return await existingRequest;
    }
    
    // Delay de 100ms para evitar race condition
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verificar novamente após delay
    if (activeRequests.has(requestKey)) {
      console.log(`⚠️ [CALL #${callId}] REQUISIÇÃO DUPLICADA DETECTADA APÓS DELAY! Aguardando requisição anterior...`);
      const existingRequest = activeRequests.get(requestKey);
      return await existingRequest;
    }

    console.log(`📝 [CALL #${callId}] Parâmetros recebidos:`, { id_associado, id_divisao, quantidade });

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

    // Chamar endpoint PHP no servidor
    const phpUrl = `${PHP_BASE_URL}/seguro_beneficiarios_criar.php`;
    console.log(`🔌 [CALL #${callId}] Chamando PHP:`, phpUrl);

    // Criar Promise para esta requisição e armazená-la
    const requestPromise = (async () => {
      try {
        // Adicionar timestamp único para PHP detectar duplicatas
        const uniqueTimestamp = Date.now() + Math.random();
        
        const response = await fetch(phpUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': `${callId}-${uniqueTimestamp}`,
          },
          body: JSON.stringify({ 
            id_associado, 
            id_divisao, 
            quantidade,
            _request_timestamp: uniqueTimestamp 
          }),
        });

        const data = await response.json();
        console.log(`📥 [CALL #${callId}] Resposta do PHP:`, data);
        console.log(`✅ [CALL #${callId}] Finalizando com sucesso`);

        if (!response.ok) {
          return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
      } finally {
        // Remover da lista de requisições ativas após conclusão
        activeRequests.delete(requestKey);
        console.log(`🧹 [CALL #${callId}] Requisição removida do cache`);
      }
    })();

    // Armazenar a Promise no Map
    activeRequests.set(requestKey, requestPromise);
    
    return await requestPromise;

  } catch (error: any) {
    console.error(`❌ [CALL #${callId}] ERRO ao chamar PHP:`, error);
    console.error(`❌ [CALL #${callId}] Detalhes do erro:`, {
      message: error.message,
      name: error.name,
    });
    
    // Limpar requisição do Map em caso de erro
    const body = await request.clone().json().catch(() => ({}));
    const requestKey = `${body.id_associado}-${body.id_divisao}-${body.quantidade}`;
    activeRequests.delete(requestKey);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao criar beneficiários',
        details: error.message
      },
      { status: 500 }
    );
  }
}
