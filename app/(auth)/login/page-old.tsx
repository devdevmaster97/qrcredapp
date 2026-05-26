'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FaSpinner } from 'react-icons/fa6';
import toast from 'react-hot-toast';
import LoginForm from '@/app/components/LoginForm';
import Logo from '@/app/components/Logo';
import Header from '@/app/components/Header';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleVoltar = () => {
    router.push('/');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const cartao = formData.get('cartao') as string;
    const senha = formData.get('senha') as string;

    try {
      const result = await signIn('credentials', {
        cartao,
        senha,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      router.push('/dashboard');
    } catch (error) {
      toast.error('Erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header title="Login do Associado" showBackButton onBackClick={handleVoltar} />
      
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <Logo size="xs" />
          
          <LoginForm onSubmit={handleSubmit} loading={loading} />
          
          <div className="text-center text-sm text-gray-500">
            <p> {new Date().getFullYear()} QRCred. Todos os direitos reservados.</p>
          </div>
        </div>
      </main>
    </div>
  );
} 