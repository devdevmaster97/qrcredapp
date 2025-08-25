'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { 
  FaChartLine, 
  FaUser, 
  FaReceipt, 
  FaFileAlt,
  FaSignOutAlt,
  FaBars,
  FaTimes
} from 'react-icons/fa';

interface ConvenioData {
  cod_convenio: string;
  razaosocial: string;
  cnpj: string;
  cpf: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [convenioData, setConvenioData] = useState<ConvenioData | null>(null);
  const [loading, setLoading] = useState(true);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const toastShownRef = useRef(false);

  useEffect(() => {
    // Recuperar dados do convênio da sessão ou fazer nova chamada API
    const getConvenioData = async () => {
      try {
        setLoading(true);
        
        const response = await fetch('/api/convenio/dados', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Falha ao obter dados do convênio');
        }

        const data = await response.json();
        if (data.success) {
          setConvenioData(data.data);
          retryCountRef.current = 0; // Resetar contador de tentativas se obtiver sucesso
          
          // Salvar dados no localStorage para cache
          localStorage.setItem('dadosConvenio', JSON.stringify(data.data));
          
          // Mostra o toast de boas-vindas apenas uma vez quando os dados são carregados com sucesso
          if (!toastShownRef.current && pathname === '/convenio/dashboard/lancamentos') {
            toast.success('Login realizado com sucesso!', {
              position: 'top-right',
              duration: 3000
            });
            toastShownRef.current = true;
          }
        } else {
          retryCountRef.current += 1;
          console.warn(`Falha ao obter dados do convênio (${retryCountRef.current}/${maxRetries}): ${data.message}`);
          
          if (retryCountRef.current >= maxRetries) {
            toast.error('Não foi possível obter os dados do convênio. Redirecionando para o login...');
            setTimeout(() => {
              router.push('/convenio/login');
            }, 2000);
          }
        }
      } catch (error) {
        retryCountRef.current += 1;
        console.error('Erro ao carregar dados do convênio:', error);
        
        // Log adicional para debugging em dispositivos Xiaomi
        console.log('🔍 Error details (layout):', {
          message: error instanceof Error ? error.message : String(error),
          userAgent: navigator.userAgent,
          online: navigator.onLine,
          timestamp: new Date().toISOString(),
          tentativa: retryCountRef.current,
          maxTentativas: maxRetries
        });
        
        if (retryCountRef.current >= maxRetries) {
          // Tentar recuperar dados do localStorage antes de redirecionar
          const storedData = localStorage.getItem('dadosConvenio');
          if (storedData) {
            try {
              const parsedData = JSON.parse(storedData);
              setConvenioData(parsedData);
              toast.warning('Dados carregados do cache local. Algumas informações podem estar desatualizadas.');
            } catch (parseError) {
              console.error('Erro ao recuperar dados do cache:', parseError);
              toast.error('Erro ao carregar dados do convênio. Redirecionando para o login...');
              setTimeout(() => {
                router.push('/convenio/login');
              }, 2000);
            }
          } else {
            toast.error('Erro ao carregar dados do convênio. Redirecionando para o login...');
            setTimeout(() => {
              router.push('/convenio/login');
            }, 2000);
          }
        } else {
          // Tentar novamente após um delay
          setTimeout(() => {
            getConvenioData();
          }, 2000);
        }
      } finally {
        setLoading(false);
      }
    };

    getConvenioData();

    // Configurar um intervalo para verificar os dados a cada 5 minutos
    const intervalId = setInterval(getConvenioData, 5 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [router, pathname]);

  const handleLogout = async () => {
    // LIMPAR COMPLETAMENTE todos os dados do convênio
    localStorage.removeItem('dadosConvenio');
    localStorage.removeItem('convenioUsuariosSalvos');
    setConvenioData(null);
    
    // Limpar os dados de autenticação
    try {
      await fetch('/api/convenio/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
    
    console.log('🧹 Cache do convênio completamente limpo no logout');
    toast.success('Logout realizado com sucesso!');
    // Redirecionar para a página de login
    router.push('/convenio/login');
  };

  // Formatação do endereço completo
  const enderecoCompleto = convenioData ? 
    `${convenioData.endereco}, ${convenioData.numero}, ${convenioData.bairro}, ${convenioData.cidade} - ${convenioData.estado}` 
    : '';

  // Identificador (CNPJ ou CPF)
  const identificador = convenioData?.cnpj 
    ? `CNPJ: ${convenioData.cnpj}`
    : convenioData?.cpf 
      ? `CPF: ${convenioData.cpf}`
      : '';

  const menuItems = [
    {
      name: 'Página Principal',
      href: '/convenio/dashboard',
      icon: <FaChartLine className="w-5 h-5" />,
      current: pathname === '/convenio/dashboard'
    },
    {
      name: 'Lançamentos',
      href: '/convenio/dashboard/lancamentos/novo',
      icon: <FaReceipt className="w-5 h-5" />,
      current: pathname === '/convenio/dashboard/lancamentos/novo'
    },
    {
      name: 'Meus Dados',
      href: '/convenio/dashboard/meus-dados',
      icon: <FaUser className="w-5 h-5" />,
      current: pathname === '/convenio/dashboard/meus-dados'
    },
    {
      name: 'Estornos',
      href: '/convenio/dashboard/estornos',
      icon: <FaChartLine className="w-5 h-5" />,
      current: pathname === '/convenio/dashboard/estornos'
    },
    {
      name: 'Relatórios',
      href: '/convenio/dashboard/relatorios',
      icon: <FaFileAlt className="w-5 h-5" />,
      current: pathname === '/convenio/dashboard/relatorios'
    }
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <span className="mt-2 text-gray-700">Carregando dados do convênio...</span>
          </div>
        </div>
      )}
      
      {/* Sidebar para celular */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75" 
          onClick={() => setSidebarOpen(false)}
        />
        
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <FaTimes className="h-6 w-6 text-white" />
            </button>
          </div>
          
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {convenioData?.razaosocial || 'Dashboard Convênio'}
              </h2>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                    item.current
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {item.icon}
                  <span className="ml-3">{item.name}</span>
                </Link>
              ))}
              
              <button
                onClick={handleLogout}
                className="w-full group flex items-center px-2 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                <FaSignOutAlt className="w-5 h-5" />
                <span className="ml-3">Sair</span>
              </button>
            </nav>
          </div>
        </div>
      </div>
      
      {/* Sidebar para desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  {convenioData?.razaosocial || 'Dashboard Convênio'}
                </h2>
              </div>
              <nav className="mt-5 flex-1 px-2 bg-white space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      item.current
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {item.icon}
                    <span className="ml-3">{item.name}</span>
                  </Link>
                ))}
                
                <button
                  onClick={handleLogout}
                  className="w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  <FaSignOutAlt className="w-5 h-5" />
                  <span className="ml-3">Sair</span>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
          >
            <FaBars className="h-6 w-6" />
          </button>
        </div>
        
        {/* Cabeçalho com informações do convênio */}
        <div className="bg-white shadow">
          <div className="px-4 sm:px-6 py-4">
            <h1 className="text-xl font-semibold text-gray-900">
              {convenioData?.razaosocial || 'Carregando...'}
            </h1>
            {identificador && (
              <p className="mt-1 text-sm text-gray-600">{identificador}</p>
            )}
            {enderecoCompleto && (
              <p className="mt-1 text-sm text-gray-600">{enderecoCompleto}</p>
            )}
          </div>
        </div>
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 