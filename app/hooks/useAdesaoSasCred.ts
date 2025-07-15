'use client';

import { useState, useEffect } from 'react';

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

  const verificarAdesao = async () => {
    setStatus(prev => ({ ...prev, loading: true }));
    
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
        return;
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
        return;
      }

      // Fazer chamada para a API de verificação de adesão
      const response = await fetch('/api/verificar-adesao-sasmais', {
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
        setStatus(prev => ({
          ...prev,
          jaAderiu: resultado.jaAderiu === true,
          loading: false,
          error: null,
          dadosAdesao: resultado.dados || null
        }));
      } else {
        setStatus(prev => ({
          ...prev,
          jaAderiu: false,
          loading: false,
          error: resultado.mensagem || 'Erro ao verificar adesão',
          dadosAdesao: null
        }));
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
    }
  };

  useEffect(() => {
    verificarAdesao();

    // Listener para mudanças no localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'adesao_status_changed') {
        verificarAdesao();
        localStorage.removeItem('adesao_status_changed');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
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