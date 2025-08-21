import { useState, useEffect, useRef } from 'react';
import { shouldForceAntecipacaoAdesaoCheck, markAntecipacaoAdesaoChecked, hasPendingAntecipacaoSignatureCheck, startAcceleratedAntecipacaoChecking } from '@/app/utils/antecipacaoAdesaoNotifications';

interface AdesaoAntecipacaoStatus {
  jaAderiu: boolean;
  loading: boolean;
  error: string | null;
  dadosAdesao: any | null;
  refresh: () => void;
}

export function useAdesaoAntecipacao(): AdesaoAntecipacaoStatus {
  const [status, setStatus] = useState<AdesaoAntecipacaoStatus>({
    jaAderiu: false,
    loading: true,
    error: null,
    dadosAdesao: null,
    refresh: () => {}
  });
  
  // Refs para evitar loops infinitos
  const isCheckingRef = useRef(false);
  const lastStatusRef = useRef(false);
  const eventDispatchedRef = useRef(false);
  const hookDestroyedRef = useRef(false);

  const verificarAdesao = async (isPolling = false, skipEventDispatch = false) => {
    // Evitar verificações simultâneas ou após destruição do hook
    if (isCheckingRef.current || hookDestroyedRef.current) {
      return lastStatusRef.current;
    }
    
    // Se já aderiu e já foi despachado evento, não verificar mais
    if (lastStatusRef.current && eventDispatchedRef.current && !isPolling) {
      return true;
    }
    
    isCheckingRef.current = true;
    
    if (!isPolling) {
      setStatus(prev => ({ ...prev, loading: true }));
    }
    
    try {
      // Obter dados do usuário do localStorage
      const storedUser = localStorage.getItem('qrcred_user');
      if (!storedUser) {
        console.log('❌ Antecipação: Usuário não encontrado no localStorage');
        setStatus(prev => ({
          ...prev,
          jaAderiu: false,
          loading: false,
          error: 'Dados do usuário não encontrados'
        }));
        return false;
      }

      const userData = JSON.parse(storedUser);
      
      // Obter a matrícula do usuário
      const localizaResponse = await fetch('/api/localiza-associado', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          cartao: userData.cartao,
          senha: userData.senha || '',
        }).toString(),
      });

      if (!localizaResponse.ok) {
        throw new Error('Erro ao buscar dados do usuário');
      }

      const responseText = await localizaResponse.text();
      let localizaData;
      
      try {
        localizaData = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Erro ao processar dados do usuário');
      }

      if (!localizaData?.matricula) {
        throw new Error('Matrícula não encontrada');
      }

      // Usar API específica para verificar adesão à antecipação (apenas existência)
      const response = await fetch('/api/verificar-adesao-antecipacao-simples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codigo: localizaData.matricula.toString()
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao verificar adesão à antecipação');
      }

      const resultado = await response.json();
      // teste
      console.log('🔍 Hook useAdesaoAntecipacao - Verificação DETALHADA:', {
        codigo: localizaData.matricula,
        status: resultado.status,
        jaAderiu: resultado.jaAderiu,
        dados: resultado.dados,
        mensagem: resultado.mensagem,
        debug: resultado.debug
      });

      const jaAderiu = resultado.status === 'sucesso' && resultado.jaAderiu === true;
      
      // Atualizar refs
      lastStatusRef.current = jaAderiu;
      
      // Disparar evento customizado se mudou o status (apenas uma vez)
      if (jaAderiu && !eventDispatchedRef.current && !skipEventDispatch) {
        console.log('🎉 Antecipação: Adesão detectada - disparando evento');
        window.dispatchEvent(new CustomEvent('antecipacaoAdesaoDetected', {
          detail: { dados: resultado.dados }
        }));
        eventDispatchedRef.current = true;
      }

      setStatus(prev => ({
        ...prev,
        jaAderiu,
        loading: false,
        error: null,
        dadosAdesao: resultado.dados,
        refresh: verificarAdesao
      }));

      // Marcar verificação como realizada
      markAntecipacaoAdesaoChecked();
      
      return jaAderiu;

    } catch (err) {
      console.error('❌ Erro na verificação de adesão à antecipação:', err);
      setStatus(prev => ({
        ...prev,
        jaAderiu: false,
        loading: false,
        error: err instanceof Error ? err.message : 'Erro desconhecido'
      }));
      return false;
    } finally {
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    verificarAdesao();

    // 🎯 POLLING INTELIGENTE para detectar assinatura digital
    let pollingInterval: NodeJS.Timeout | null = null;
    let pollingActive = true;

    const startPolling = () => {
      if (pollingInterval) return;
      
      pollingInterval = setInterval(async () => {
        if (!pollingActive || hookDestroyedRef.current || lastStatusRef.current) return;
        
        try {
          const jaAderiu = await verificarAdesao(true, true); // Skip event dispatch no polling
          
          // Se já aderiu, parar o polling permanentemente
          if (jaAderiu) {
            console.log('🛑 Antecipação: Usuário já aderiu - parando polling DEFINITIVAMENTE');
            pollingActive = false;
            if (pollingInterval) {
              clearInterval(pollingInterval);
              pollingInterval = null;
            }
          }
        } catch (error) {
          // Silenciar logs de erro no polling para evitar spam
        }
      }, 5000); // Verificar a cada 5 segundos
      
      console.log('🔄 Antecipação: Polling iniciado para detectar assinatura digital');
    };

    // Verificar se há assinatura pendente e iniciar verificação acelerada
    let startDelay: NodeJS.Timeout | null = null;
    
    if (hasPendingAntecipacaoSignatureCheck()) {
      console.log('🎯 Antecipação: Detectada possível assinatura pendente - iniciando verificação acelerada');
      startAcceleratedAntecipacaoChecking();
    } else {
      // Iniciar polling normal após 10 segundos (dar tempo para carregar)
      startDelay = setTimeout(() => {
        if (!status.jaAderiu && pollingActive) {
          startPolling();
        }
      }, 10000);
    }

    // Listener para quando o usuário volta para a aba (pode ter assinado em outra aba)
    const handleWindowFocus = () => {
      if (hookDestroyedRef.current) return;
      
      console.log('👁️ Antecipação: Janela recebeu foco - verificando possível assinatura');
      
      // Se há possível assinatura pendente, forçar verificação
      const possibleSignature = localStorage.getItem('antecipacao_possible_signature');
      if (possibleSignature) {
        console.log('✍️ Antecipação: Possível assinatura detectada - forçando verificação');
        verificarAdesao();
      }
    };

    // Listener para evento customizado de mudança de status
    const handleAntecipacaoStatusChanged = () => {
      if (hookDestroyedRef.current) return;
      console.log('🔔 Antecipação: Evento de mudança de status recebido');
      verificarAdesao();
    };

    // Listener para verificação forçada
    const handleForceCheck = () => {
      if (hookDestroyedRef.current) return;
      console.log('🔔 Antecipação: Verificação forçada solicitada');
      verificarAdesao();
    };

    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('antecipacaoAdesaoStatusChanged', handleAntecipacaoStatusChanged);
    window.addEventListener('forceAntecipacaoAdesaoCheck', handleForceCheck);

    return () => {
      hookDestroyedRef.current = true;
      pollingActive = false;
      
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      
      if (startDelay) {
        clearTimeout(startDelay);
      }
      
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('antecipacaoAdesaoStatusChanged', handleAntecipacaoStatusChanged);
      window.removeEventListener('forceAntecipacaoAdesaoCheck', handleForceCheck);
    };
  }, []);

  return status;
}
