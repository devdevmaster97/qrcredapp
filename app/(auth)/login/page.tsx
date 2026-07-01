'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FaCreditCard, FaLock } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import Logo from '@/app/components/Logo';
import Header from '@/app/components/Header';

export default function LoginPage() {
  console.log('✅ [LoginPage] Componente CORRETO carregado - page.tsx com handleSubmit inline');
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleVoltar = () => {
    router.push('/');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    console.log('🔐 [Login] handleSubmit INICIADO');
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const cartao = formData.get('cartao') as string;
    const senha = formData.get('senha') as string;

    console.log('🔐 [Login] Dados do formulário:', { cartao, senha: senha ? '***' : 'VAZIO' });

    if (!cartao || !senha) {
      console.error('🔐 [Login] Cartão ou senha vazios!');
      toast.error('Preencha todos os campos');
      setLoading(false);
      return;
    }

    console.log('🔐 [Login] Chamando API de login...');

    try {
      // Buscar dados completos do usuário para salvar no localStorage
      const apiFormData = new FormData();
      apiFormData.append('cartao', cartao);
      apiFormData.append('senha', senha);

      const apiResponse = await fetch('/api/login', {
        method: 'POST',
        body: apiFormData,
      });

      const userData = await apiResponse.json();
      console.log('🔐 [Login] Resposta da API:', userData);

      if (Number(userData.situacao) === 1) {
        // Salvar dados no localStorage para o dashboard funcionar corretamente
        localStorage.setItem('qrcred_user', JSON.stringify({
          matricula: userData.matricula || '',
          nome: userData.nome || '',
          empregador: userData.empregador || '',
          cartao: userData.cod_cart || cartao,
          limite: userData.limite || '',
          cpf: userData.cpf || '',
          email: userData.email || '',
          cel: userData.cel || '',
          cep: userData.cep || '',
          endereco: userData.endereco || '',
          numero: userData.numero || '',
          bairro: userData.bairro || '',
          cidade: userData.cidade || '',
          estado: userData.uf || '',
          celzap: userData.celwatzap || '',
          nome_divisao: userData.nome_divisao || '',
        }));

        console.log('🔐 [Login] Dados salvos no localStorage, estabelecendo sessão NextAuth...');

        // Estabelecer sessão NextAuth sem redirecionar automaticamente
        const result = await signIn('credentials', {
          cartao,
          senha,
          redirect: false,
        });

        console.log('🔐 [Login] Resultado do signIn:', result);

        router.push('/dashboard');
      } else if (Number(userData.situacao) === 6) {
        toast.error('Senha incorreta');
        setLoading(false);
      } else if (Number(userData.situacao) === 2 || Number(userData.situacao) === 3) {
        toast.error('Cartão não encontrado');
        setLoading(false);
      } else if (Number(userData.situacao) === 0) {
        toast.error('Cartão bloqueado');
        setLoading(false);
      } else {
        toast.error('Cartão ou senha inválidos');
        setLoading(false);
      }
    } catch (error) {
      console.error('🔐 [Login] Exceção capturada:', error);
      toast.error('Erro ao realizar login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header title="Login do Associado" showBackButton onBackClick={handleVoltar} />
      
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <Logo size="xs" />
          
          <form 
            id="login-form-inline" 
            data-testid="login-form-inline"
            onSubmit={handleSubmit} 
            className="space-y-4 bg-white p-8 rounded-lg shadow"
          >
            <div className="space-y-1">
              <label htmlFor="cartao-input" className="block text-sm font-medium text-gray-700">
                Cartão
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaCreditCard className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="cartao"
                  id="cartao-input"
                  placeholder="Número do Cartão"
                  className="block w-full pl-10 py-2 sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="senha-input" className="block text-sm font-medium text-gray-700">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  name="senha"
                  id="senha-input"
                  placeholder="Senha"
                  className="block w-full pl-10 py-2 sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  maxLength={20}
                  required
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                id="login-submit-btn"
                disabled={loading}
                onClick={(e) => {
                  console.log('🔘 [Login] Botão ENTRAR clicado!');
                }}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  'Entrar'
                )}
              </button>
            </div>
          </form>
          
          <div className="text-center text-sm text-gray-500">
            <p> {new Date().getFullYear()} QRCred. Todos os direitos reservados.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
