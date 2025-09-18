'use client';

import { useState, useEffect, useRef } from 'react';
import { hasPendingSignatureCheck, startAcceleratedChecking, clearSignatureFlags } from '@/app/utils/sascredNotifications';

interface UserData {
  matricula: string;
  nome: string;
  cpf: string;
  cartao: string;
  [key: string]: string;
}

interface AdesaoStatus {
  jaAderiu: boolean;
  loading: boolean;
  error: string | null;
  dadosAdesao: any | null;
  refresh: () => void;
}

export function useAdesaoSasCred(): AdesaoStatus {
  const [status, setStatus] = useState<AdesaoStatus>({
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
      // console.log('🚫 SasCred: Verificação já em andamento ou hook destruído - ignorando');
      return lastStatusRef.current;
    }
    
    // Se já aderiu e já foi despachado evento, não verificar mais
    if (lastStatusRef.current && eventDispatchedRef.current && !isPolling) {
      // console.log('🚫 SasCred: Já aderiu e evento já despachado - ignorando verificação');
      return true;
    }
    
    isCheckingRef.current = true;
    
    if (!isPolling) {
      setStatus(prev => ({ ...prev, loading: true }));
    }
    
    try {
      // Obter dados do usuário do localStorage
      const storedUser = localStorage.getItem('qrcred_user');
      console.log('🔍 DEBUG useAdesaoSasCred - storedUser:', storedUser);
      
      if (!storedUser) {
        setStatus(prev => ({
          ...prev,
          jaAderiu: false,
          loading: false,
          error: 'Usuário não encontrado',
          dadosAdesao: null
        }));
        lastStatusRef.current = false;
        return false;
      }

      const userData: UserData = JSON.parse(storedUser);
      console.log('🔍 DEBUG useAdesaoSasCred - userData:', userData);
      console.log('🔍 DEBUG useAdesaoSasCred - matricula:', userData.matricula);
      
      // Se não tiver matrícula, não pode verificar adesão
      if (!userData.matricula) {
        setStatus(prev => ({
          ...prev,
          jaAderiu: false,
          loading: false,
          error: null,
          dadosAdesao: null
        }));
        lastStatusRef.current = false;
        return false;
      }

      // Fazer chamada para a API de verificação de adesão (versão simples - apenas existência)
      const requestBody = {
        codigo: userData.matricula.toString()
      };
      
      console.log('🎯 DEBUG API REQUEST - Body que será enviado:', requestBody);
      console.log('🎯 DEBUG API REQUEST - userData.matricula original:', userData.matricula);
      console.log('🎯 DEBUG API REQUEST - userData.matricula.toString():', userData.matricula.toString());
      
      const response = await fetch('/api/verificar-adesao-sasmais-simples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const resultado = await response.json();
      console.log('🔍 DEBUG useAdesaoSasCred - resultado da API:', resultado);
      
      if (resultado.status === 'sucesso') {
        const jaAderiu = resultado.jaAderiu === true;
        console.log('🔍 DEBUG useAdesaoSasCred - jaAderiu calculado:', jaAderiu);
        const statusAnterior = lastStatusRef.current;
        
        setStatus(prev => ({
          ...prev,
          jaAderiu,
          loading: false,
          error: null,
          dadosAdesao: resultado.dados || null
        }));

        // Atualizar ref para próxima verificação
        lastStatusRef.current = jaAderiu;

        // Se mudou de não aderiu para aderiu E não devemos pular evento E ainda não foi despachado
        if (!statusAnterior && jaAderiu && !skipEventDispatch && !eventDispatchedRef.current) {
          console.log('🎉 SasCred: Status mudou para ADERIU - disparando evento ÚNICO');
          eventDispatchedRef.current = true;
          window.dispatchEvent(new CustomEvent('sascred-status-changed', {
            detail: { jaAderiu: true, dados: resultado.dados }
          }));
        }

        return jaAderiu;
      } else {
        setStatus(prev => ({
          ...prev,
          jaAderiu: false,
          loading: false,
          error: resultado.mensagem || 'Erro ao verificar adesão',
          dadosAdesao: null
        }));
        lastStatusRef.current = false;
        return false;
      }

    } catch (error) {
      console.error('Erro ao verificar adesão ao SasCred:', error);
      setStatus(prev => ({
        ...prev,
        jaAderiu: false,
        loading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        dadosAdesao: null
      }));
      lastStatusRef.current = false;
      return false;
    } finally {
      // Limpar flag de verificação
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
            console.log('🛑 SasCred: Usuário já aderiu - parando polling DEFINITIVAMENTE');
            pollingActive = false;
            if (pollingInterval) {
              clearInterval(pollingInterval);
              pollingInterval = null;
            }
          }
        } catch (error) {
          // Silenciar logs de erro no polling para evitar spam
          // console.log('Erro no polling SasCred:', error);
        }
      }, 5000); // Verificar a cada 5 segundos
      
      console.log('🔄 SasCred: Polling iniciado para detectar assinatura digital');
    };

    // Verificar se há assinatura pendente e iniciar verificação acelerada
    let startDelay: NodeJS.Timeout | null = null;
    
    if (hasPendingSignatureCheck()) {
      console.log('🎯 SasCred: Detectada possível assinatura pendente - iniciando verificação acelerada');
      startAcceleratedChecking();
    } else {
      // Iniciar polling normal após 10 segundos (dar tempo para carregar)
      startDelay = setTimeout(() => {
        if (!status.jaAderiu && pollingActive) {
          startPolling();
        }
      }, 10000);
    }

    // Listener para quando o usuário volta para a aba (pode ter assinado em outra aba)
    const handleVisibilityChange = () => {
      if (!document.hidden && !lastStatusRef.current && !hookDestroyedRef.current) {
        // console.log('👀 SasCred: Usuário voltou para a aba - verificando status');
        verificarAdesao(false, true);
      }
    };

    // Listener para mudanças no localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (hookDestroyedRef.current || lastStatusRef.current) return;
      
      if (e.key === 'adesao_status_changed') {
        verificarAdesao(false, true);
        localStorage.removeItem('adesao_status_changed');
      }
      
      // Verificar flags de force check
      if (e.key === 'sascred_force_check') {
        // console.log('⚡ SasCred: Flag de verificação forçada detectada');
        verificarAdesao(false, true);
      }
      
      // Verificar possível assinatura
      if (e.key === 'sascred_possible_signature') {
        // console.log('✍️ SasCred: Possível assinatura detectada - iniciando verificação acelerada');
        startAcceleratedChecking();
      }
    };

    // Remover listener de eventos customizados para evitar loop infinito
    // O hook só DISPARA eventos, não deve ESCUTAR seus próprios eventos
    
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      hookDestroyedRef.current = true;
      pollingActive = false;
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      if (startDelay) {
        clearTimeout(startDelay);
      }
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Adicionar função refresh ao status
  useEffect(() => {
    setStatus(prev => ({
      ...prev,
      refresh: verificarAdesao
    }));
  }, []);

  return status;
} 