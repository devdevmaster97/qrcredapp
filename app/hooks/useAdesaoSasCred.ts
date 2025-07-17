'use client';

import { useState, useEffect } from 'react';
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

  const verificarAdesao = async (isPolling = false) => {
    if (!isPolling) {
      setStatus(prev => ({ ...prev, loading: true }));
    }
    
    try {
      // Obter dados do usuário do localStorage
      const storedUser = localStorage.getItem('qrcred_user');
      
      if (!storedUser) {
        setStatus(prev => ({
          ...prev,
          jaAderiu: false,
          loading: false,
          error: 'Usuário não encontrado',
          dadosAdesao: null
        }));
        return false;
      }

      const userData: UserData = JSON.parse(storedUser);
      
      // Se não tiver matrícula, não pode verificar adesão
      if (!userData.matricula) {
        setStatus(prev => ({
          ...prev,
          jaAderiu: false,
          loading: false,
          error: null,
          dadosAdesao: null
        }));
        return false;
      }

      // Fazer chamada para a API de verificação de adesão (versão simples - apenas existência)
      const response = await fetch('/api/verificar-adesao-sasmais-simples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codigo: userData.matricula.toString()
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const resultado = await response.json();
      
      if (resultado.status === 'sucesso') {
        const jaAderiu = resultado.jaAderiu === true;
        const statusAnterior = status.jaAderiu;
        
        setStatus(prev => ({
          ...prev,
          jaAderiu,
          loading: false,
          error: null,
          dadosAdesao: resultado.dados || null
        }));

        // Se mudou de não aderiu para aderiu, disparar evento
        if (!statusAnterior && jaAderiu) {
          console.log('🎉 SasCred: Status mudou para ADERIU - disparando evento');
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
      return false;
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
        if (!pollingActive) return;
        
        try {
          const jaAderiu = await verificarAdesao(true);
          
          // Se já aderiu, parar o polling
          if (jaAderiu) {
            console.log('🛑 SasCred: Usuário já aderiu - parando polling');
            if (pollingInterval) {
              clearInterval(pollingInterval);
              pollingInterval = null;
            }
          }
        } catch (error) {
          console.log('Erro no polling SasCred:', error);
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
      if (!document.hidden && !status.jaAderiu) {
        console.log('👀 SasCred: Usuário voltou para a aba - verificando status');
        verificarAdesao();
      }
    };

    // Listener para mudanças no localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'adesao_status_changed') {
        verificarAdesao();
        localStorage.removeItem('adesao_status_changed');
      }
      
      // Verificar flags de force check
      if (e.key === 'sascred_force_check') {
        console.log('⚡ SasCred: Flag de verificação forçada detectada');
        verificarAdesao();
      }
      
      // Verificar possível assinatura
      if (e.key === 'sascred_possible_signature') {
        console.log('✍️ SasCred: Possível assinatura detectada - iniciando verificação acelerada');
        startAcceleratedChecking();
      }
    };

    // Listener para eventos customizados
    const handleCustomEvent = (e: Event) => {
      console.log('🔄 SasCred: Evento customizado recebido - verificando status');
      verificarAdesao();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sascred-status-changed', handleCustomEvent);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      pollingActive = false;
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      if (startDelay) {
        clearTimeout(startDelay);
      }
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sascred-status-changed', handleCustomEvent);
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