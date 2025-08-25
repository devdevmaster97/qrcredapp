/**
 * Utilitários para gerenciamento de cache do convênio
 * Previne problemas de dados incorretos sendo exibidos
 */

export interface ConvenioData {
  cod_convenio: string | number;
  razaosocial: string;
  cnpj: string;
  cpf: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface ConvenioToken {
  id: string | number;
  user: string;
  senha: string;
  timestamp: number;
}

/**
 * Limpar COMPLETAMENTE todos os dados de convênio
 */
export function clearConvenioCache(): void {
  console.log('🧹 CACHE - Limpando TODOS os dados de convênio...');
  
  // Detectar dispositivo móvel
  const isMobile = typeof navigator !== 'undefined' && 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Remover dados do localStorage
  localStorage.removeItem('dadosConvenio');
  localStorage.removeItem('convenioUsuariosSalvos');
  
  if (isMobile) {
    console.log('📱 CACHE - Limpeza agressiva para dispositivo móvel');
    
    // Limpeza adicional para dispositivos móveis
    sessionStorage.removeItem('dadosConvenio');
    sessionStorage.removeItem('convenioUsuariosSalvos');
    sessionStorage.removeItem('convenioToken');
    
    // Limpar possíveis chaves relacionadas
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('convenio') || key.includes('Convenio')) {
          localStorage.removeItem(key);
          console.log(`🧹 CACHE - Removido localStorage: ${key}`);
        }
      });
      
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.includes('convenio') || key.includes('Convenio')) {
          sessionStorage.removeItem(key);
          console.log(`🧹 CACHE - Removido sessionStorage: ${key}`);
        }
      });
    } catch (error) {
      console.warn('⚠️ CACHE - Erro ao limpar chaves relacionadas:', error);
    }
  }
  
  // Log para confirmar limpeza
  console.log('✅ CACHE - Cache de convênio completamente limpo' + (isMobile ? ' (modo móvel)' : ''));
}

/**
 * Validar se o cache corresponde ao token atual
 */
export function validateConvenioCache(): { isValid: boolean; cacheData?: ConvenioData; tokenData?: ConvenioToken } {
  try {
    // Verificar dados do cache
    const storedData = localStorage.getItem('dadosConvenio');
    if (!storedData) {
      console.log('❌ CACHE - Nenhum cache encontrado');
      return { isValid: false };
    }

    const cacheData: ConvenioData = JSON.parse(storedData);

    // Verificar token atual
    const cookieData = document.cookie
      .split('; ')
      .find(row => row.startsWith('convenioToken='))
      ?.split('=')[1];

    if (!cookieData) {
      console.log('❌ CACHE - Token não encontrado nos cookies');
      clearConvenioCache(); // Limpar cache órfão
      return { isValid: false };
    }

    const tokenData: ConvenioToken = JSON.parse(atob(cookieData));

    // Comparar cod_convenio do cache com ID do token
    const cacheConvenio = String(cacheData.cod_convenio);
    const tokenConvenio = String(tokenData.id);

    if (cacheConvenio === tokenConvenio) {
      console.log('✅ CACHE - Cache válido:', {
        cache_convenio: cacheConvenio,
        token_convenio: tokenConvenio,
        razaosocial: cacheData.razaosocial
      });
      return { isValid: true, cacheData, tokenData };
    } else {
      console.log('❌ CACHE - Cache INVÁLIDO (convênio não corresponde):', {
        cache_convenio: cacheConvenio,
        token_convenio: tokenConvenio,
        cache_razaosocial: cacheData.razaosocial,
        token_user: tokenData.user
      });
      clearConvenioCache(); // Limpar cache inválido
      return { isValid: false, cacheData, tokenData };
    }

  } catch (error) {
    console.error('❌ CACHE - Erro ao validar cache:', error);
    clearConvenioCache(); // Limpar cache corrompido
    return { isValid: false };
  }
}

/**
 * Salvar dados de convênio no cache com validação
 */
export function saveConvenioCache(data: ConvenioData): void {
  try {
    console.log('💾 CACHE - Salvando dados do convênio:', {
      cod_convenio: data.cod_convenio,
      razaosocial: data.razaosocial,
      timestamp: new Date().toISOString()
    });

    // Limpar cache anterior primeiro
    clearConvenioCache();

    // Salvar novos dados
    localStorage.setItem('dadosConvenio', JSON.stringify(data));

    console.log('✅ CACHE - Dados salvos com sucesso');
  } catch (error) {
    console.error('❌ CACHE - Erro ao salvar dados:', error);
  }
}
