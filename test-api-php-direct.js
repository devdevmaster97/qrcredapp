// Teste direto da API PHP para verificar se há problema
const testApiPhpDirect = async () => {
  try {
    console.log('🔍 Testando API PHP diretamente...');
    
    const requestBody = { codigo: '023999' };
    console.log('📤 Enviando para API PHP:', requestBody);
    
    const response = await fetch('https://sas.makecard.com.br/api_verificar_adesao_sasmais.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
      cache: 'no-store'
    });

    console.log('📊 Status da resposta PHP:', response.status);
    console.log('📊 StatusText:', response.statusText);
    console.log('📊 Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('❌ Erro na resposta:', response.status, response.statusText);
      return;
    }

    const responseText = await response.text();
    console.log('📄 Resposta bruta da API PHP:');
    console.log(responseText);
    
    try {
      const data = JSON.parse(responseText);
      console.log('📋 JSON parseado:');
      console.log(JSON.stringify(data, null, 2));
      
      console.log('\n🎯 ANÁLISE:');
      console.log('- Status:', data.status);
      console.log('- jaAderiu:', data.jaAderiu);
      console.log('- Mensagem:', data.mensagem);
      console.log('- Tem dados:', data.dados ? 'SIM' : 'NÃO');
      
      if (data.dados) {
        console.log('- Dados do associado:', data.dados);
      }
      
    } catch (parseError) {
      console.error('❌ Erro no parse JSON:', parseError);
      console.log('📄 Texto que causou erro (primeiros 500 chars):');
      console.log(responseText.substring(0, 500));
    }

  } catch (error) {
    console.error('💥 Erro no teste:', error);
  }
};

testApiPhpDirect();
