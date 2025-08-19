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

        // Usar a mesma API que funciona para SasCred, mas verificar campos específicos da antecipação
        const response = await fetch('/api/verificar-adesao-sasmais-simples', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            codigo: localizaData.matricula.toString()
          })
        });

        if (!response.ok) {
          throw new Error('Erro ao verificar dados do associado');
        }

        const resultado = await response.json();
        
        console.log('🔍 Hook useAntecipacaoAprovada - Dados da API SasCred:', {
          codigo: localizaData.matricula,
          resultado: resultado,
          status: resultado.status
        });

        if (isMounted) {
          let isAprovada = false;
          
          // Verificar se existe registro na tabela associados_sasmais
          if (resultado.status === 'sucesso' && resultado.dados) {
            const dados = resultado.dados;
            
            // Verificar se tem valor_aprovado E data_pgto preenchidos
            const valorAprovado = dados.valor_aprovado;
            const dataPgto = dados.data_pgto;
            
            console.log('📊 Verificando campos da antecipação:', {
              valor_aprovado: valorAprovado,
              data_pgto: dataPgto,
              has_signed: dados.has_signed
            });
            
            // Extrair valor numérico
            let valorNumerico = 0;
            if (valorAprovado) {
              const valorLimpo = valorAprovado.toString().replace(/[^0-9.,]/g, '').replace(',', '.');
              valorNumerico = parseFloat(valorLimpo) || 0;
            }
            
            // Verificar se data_pgto está preenchida
            const dataPgtoPreenchida = dataPgto && dataPgto !== null && dataPgto !== '';
            
            // CRITÉRIO CORRETO: valor_aprovado > 0 E data_pgto preenchida E has_signed = true
            if (valorNumerico > 0 && dataPgtoPreenchida && dados.has_signed === true) {
              isAprovada = true;
              console.log('✅ ANTECIPAÇÃO APROVADA: valor_aprovado + data_pgto + has_signed');
            } else {
              console.log('❌ Antecipação não aprovada:', {
                valorOk: valorNumerico > 0,
                dataOk: dataPgtoPreenchida,
                assinado: dados.has_signed === true
              });
            }
          } else {
            console.log('❌ Nenhum registro encontrado na tabela associados_sasmais');
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
