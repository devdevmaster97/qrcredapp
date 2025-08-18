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

        // Verificar se a antecipação foi aprovada
        const aprovacaoResponse = await fetch('/api/verificar-antecipacao-aprovada', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            codigo: localizaData.matricula.toString()
          })
        });

        if (!aprovacaoResponse.ok) {
          throw new Error('Erro ao verificar aprovação da antecipação');
        }

        const aprovacaoData = await aprovacaoResponse.json();
        
        console.log('🔍 Hook useAntecipacaoAprovada - Dados completos:', {
          codigo: localizaData.matricula,
          aprovacaoData: aprovacaoData,
          aprovada: aprovacaoData.aprovada,
          success: aprovacaoData.success
        });

        if (isMounted) {
          let isAprovada = false;
          
          // VERIFICAÇÃO DUPLA OBRIGATÓRIA:
          // 1. Valor aprovado preenchido no banco (API)
          // 2. Assinatura digital completa no ZapSign
          
          const valorAprovadoOk = aprovacaoData.aprovada || false;
          
          // Verificar assinatura digital específica da antecipação
          const urlAntecipacao = "https://app.zapsign.com.br/verificar/doc/762dbe4c-654b-432b-a7a9-38435966e0aa";
          
          try {
            console.log('🔍 Verificando assinatura digital da antecipação...');
            const assinaturaCompleta = await verificarAssinaturaPorUrl(urlAntecipacao);
            
            console.log('📊 Status das verificações:', {
              valorAprovadoOk,
              assinaturaCompleta,
              codigo: localizaData.matricula
            });
            
            // Só aprovar se AMBOS forem verdadeiros
            if (valorAprovadoOk && assinaturaCompleta) {
              isAprovada = true;
              console.log('✅ ANTECIPAÇÃO TOTALMENTE APROVADA: assinatura digital + valor aprovado');
            } else if (valorAprovadoOk && !assinaturaCompleta) {
              console.log('⚠️ Valor aprovado OK, mas assinatura digital pendente');
            } else if (!valorAprovadoOk && assinaturaCompleta) {
              console.log('⚠️ Assinatura digital OK, mas valor aprovado pendente');
            } else {
              console.log('❌ Ambos pendentes: assinatura digital e valor aprovado');
            }
            
          } catch (error) {
            console.error('❌ Erro ao verificar assinatura digital:', error);
            isAprovada = false;
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

    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('antecipacaoStatusChanged', handleAntecipacaoStatusChanged);

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('antecipacaoStatusChanged', handleAntecipacaoStatusChanged);
    };
  }, []);

  return { aprovada, loading, error };
}
