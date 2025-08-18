'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isAssinaturaCompleta, abrirCanalAntecipacao } from '@/app/utils/assinatura';
import { useAdesaoSasCred } from '@/app/hooks/useAdesaoSasCred';
import { useAntecipacaoAprovada } from '@/app/hooks/useAntecipacaoAprovada';
import { triggerAntecipacaoVerification } from '@/app/utils/antecipacaoNotifications';
import { 
  FaWallet, 
  FaClipboardList, 
  FaStore, 
  FaQrcode, 
  FaUser, 
  FaCalendarAlt, 
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaStar,
  FaWhatsapp,
  FaPhone,
  FaInfoCircle,
  FaChevronDown,
  FaChevronRight,
  FaMobileAlt,
  FaMoneyBillWave,
  FaHistory,
  FaClock,
  FaFileContract,
  FaShieldAlt,
  FaHeart,
  FaUserPlus,
  FaEnvelope,
  FaSignature
} from 'react-icons/fa';

type SidebarProps = {
  userName: string;
  cardNumber: string;
  company: string;
};

interface UserData {
  nome: string;
  cartao: string;
  nome_divisao: string;
  [key: string]: string;
}

export default function Sidebar({ userName, cardNumber, company }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSasCredOpen, setIsSasCredOpen] = useState(false);
  const [isProtecaoFamiliarOpen, setIsProtecaoFamiliarOpen] = useState(false);
  const [isProgramadoOpen, setIsProgramadoOpen] = useState(false);
  const [isAntecipacaoOpen, setIsAntecipacaoOpen] = useState(false);
  const pathname = usePathname();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [assinaturaCompleta, setAssinaturaCompleta] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [fallbackAdesao, setFallbackAdesao] = useState<boolean | null>(null);
  
  // Hook para verificar adesão ao SasCred
  const { jaAderiu: jaAderiuSasCred, loading: loadingAdesao } = useAdesaoSasCred();
  
  // Hook para verificar se antecipação foi aprovada
  const { aprovada: antecipacaoAprovada, loading: loadingAntecipacao } = useAntecipacaoAprovada();
  
  // Debug da aprovação da antecipação
  useEffect(() => {
    console.log('🔍 Sidebar - Status antecipação:', {
      antecipacaoAprovada,
      loadingAntecipacao,
      timestamp: new Date().toISOString()
    });
  }, [antecipacaoAprovada, loadingAntecipacao]);

  // Debug do status de adesão e timeout do loading
  useEffect(() => {
    // Remover log excessivo para evitar spam no console
    // console.log('🔍 Sidebar - Status adesão SasCred:', {
    //   jaAderiuSasCred,
    //   loadingAdesao,
    //   loadingTimeout,
    //   timestamp: new Date().toISOString()
    // });
    
    // Timeout para loading infinito
    if (loadingAdesao && !loadingTimeout) {
      const timeout = setTimeout(async () => {
        console.warn('⚠️ SasCred loading timeout - forçando fallback');
        setLoadingTimeout(true);
        
        // Verificação manual de fallback
        try {
          const storedUser = localStorage.getItem('qrcred_user');
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            if (userData.matricula) {
              const response = await fetch('/api/verificar-adesao-sasmais-simples', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo: userData.matricula.toString() })
              });
              const result = await response.json();
              console.log('🔧 Fallback verification result:', result);
              setFallbackAdesao(result.jaAderiu || false);
            }
          }
        } catch (error) {
          console.error('🔧 Fallback verification failed:', error);
          setFallbackAdesao(false);
        }
      }, 10000); // 10 segundos
      
      return () => clearTimeout(timeout);
    }
    
    // Reset timeout quando loading para
    if (!loadingAdesao && loadingTimeout) {
      setLoadingTimeout(false);
    }
  }, [jaAderiuSasCred, loadingAdesao, loadingTimeout]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('qrcred_user');
      if (storedUser) {
        setUserData(JSON.parse(storedUser));
      }
      
      // Verificar se a assinatura digital foi completa
      setAssinaturaCompleta(isAssinaturaCompleta());
    }
  }, []);

  // Expandir automaticamente o menu SasCred se estiver em uma página relacionada
  useEffect(() => {
    if (pathname.includes('/dashboard/sascred') || 
        pathname.includes('/dashboard/saldo') ||
        pathname.includes('/dashboard/extrato') ||
        pathname.includes('/dashboard/qrcode') ||
        pathname.includes('/dashboard/antecipacao') ||
        pathname.includes('/dashboard/adesao-sasapp')) {
              setIsSasCredOpen(true);
      }

      // Expandir automaticamente o menu Programado se estiver em uma página relacionada
      if (pathname.includes('/dashboard/programado')) {
        setIsProgramadoOpen(true);
      }

      // Expandir automaticamente o submenu Antecipação se estiver em uma página relacionada
      if (pathname.includes('/dashboard/sascred/antecipacao')) {
        setIsAntecipacaoOpen(true);
      }
    }, [pathname]);

  const handleAntecipacao = () => {
    abrirCanalAntecipacao();
    setIsOpen(false);
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const toggleSasCred = () => {
    setIsSasCredOpen(!isSasCredOpen);
  };

  const toggleProtecaoFamiliar = () => {
    setIsProtecaoFamiliarOpen(!isProtecaoFamiliarOpen);
  };

  const toggleProgramado = () => {
    setIsProgramadoOpen(!isProgramadoOpen);
  };

  const toggleAntecipacao = () => {
    setIsAntecipacaoOpen(!isAntecipacaoOpen);
  };

  // Menu principal (ordem conforme solicitado)
  const menuItems = [
    {
      type: 'link',
      href: '/dashboard',
      label: 'SasApp',
      icon: <FaMobileAlt size={20} />
    },
    {
      type: 'link',
      href: '/dashboard/dados',
      label: 'Meus Dados',
      icon: <FaUser size={20} />
    },
    {
      type: 'submenu',
      label: 'Proteção Familiar',
      icon: <FaShieldAlt size={20} className="text-blue-500" />,
      isOpen: isProtecaoFamiliarOpen,
      toggle: toggleProtecaoFamiliar,
      items: [
        {
          href: '/dashboard/protecao-familiar/o-que-e',
          label: 'O que é',
          icon: <FaInfoCircle size={16} />
        },
        {
          href: '/dashboard/convenios',
          label: 'Convênios',
          icon: <FaStore size={16} />
        },
        {
          href: '/dashboard/agendamentos',
          label: 'Agendamentos',
          icon: <FaCalendarAlt size={16} />
        }
      ]
    },
    {
      type: 'submenu',
      label: 'SasCred',
      icon: <FaMoneyBillWave size={20} className="text-green-500" />,
      isOpen: isSasCredOpen,
      toggle: toggleSasCred,
      items: [
        {
          href: '/dashboard/sascred/o-que-e',
          label: 'O que é',
          icon: <FaInfoCircle size={16} />
        },
        // Só mostrar "Aderir" se ainda não aderiu
        ...(!jaAderiuSasCred ? [
          {
            href: '/dashboard/adesao-sasapp',
            label: 'Aderir',
            icon: <FaFileContract size={16} className="text-blue-500" />
          }
        ] : []),
        // Submenus condicionais - só aparecem se o associado já aderiu
        ...(jaAderiuSasCred ? [
          {
            href: '/dashboard/saldo',
            label: 'Saldo',
            icon: <FaWallet size={16} />
          },
          {
            href: '/dashboard/extrato',
            label: 'Extrato',
            icon: <FaClipboardList size={16} />
          },
          {
            href: '/dashboard/qrcode',
            label: 'QR Code',
            icon: <FaQrcode size={16} />
          },
          {
            href: '/dashboard/convenios',
            label: 'Convênios',
            icon: <FaStore size={16} />
          },
          {
            type: 'submenu',
            label: 'Antecipação',
            icon: <FaHistory size={16} />,
            isOpen: isAntecipacaoOpen,
            toggle: toggleAntecipacao,
            items: [
              {
                href: '/dashboard/sascred/antecipacao/aderir',
                label: 'Aderir',
                icon: <FaFileContract size={14} className="text-blue-500" />
              },
              // Só mostrar "Antecipar" se antecipação foi aprovada (tipo "antecipacao" com Valor Aprovado e Data Pgto)
              ...(antecipacaoAprovada ? [
                {
                  href: '/dashboard/sascred/antecipacao/antecipar',
                  label: 'Antecipar',
                  icon: <FaSignature size={14} className="text-green-500" />
                }
              ] : [])
            ]
          }
        ] : [])
      ]
    },
    // PROGRAMADO como submenu independente
    {
      type: 'submenu',
      label: 'Programado',
      icon: <FaHeart size={20} className="text-red-500" />,
      isOpen: isProgramadoOpen,
      toggle: toggleProgramado,
      items: [
        {
          href: '/dashboard/programado/o-que-e',
          label: 'O que é',
          icon: <FaInfoCircle size={16} />
        },
        {
          href: '/dashboard/programado/aderir',
          label: 'Aderir',
          icon: <FaFileContract size={16} className="text-green-500" />
        },
        {
          href: '/dashboard/programado/adicionar-dependente',
          label: 'Adicionar Dependente',
          icon: <FaUserPlus size={16} className="text-blue-500" />
        },
        {
          href: '/dashboard/programado/solicitar-beneficio',
          label: 'Solicitar Benefício',
          icon: <FaEnvelope size={16} className="text-purple-500" />
        }
      ]
    },
    {
      type: 'link',
      href: '/dashboard/contatos',
      label: 'Contatos',
      icon: <FaPhone size={20} />
    }
  ];

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('qrcred_user');
      window.location.href = '/login';
    }
  };

  const renderMenuItem = (item: any, isSubmenuItem = false) => {
    if (item.type === 'submenu') {
      return (
        <li key={item.label}>
          <button
            onClick={item.toggle}
            className={`flex items-center justify-between w-full px-5 py-3 text-left transition-colors hover:bg-blue-700 ${
              (pathname.includes('/dashboard/sascred') || 
               pathname.includes('/dashboard/saldo') ||
               pathname.includes('/dashboard/extrato') ||
               pathname.includes('/dashboard/qrcode') ||
               pathname.includes('/dashboard/antecipacao') ||
               pathname.includes('/dashboard/adesao-sasapp')) && item.label === 'SasCred' ? 'bg-blue-700' : ''
            } ${
              pathname.includes('/dashboard/programado') && item.label === 'Programado' ? 'bg-blue-700' : ''
            }`}
          >
            <div className="flex items-center">
              <span className="mr-3">{item.icon}</span>
              {item.label}
              {!loadingAdesao && !jaAderiuSasCred && item.label === 'SasCred' && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  Novo
                </span>
              )}
            </div>
            {item.isOpen ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
          </button>
          
          {/* Submenu items */}
          {item.isOpen && (
            <ul className="bg-gray-700">
              {item.items.map((subItem: any) => {
                // Se o subItem é um submenu (como Antecipação)
                if (subItem.type === 'submenu') {
                  return (
                    <li key={subItem.label}>
                      <button
                        onClick={subItem.toggle}
                        className={`flex items-center justify-between w-full px-8 py-2 text-sm text-left transition-colors hover:bg-blue-700 ${
                          pathname.includes('/dashboard/sascred/antecipacao') ? 'bg-blue-700' : ''
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="mr-3">{subItem.icon}</span>
                          {subItem.label}
                        </div>
                        {subItem.isOpen ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                      </button>
                      
                      {/* Sub-submenu items */}
                      {subItem.isOpen && (
                        <ul className="bg-gray-600">
                          {subItem.items.map((subSubItem: any) => (
                            <li key={subSubItem.href}>
                              <Link href={subSubItem.href} passHref>
                                <div
                                  className={`flex items-center px-12 py-2 text-xs transition-colors hover:bg-blue-700 ${
                                    pathname === subSubItem.href ? 'bg-blue-700' : ''
                                  }`}
                                  onClick={() => setIsOpen(false)}
                                >
                                  <span className="mr-2">{subSubItem.icon}</span>
                                  {subSubItem.label}
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                }
                
                // Item de link normal
                return (
                  <li key={subItem.href}>
                    <Link href={subItem.href} passHref>
                      <div
                        className={`flex items-center px-8 py-2 text-sm transition-colors hover:bg-blue-700 ${
                          pathname === subItem.href ? 'bg-blue-700' : ''
                        }`}
                        onClick={() => setIsOpen(false)}
                      >
                        <span className="mr-3">{subItem.icon}</span>
                        {subItem.label}
                      </div>
                    </Link>
                  </li>
                );
              })}
              
              {/* Mostrar mensagem se não aderiu ainda (só para SasCred) */}
              {!loadingAdesao && !jaAderiuSasCred && item.label === 'SasCred' && item.items.length === 2 && (
                <li className="px-8 py-2 text-xs text-gray-300 border-t border-gray-600 mt-1">
                  <FaInfoCircle className="inline mr-1" />
                  Faça a adesão para acessar mais opções
                </li>
              )}
            </ul>
          )}
        </li>
      );
    }

    // Item de link normal
    return (
      <li key={item.href}>
        <Link href={item.href} passHref>
          <div
            className={`flex items-center px-5 py-3 transition-colors hover:bg-blue-700 ${
              pathname === item.href ? 'bg-blue-700' : ''
            } ${isSubmenuItem ? 'text-sm pl-8' : ''}`}
            onClick={() => setIsOpen(false)}
          >
            <span className="mr-3">{item.icon}</span>
            {item.label}
          </div>
        </Link>
      </li>
    );
  };

  return (
    <>
      {/* Botão de Menu para Mobile */}
      <button 
        className={`lg:hidden fixed top-4 z-50 bg-blue-600 p-2 rounded-md text-white transition-all duration-300 ease-in-out ${
          isOpen ? 'left-60' : 'left-4'
        }`}
        onClick={toggleSidebar}
        aria-label={isOpen ? "Fechar Menu" : "Abrir Menu"}
      >
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Overlay para fechar o menu em mobile */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-full bg-gray-800 text-white transition-all duration-300 ease-in-out z-40 
                  ${isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex flex-col h-full">
          {/* Cabeçalho do Sidebar */}
          <div className="p-5 bg-blue-600">
            <h2 className="text-xl font-bold break-words leading-tight">
              {userData?.nome || userName}
            </h2>
            <p className="text-sm opacity-90 mt-1 truncate">
              Cartão: {userData?.cartao || cardNumber}
            </p>
            <p className="text-sm opacity-90 truncate">
              Convênio: SasApp
            </p>
            
            {/* Indicador de adesão SasCred */}
            <div className="mt-2">
              {/* Removido log excessivo do render para evitar spam no console */}
              {(loadingAdesao && !loadingTimeout) ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  <div className="animate-spin rounded-full h-2 w-2 border-b border-gray-600 mr-2"></div>
                  Verificando...
                </span>
              ) : (() => {
                const finalJaAderiu = jaAderiuSasCred || (loadingTimeout && fallbackAdesao);
                return finalJaAderiu ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <FaMoneyBillWave className="mr-1" size={10} />
                    SasCred Ativo
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <FaFileContract className="mr-1" size={10} />
                    Aderir SasCred
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Links de Navegação */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1">
              {menuItems.map((item) => renderMenuItem(item))}
              
              {/* Menu Antecipação - Só aparece após assinatura digital completa (mantido para compatibilidade) */}
              {assinaturaCompleta && !jaAderiuSasCred && (
                <li>
                  <button
                    onClick={handleAntecipacao}
                    className="flex items-center w-full px-5 py-3 text-left transition-colors hover:bg-green-600"
                  >
                    <span className="mr-3">
                      <FaWhatsapp size={20} />
                    </span>
                    Antecipação (WhatsApp)
                  </button>
                </li>
              )}
            </ul>
          </nav>

          {/* Footer do Sidebar */}
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-left transition-colors hover:bg-red-700 rounded"
            >
              <FaSignOutAlt className="mr-3" />
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
} 