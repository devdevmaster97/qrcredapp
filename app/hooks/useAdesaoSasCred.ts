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
  temAntecipacao: boolean;
  loading: boolean;
  error: string | null;
  dadosAdesao: any | null;
  refresh: () => void;
}

export function useAdesaoSasCred(): AdesaoStatus {
  // 🚀 CARREGAR CACHE DO LOCALSTORAGE IMEDIATAMENTE
  const getCachedStatus = (): { jaAderiu: boolean; temAntecipacao: boolean; dadosAdesao: any | null } => {
    try {
      const cached = localStorage.getItem('sascred_adesao_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        const cacheAge = Date.now() - (parsed.timestamp || 0);
        // Cache válido por 5 minutos
        if (cacheAge < 5 * 60 * 1000) {
          console.log('✅ SasCred: Cache encontrado e válido', parsed);
          return {
            jaAderiu: parsed.jaAderiu || false,
            temAntecipacao: parsed.temAntecipacao || false,
            dadosAdesao: parsed.dadosAdesao || null,
          };
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao ler cache:', error);
    }
    return { jaAderiu: false, temAntecipacao: false, dadosAdesao: null };
  };

  const cachedData = getCachedStatus();
  
  const [status, setStatus] = useState<AdesaoStatus>({
    jaAderiu: cachedData.jaAderiu,
    temAntecipacao: false,
    loading: true,
    error: null,
    dadosAdesao: cachedData.dadosAdesao,
    refresh: () => {}
  });

  // Ref para controlar se o componente ainda está montado
  const isMountedRef = useRef(true);
  const lastStatusRef = useRef<boolean>(cachedData.jaAderiu);
  
  // 🎯 PROTEÇÃO CONTRA MÚLTIPLAS CHAMADAS SIMULTÂNEAS
  const isCheckingRef = useRef(false);
  const eventDispatchedRef = useRef(false);
  const hookDestroyedRef = useRef(false);

  const verificarAdesao = async (isPolling = false, skipEventDispatch = false) => {
    console.log('🚀 SasCred: INICIANDO verificação - isPolling:', isPolling, 'isChecking:', isCheckingRef.current);
    
    // Evitar verificações simultâneas ou após destruição do hook
    if (isCheckingRef.current || hookDestroyedRef.current) {
      console.log('🚫 SasCred: Verificação já em andamento ou hook destruído - ignorando');
      return lastStatusRef.current;
    }
    
    // Se já aderiu e já foi despachado evento, não verificar mais
    if (lastStatusRef.current && eventDispatchedRef.current && !isPolling) {
      console.log('🚫 SasCred: Já aderiu e evento já despachado - ignorando verificação');
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

      // Primeiro buscar dados completos do associado para obter id e id_divisao
      console.log('🔍 Buscando dados completos do associado...');
      const formDataAssociado = new FormData();
      formDataAssociado.append('cartao', userData.cartao);
      formDataAssociado.append('senha', userData.senha || '');
      
      const associadoResponse = await fetch('/api/localiza-associado', {
        method: 'POST',
        body: formDataAssociado
      });

      if (!associadoResponse.ok) {
        console.warn('⚠️ Erro ao buscar dados do associado, usando apenas código');
        console.log('🔍 Status da resposta:', associadoResponse.status);
        
        // Fallback: usar apenas código se não conseguir buscar dados completos
        const requestBody = {
          codigo: userData.matricula.toString()
        };
        
        console.log('📤 Enviando requisição de fallback com:', requestBody);
        
        const response = await fetch('/api/verificar-adesao-sasmais-simples', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });
        
        console.log('📥 Resposta da API verificar-adesao (fallback):', {
          ok: response.ok,
          status: response.status
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('🔍 DEBUG FALLBACK - resultado completo:', result);
          console.log('🔍 DEBUG FALLBACK - result.jaAderiu:', result.jaAderiu);
          console.log('🔍 DEBUG FALLBACK - typeof result.jaAderiu:', typeof result.jaAderiu);
          
          const jaAderiu = result.jaAderiu || false;
          
          // 💾 SALVAR NO CACHE (FALLBACK 1)
          try {
            localStorage.setItem('sascred_adesao_cache', JSON.stringify({
              jaAderiu,
              dadosAdesao: result.dados || null,
              timestamp: Date.now()
            }));
            console.log('💾 SasCred: Status salvo no cache (fallback 1)');
          } catch (error) {
            console.warn('⚠️ Erro ao salvar cache:', error);
          }
          
          if (isMountedRef.current) {
            setStatus(prev => ({
              ...prev,
              jaAderiu,
              loading: false,
              dadosAdesao: result.dados || null
            }));
            lastStatusRef.current = jaAderiu;
            console.log('✅ Estado atualizado no fallback - jaAderiu:', jaAderiu);
          }
          return jaAderiu;
        } else {
          console.error('❌ Erro na API verificar-adesao (fallback):', response.status);
        }
        return false;
      }

      const associadoData = await associadoResponse.json();
      
      if (!associadoData?.id || !associadoData?.id_divisao) {
        console.warn('⚠️ ID ou ID divisão não encontrados, usando apenas código');
        // Fallback: usar apenas código
        const requestBody = {
          codigo: userData.matricula.toString()
        };
        
        const response = await fetch('/api/verificar-adesao-sasmais-simples', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });
        
        if (response.ok) {
          const result = await response.json();
          
          const jaAderiu = result.jaAderiu || false;
          
          // 💾 SALVAR NO CACHE (FALLBACK 2)
          try {
            localStorage.setItem('sascred_adesao_cache', JSON.stringify({
              jaAderiu,
              dadosAdesao: result.dados || null,
              timestamp: Date.now()
            }));
            console.log('💾 SasCred: Status salvo no cache (fallback 2)');
          } catch (error) {
            console.warn('⚠️ Erro ao salvar cache:', error);
          }
          
          if (isMountedRef.current) {
            setStatus(prev => ({
              ...prev,
              jaAderiu,
              loading: false,
              dadosAdesao: result.dados || null
            }));
            lastStatusRef.current = jaAderiu;
          }
          return jaAderiu;
        }
        return false;
      }

      console.log('📋 Dados do associado obtidos:', {
        matricula: associadoData.matricula,
        id: associadoData.id,
        id_divisao: associadoData.id_divisao
      });

      // Fazer chamada para a API de verificação de adesão com todos os parâmetros
      const requestBody = {
        codigo: userData.matricula.toString(),
        id: associadoData.id,
        id_divisao: associadoData.id_divisao
      };
      
      console.log('🎯 DEBUG API REQUEST - Body que será enviado:', requestBody);
      
      const apiUrl = '/api/verificar-adesao-sasmais-simples';
      console.log('🎯 DEBUG API REQUEST - URL que será chamada:', apiUrl);
      
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
      console.log('🔍 DEBUG useAdesaoSasCred - resultado.status:', resultado.status);
      console.log('🔍 DEBUG useAdesaoSasCred - resultado.jaAderiu:', resultado.jaAderiu);
      console.log('🔍 DEBUG useAdesaoSasCred - typeof resultado.jaAderiu:', typeof resultado.jaAderiu);
      
      if (resultado.status === 'sucesso') {
        const jaAderiu = resultado.jaAderiu === true;
        console.log('🔍 DEBUG useAdesaoSasCred - jaAderiu calculado:', jaAderiu);
        console.log('🔍 DEBUG useAdesaoSasCred - Comparação: resultado.jaAderiu === true?', resultado.jaAderiu === true);
        const statusAnterior = lastStatusRef.current;

        // Verificar se o usuário também tem contrato de Antecipação (tipo=2)
        let temAntecipacao = false;
        if (jaAderiu) {
          try {
            const antecipReqBody: Record<string, unknown> = { codigo: userData.matricula.toString() };
            if (associadoData?.id)         antecipReqBody.id         = associadoData.id;
            if (associadoData?.id_divisao) antecipReqBody.id_divisao = associadoData.id_divisao;

            const antecipResp = await fetch('/api/verificar-antecipacao-sascred', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(antecipReqBody),
            });
            if (antecipResp.ok) {
              const antecipData = await antecipResp.json();
              temAntecipacao = antecipData.temAntecipacao === true;
              console.log('🔍 temAntecipacao:', temAntecipacao);
            }
          } catch (e) {
            console.warn('⚠️ Erro ao verificar antecipação:', e);
          }
        }
        
        // 💾 SALVAR NO CACHE DO LOCALSTORAGE
        try {
          localStorage.setItem('sascred_adesao_cache', JSON.stringify({
            jaAderiu,
            temAntecipacao,
            dadosAdesao: resultado.dados || null,
            timestamp: Date.now()
          }));
          console.log('💾 SasCred: Status salvo no cache');
        } catch (error) {
          console.warn('⚠️ Erro ao salvar cache:', error);
        }
        
        setStatus(prev => ({
          ...prev,
          jaAderiu,
          temAntecipacao,
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
      console.log('🏁 SasCred: Verificação finalizada - flag limpo');
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