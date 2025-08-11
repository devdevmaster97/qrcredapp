'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaCreditCard, FaArrowLeft } from 'react-icons/fa';
import Logo from '../../components/Logo';
import { toast } from 'react-hot-toast';
import ThemeToggle from '../../components/ThemeToggle';
import Header from '../../components/Header';

export default function RecuperarSenhaPage() {
  const [numeroCartao, setNumeroCartao] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleRecuperarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!numeroCartao) {
      toast.error('Por favor, informe o número do cartão');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/associado/recuperar-senha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ numeroCartao }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Código enviado com sucesso!');
        router.push('/validar-codigo');
      } else {
        if (response.status === 429) {
          toast.error('Aguarde 60 segundos antes de solicitar um novo código');
        } else {
          toast.error(data.message || 'Erro ao enviar código de recuperação');
        }
      }
    } catch (error) {
      console.error('Erro ao recuperar senha:', error);
      toast.error('Ocorreu um erro ao tentar recuperar a senha');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoltar = () => {
    router.push('/login');
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header com o toggle de tema */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <Header title="Recuperar Senha" showBackButton onBackClick={handleVoltar} />
      
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-8">
            <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-200 mb-6">
              Recuperar Senha
            </h1>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
              Digite o número do seu cartão para receber o código de recuperação
            </p>
            
            <form onSubmit={handleRecuperarSenha}>
              <div className="mb-6">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="numeroCartao">
                  Número do Cartão
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <FaCreditCard className="text-gray-400" />
                  </div>
                  <input 
                    id="numeroCartao" 
                    type="text" 
                    value={numeroCartao}
                    onChange={(e) => setNumeroCartao(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5" 
                    placeholder="Número do cartão"
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full flex justify-center items-center bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-white px-5 py-2.5 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Enviando...' : 'Enviar'}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <button 
                onClick={handleVoltar}
                className="text-sm text-gray-600 dark:text-gray-400 hover:underline flex items-center justify-center gap-2"
              >
                <FaArrowLeft />
                Voltar para o login
              </button>
            </div>
          </div>
          
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            <p>© {new Date().getFullYear()} QRCred. Todos os direitos reservados.</p>
          </div>
        </div>
      </main>
    </div>
  );
} 