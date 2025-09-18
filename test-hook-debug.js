// Teste para verificar o que o hook useAdesaoSasCred está retornando
const testHookStatus = async () => {
  try {
    console.log('🔍 Testando status do hook useAdesaoSasCred...');
    
    // Simular o que o hook faz internamente
    const storedUser = '{"matricula":"023999","nome":"William","cartao":"123456"}'; // Simular localStorage
    const userData = JSON.parse(storedUser);
    
    console.log('👤 Dados do usuário simulados:', userData);
    
    // Chamar a mesma API que o hook chama
    const response = await fetch('http://localhost:3001/api/verificar-adesao-sasmais-simples', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        codigo: userData.matricula
      })
    });

    console.log('📊 Status da resposta:', response.status);
    const resultado = await response.json();
    
    console.log('\n📋 RESPOSTA DA API (que o hook recebe):');
    console.log(JSON.stringify(resultado, null, 2));
    
    if (resultado.status === 'sucesso') {
      const jaAderiu = resultado.jaAderiu === true;
      console.log('\n🎯 PROCESSAMENTO DO HOOK:');
      console.log('- resultado.jaAderiu:', resultado.jaAderiu);
      console.log('- typeof resultado.jaAderiu:', typeof resultado.jaAderiu);
      console.log('- resultado.jaAderiu === true:', resultado.jaAderiu === true);
      console.log('- jaAderiu final:', jaAderiu);
      console.log('- Menu "Aderir" deveria aparecer:', !jaAderiu);
      console.log('- Menu "Aderir" deveria ser oculto:', jaAderiu);
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
};

testHookStatus();
