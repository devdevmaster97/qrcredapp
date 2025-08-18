'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaSpinner } from 'react-icons/fa';
import AssociadoCadastroForm from '@/app/components/AssociadoCadastroForm';
import axios from 'axios';

export default function CadastroPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [cartao, setCartao] = useState<string>('');
  const [matricula, setMatricula] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Verificar se o usuário está logado
        const storedCartao = localStorage.getItem('cartao');
        const storedMatricula = localStorage.getItem('matricula');
        
        if (!storedCartao) {
          router.push('/login');
          return;
        }
        
        setCartao(storedCartao);
        if (storedMatricula) {
          setMatricula(storedMatricula);
        }
        
        // Buscar informações existentes do associado
        const response = await axios.post('/api/associado-info', {
          cartao: storedCartao
        });
        
        if (response.data.success) {
          setUserInfo(response.data.data);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        setError('Não foi possível carregar seus dados. Por favor, tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md flex flex-col items-center max-w-md w-full">
          <FaSpinner className="text-blue-600 text-4xl animate-spin mb-4" />
          <p className="text-gray-600">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro</h1>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Voltar para a página principal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <AssociadoCadastroForm
        cartao={cartao}
        matricula={matricula}
        userInfo={userInfo}
      />
    </div>
  );
} 