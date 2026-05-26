'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FaBars, FaBell, FaArrowLeft } from 'react-icons/fa';
import Sidebar from '@/app/components/dashboard/Sidebar';

interface UserData {
  nome: string;
  cartao: string;
  nome_divisao: string;
  [key: string]: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);
  const isHome = pathname === '/dashboard';

  useEffect(() => {
    // Verificar se o usuário está logado
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('qrcred_user');
        
        if (!storedUser) {
          // Redirecionar para login se não estiver logado
          window.location.href = '/login';
          return;
        }
        
        try {
          const parsedUser = JSON.parse(storedUser);
          setUserData(parsedUser);
        } catch (error) {
          console.error('Erro ao processar dados do usuário:', error);
          window.location.href = '/login';
        } finally {
          setIsLoading(false);
        }
      }
    };

    checkAuth();
    
    // Detectar iOS (iPhone, iPad, iPod)
    if (typeof window !== 'undefined') {
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsIOS(isIOSDevice);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-pulse text-2xl text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {userData && (
        <Sidebar 
          userName={userData.nome} 
          cardNumber={userData.cartao}
          company={userData.nome_divisao}
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
          onClose={closeSidebar}
        />
      )}

      {/* Header global */}
      <header
        className="bg-white border-b border-[#e1e3e4] px-5 sticky top-0 z-10 flex items-center justify-between"
        style={{
          paddingTop: isIOS ? 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' : '0.75rem',
          paddingBottom: '0.75rem',
        }}
      >
        <div className="flex items-center gap-3">
          {isHome ? (
            /* Tela principal: hambúrguer + avatar + nome */
            <>
              <button
                onClick={toggleSidebar}
                className="text-[#3d494d] hover:text-[#00677d] transition-colors p-1"
                aria-label="Abrir Menu"
                style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <FaBars size={22} />
              </button>
              {userData && (
                <>
                  <div className="w-9 h-9 rounded-full bg-[#00677d] flex items-center justify-center">
                    <span className="text-white font-bold text-base">
                      {userData.nome?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <span
                    className="text-[#191c1d] font-semibold text-base"
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  >
                    {userData.nome?.split(' ')[0] || 'Usuário'}
                  </span>
                </>
              )}
            </>
          ) : (
            /* Sub-telas: botão voltar */
            <button
              onClick={() => router.back()}
              className="text-[#3d494d] hover:text-[#00677d] transition-colors p-1 flex items-center gap-2"
              aria-label="Voltar"
              style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center' }}
            >
              <FaArrowLeft size={20} />
              <span className="text-[#191c1d] font-semibold text-base" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Voltar
              </span>
            </button>
          )}
        </div>
        <button className="text-[#3d494d] hover:text-[#00677d] transition-colors p-1" style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FaBell size={20} />
        </button>
      </header>
      
      <main className="pb-20">
        <div className="p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
} 