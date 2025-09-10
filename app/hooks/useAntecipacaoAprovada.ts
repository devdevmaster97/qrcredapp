import { useState, useEffect } from 'react';
import { shouldForceAntecipacaoCheck, markAntecipacaoChecked } from '@/app/utils/antecipacaoNotifications';
import { verificarAssinaturaPorUrl } from '@/app/utils/assinatura';

interface UseAntecipacaoAprovadaResult {
  aprovada: boolean;
  loading: boolean;
  error: string | null;
}

export function useAntecipacaoAprovada(): UseAntecipacaoAprovadaResult {
  const [aprovada, setAprovada] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const verificarAprovacao = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obter dados do usuário do localStorage
        const storedUser = localStorage.getItem('qrcred_user');
        if (!storedUser) {
          if (isMounted) {
            setAprovada(false);
            setLoading(false);
          }
          return;
        }

        const userData = JSON.parse(storedUser);
        
        // Primeiro, obter a matrícula do usuário
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

        // Usar API específica para verificar antecipação com todos os campos necessários
        const response = await fetch('/api/verificar-antecipacao-sasmais', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            codigo: localizaData.matricula.toString()
          })
        });

        if (!response.ok) {
          throw new Error('Erro ao verificar dados da antecipação');
        }

        const resultado = await response.json();
        
        console.log('🔍 Hook useAntecipacaoAprovada - API específica antecipação:', {
          codigo: localizaData.matricula,
          status: resultado.status,
          antecipacao_aprovada: resultado.antecipacao_aprovada,
          criterios: resultado.criterios
        });

        if (isMounted) {
          let isAprovada = false;
          
          // Usar resultado direto da API específica
          if (resultado.status === 'sucesso') {
            isAprovada = resultado.antecipacao_aprovada || false;
            
            if (isAprovada) {
              console.log('✅ ANTECIPAÇÃO APROVADA pela API específica');
            } else {
              console.log('❌ Antecipação não aprovada:', resultado.criterios);
            }
          } else {
            console.log('❌ Erro na API de antecipação:', resultado.mensagem);
          }
          
          console.log('✅ Definindo antecipacaoAprovada como:', isAprovada);
          setAprovada(isAprovada);
          
          // Marcar que a verificação foi realizada
          markAntecipacaoChecked();
        }

      } catch (err) {
        console.error('❌ Erro no hook useAntecipacaoAprovada:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Erro desconhecido');
          setAprovada(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Verificação inicial
    verificarAprovacao();

    // Configurar verificação periódica a cada 15 segundos (mais frequente)
    intervalId = setInterval(() => {
      if (isMounted) {
        // Verificar se deve forçar uma nova verificação
        const shouldForce = shouldForceAntecipacaoCheck();
        if (shouldForce) {
          console.log('🔔 Verificação forçada da aprovação da antecipação');
          verificarAprovacao();
        } else {
          console.log('🔄 Verificação periódica da aprovação da antecipação');
          verificarAprovacao();
        }
      }
    }, 15000); // 15 segundos

    // Listener para verificação quando a janela recebe foco
    const handleWindowFocus = () => {
      if (isMounted) {
        console.log('👁️ Janela recebeu foco - verificando aprovação da antecipação');
        verificarAprovacao();
      }
    };

    // Listener para evento customizado de mudança de status
    const handleAntecipacaoStatusChanged = () => {
      if (isMounted) {
        console.log('🔔 Evento de mudança de status da antecipação recebido');
        verificarAprovacao();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleWindowFocus);
      window.addEventListener('antecipacaoStatusChanged', handleAntecipacaoStatusChanged);
    }

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleWindowFocus);
        window.removeEventListener('antecipacaoStatusChanged', handleAntecipacaoStatusChanged);
      }
    };
  }, []);

  return { aprovada, loading, error };
}
