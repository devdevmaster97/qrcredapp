'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isAssinaturaCompleta, abrirCanalAntecipacao } from '@/app/utils/assinatura';
import { useAdesaoSasCred } from '@/app/hooks/useAdesaoSasCred';
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
  FaClock
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
  const pathname = usePathname();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [assinaturaCompleta, setAssinaturaCompleta] = useState(false);
  
  // Hook para verificar adesão ao SasCred
  const { jaAderiu: jaAderiuSasCred, loading: loadingAdesao } = useAdesaoSasCred();

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
      type: 'link', 
      href: '/dashboard/convenios',
      label: 'Convênios',
      icon: <FaStore size={20} />
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
        {
          href: '/dashboard/adesao-sasapp',
          label: 'Aderir',
          icon: <FaStar size={16} className="text-yellow-400" />
        },
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
            href: '/dashboard/antecipacao',
            label: 'Antecipação',
            icon: <FaHistory size={16} />
          },
          {
            href: '/dashboard/sascred/programado',
            label: 'Programado',
            icon: <FaClock size={16} />
          }
        ] : [])
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
              pathname.includes('/dashboard/sascred') || 
              pathname.includes('/dashboard/saldo') ||
              pathname.includes('/dashboard/extrato') ||
              pathname.includes('/dashboard/qrcode') ||
              pathname.includes('/dashboard/antecipacao') ||
              pathname.includes('/dashboard/adesao-sasapp') ? 'bg-blue-700' : ''
            }`}
          >
            <div className="flex items-center">
              <span className="mr-3">{item.icon}</span>
              {item.label}
              {!loadingAdesao && !jaAderiuSasCred && (
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
              {item.items.map((subItem: any) => (
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
              ))}
              
              {/* Mostrar mensagem se não aderiu ainda */}
              {!loadingAdesao && !jaAderiuSasCred && item.items.length === 2 && (
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
            <h2 className="text-xl font-bold truncate">
              {userData?.nome || userName}
            </h2>
            <p className="text-sm opacity-90 mt-1 truncate">
              Cartão: {userData?.cartao || cardNumber}
            </p>
            <p className="text-sm opacity-90 truncate">
              Convênio: SasApp
            </p>
            
            {/* Indicador de adesão SasCred */}
            {!loadingAdesao && (
              <div className="mt-2">
                {jaAderiuSasCred ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <FaMoneyBillWave className="mr-1" size={10} />
                    SasCred Ativo
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <FaStar className="mr-1" size={10} />
                    Aderir SasCred
                  </span>
                )}
              </div>
            )}
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