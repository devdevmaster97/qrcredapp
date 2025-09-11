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
import { clearConvenioCache, validateConvenioCache, saveConvenioCache, type ConvenioData as ConvenioCacheData } from '@/app/utils/convenioCache';
import { useMobileCacheManager } from '@/app/hooks/useMobileCacheManager';

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
  
  // Hook para gerenciar cache em dispositivos móveis
  const { isMobile, forceClearCache } = useMobileCacheManager();

  useEffect(() => {
    // CRÍTICO: Limpar dados antigos no início de cada carregamento
    console.log('🧹 Layout - Iniciando carregamento de dados, limpando estado anterior');
    setConvenioData(null);
    
    // DISPOSITIVOS MÓVEIS: Limpeza mais agressiva
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      console.log('📱 Layout - Dispositivo móvel detectado, limpeza agressiva');
      // Forçar limpeza do cache do navegador móvel
      clearConvenioCache();
      // Limpar sessionStorage também
      sessionStorage.removeItem('dadosConvenio');
      sessionStorage.removeItem('convenioToken');
    }
    
    // Recuperar dados do convênio da sessão ou fazer nova chamada API
    const getConvenioData = async () => {
      try {
        setLoading(true);
        
        console.log('🔍 Layout - Buscando dados frescos da API...');
        
        // Headers especiais para dispositivos móveis
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        if (isMobile) {
          console.log('📱 Layout - Adicionando headers anti-cache para mobile');
          headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0';
          headers['Pragma'] = 'no-cache';
          headers['Expires'] = '0';
          headers['X-Requested-With'] = 'XMLHttpRequest';
        }
        
        const response = await fetch('/api/convenio/dados?' + new Date().getTime(), {
          method: 'GET',
          headers: headers,
        });

        if (!response.ok) {
          throw new Error('Falha ao obter dados do convênio');
        }

        const data = await response.json();
        if (data.success) {
          console.log('✅ Layout - Dados recebidos da API:', {
            cod_convenio: data.data.cod_convenio,
            razaosocial: data.data.razaosocial,
            timestamp: new Date().toISOString()
          });
          
          setConvenioData(data.data);
          retryCountRef.current = 0; // Resetar contador de tentativas se obtiver sucesso
          
          // Salvar dados usando utilitário de cache seguro
          saveConvenioCache(data.data as ConvenioCacheData);
          console.log('💾 Layout - Dados salvos no cache usando utilitário seguro');
          
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
          console.log('⚠️ Layout - Máximo de tentativas atingido, validando cache...');
          
          // Usar utilitário para validar cache
          const cacheValidation = validateConvenioCache();
          
          if (cacheValidation.isValid && cacheValidation.cacheData) {
            console.log('✅ Cache validado pelo utilitário, usando dados salvos');
            setConvenioData(cacheValidation.cacheData as ConvenioData);
            toast('Dados carregados do cache local. Algumas informações podem estar desatualizadas.', {
              icon: '⚠️',
              duration: 4000
            });
          } else {
            console.log('❌ Cache inválido ou inexistente, redirecionando para login');
            if (cacheValidation.cacheData && cacheValidation.tokenData) {
              toast.error(`Cache inválido: convênio ${cacheValidation.cacheData.cod_convenio} vs token ${cacheValidation.tokenData.id}`);
            } else {
              toast.error('Erro ao carregar dados do convênio. Redirecionando para o login...');
            }
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

  // CRÍTICO: Forçar atualização sempre que a rota mudar
  useEffect(() => {
    console.log('🔄 Layout - Rota mudou, forçando limpeza de estado:', pathname);
    setConvenioData(null);
    retryCountRef.current = 0;
    toastShownRef.current = false;
  }, [pathname]);

  const handleLogout = async () => {
    // Usar utilitário para limpeza completa
    clearConvenioCache();
    setConvenioData(null);
    
    // Limpar os dados de autenticação
    try {
      await fetch('/api/convenio/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
    
    console.log('🧹 Logout concluído com limpeza completa via utilitário');
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
        
        <div className="relative flex-1 flex flex-col max-w-xs w-full" style={{backgroundColor: '#1C2260'}}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <FaTimes className="h-6 w-6 text-white" />
            </button>
          </div>
          
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center justify-center px-4 mb-4">
              <div className="bg-white p-2 rounded-full">
                <img 
                  src="/icons/icon-192x192.png" 
                  alt="Logo SasCred" 
                  className="h-8 w-8 rounded-full object-cover"
                />
              </div>
            </div>
            
            {/* Informações do convênio no sidebar mobile */}
            {convenioData && (
              <div className="px-4 mb-4">
                <div className="text-center">
                  <h3 className="text-xs font-semibold text-white leading-tight break-words">
                    {convenioData.razaosocial}
                  </h3>
                  {identificador && (
                    <p className="mt-1 text-xs text-blue-100">{identificador}</p>
                  )}
                  {enderecoCompleto && (
                    <p className="mt-1 text-xs text-blue-100 leading-tight">{enderecoCompleto}</p>
                  )}
                </div>
              </div>
            )}
            <nav className="mt-5 px-2 space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                    item.current
                      ? 'bg-blue-700 text-white'
                      : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span className="ml-3">{item.name}</span>
                </Link>
              ))}
              
              <button
                onClick={handleLogout}
                className="w-full group flex items-center px-2 py-2 text-base font-medium rounded-md text-blue-100 hover:bg-blue-700 hover:text-white"
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
          <div className="flex flex-col h-0 flex-1 border-r border-blue-300" style={{backgroundColor: '#1C2260'}}>
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center justify-center flex-shrink-0 px-4 mb-4">
                <div className="bg-white p-2 rounded-full">
                  <img 
                    src="/icons/icon-192x192.png" 
                    alt="Logo SasCred" 
                    className="h-8 w-8 rounded-full object-cover"
                  />
                </div>
              </div>
              
              {/* Informações do convênio no sidebar */}
              {convenioData && (
                <div className="px-4 mb-4">
                  <div className="text-center">
                    <h3 className="text-xs font-semibold text-white leading-tight break-words">
                      {convenioData.razaosocial}
                    </h3>
                    {identificador && (
                      <p className="mt-1 text-xs text-blue-100">{identificador}</p>
                    )}
                    {enderecoCompleto && (
                      <p className="mt-1 text-xs text-blue-100 leading-tight">{enderecoCompleto}</p>
                    )}
                  </div>
                </div>
              )}
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      item.current
                        ? 'bg-blue-700 text-white'
                        : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    <span className="ml-3">{item.name}</span>
                  </Link>
                ))}
                
                <button
                  onClick={handleLogout}
                  className="w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md text-blue-100 hover:bg-blue-700 hover:text-white"
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
        
        {/* Cabeçalho vazio */}
        <div className="bg-white shadow">
          <div className="px-4 sm:px-6 py-4">
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