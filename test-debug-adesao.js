// Teste da API de debug de adesão SasCred
const testDebugAdesao = async () => {
  try {
    console.log('🔍 Testando API de debug de adesão SasCred...');
    
    const response = await fetch('http://localhost:3001/api/debug-adesao-sascred', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        codigo: '023995' // Matrícula de teste - WILLIAM RIBEIRO DE OLIVEIRA
      })
    });

    console.log('📊 Status da resposta:', response.status);
    console.log('📊 Headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    
    console.log('\n📋 RESULTADO COMPLETO:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.resultado_final) {
      console.log('\n🎯 RESULTADO FINAL:');
      console.log('- jaAderiu:', data.resultado_final.jaAderiu);
      console.log('- Motivo:', data.resultado_final.motivo);
      console.log('- Deveria ocultar menu Aderir:', data.resultado_final.deveria_ocultar_menu_aderir);
    }
    
    if (data.analise_detalhada) {
      console.log('\n🔍 ANÁLISE DETALHADA:');
      console.log('- Status API PHP:', data.analise_detalhada.status_api);
      console.log('- jaAderiu original:', data.analise_detalhada.jaAderiu_original);
      console.log('- Tipo jaAderiu:', data.analise_detalhada.tipo_jaAderiu);
      console.log('- Mensagem original:', data.analise_detalhada.mensagem_original);
      console.log('- Tem dados:', data.analise_detalhada.tem_dados);
      console.log('- Keys dos dados:', data.analise_detalhada.dados_keys);
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
};

testDebugAdesao();
