import { useState, useEffect } from 'react';

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
        
        console.log('🔍 Hook useAntecipacaoAprovada - Resultado:', aprovacaoData);

        if (isMounted) {
          setAprovada(aprovacaoData.aprovada || false);
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

    verificarAprovacao();

    return () => {
      isMounted = false;
    };
  }, []);

  return { aprovada, loading, error };
}
