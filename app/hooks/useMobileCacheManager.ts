import { useEffect, useRef } from 'react';
import { clearConvenioCache } from '@/app/utils/convenioCache';

/**
 * Hook para gerenciar cache em dispositivos móveis
 * Força limpeza agressiva quando detecta troca de usuário
 */
export function useMobileCacheManager() {
  const lastUserRef = useRef<string | null>(null);
  const isMobile = typeof navigator !== 'undefined' && 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  useEffect(() => {
    if (!isMobile) return;

    // Verificar se houve mudança de usuário
    const checkUserChange = () => {
      try {
        // Verificar token atual
        const cookieData = document.cookie
          .split('; ')
          .find(row => row.startsWith('convenioToken='))
          ?.split('=')[1];

        if (cookieData) {
          const tokenData = JSON.parse(atob(cookieData));
          const currentUser = tokenData.user;

          if (lastUserRef.current && lastUserRef.current !== currentUser) {
            console.log('📱 MOBILE CACHE - Detectada mudança de usuário:', {
              anterior: lastUserRef.current,
              atual: currentUser
            });
            
            // Limpeza agressiva
            clearConvenioCache();
            
            // Forçar recarregamento da página
            console.log('📱 MOBILE CACHE - Forçando recarregamento da página');
            setTimeout(() => {
              window.location.reload();
            }, 100);
          }

          lastUserRef.current = currentUser;
        }
      } catch (error) {
        console.warn('⚠️ MOBILE CACHE - Erro ao verificar mudança de usuário:', error);
      }
    };

    // Verificar na montagem
    checkUserChange();

    // Verificar periodicamente (para casos onde o token muda sem navegação)
    const interval = setInterval(checkUserChange, 2000);

    // Verificar quando a página ganha foco (usuário volta à aba)
    const handleFocus = () => {
      console.log('📱 MOBILE CACHE - Página ganhou foco, verificando mudanças');
      checkUserChange();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isMobile]);

  // Função para forçar limpeza manual
  const forceClearCache = () => {
    if (isMobile) {
      console.log('📱 MOBILE CACHE - Limpeza forçada manual');
      clearConvenioCache();
      
      // Limpar também cookies manualmente se possível
      try {
        document.cookie = 'convenioToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      } catch (error) {
        console.warn('⚠️ MOBILE CACHE - Erro ao limpar cookie manualmente:', error);
      }
    }
  };

  return {
    isMobile,
    forceClearCache
  };
}
