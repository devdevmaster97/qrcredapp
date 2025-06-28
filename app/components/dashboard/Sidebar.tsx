'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  FaWhatsapp,
  FaStar
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
  const pathname = usePathname();
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('qrcred_user');
      if (storedUser) {
        setUserData(JSON.parse(storedUser));
      }
    }
  }, []);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleAntecipacao = () => {
    const numero = '5535998120032';
    const mensagem = 'Olá, quero mais informações sobre Antecipação!';
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
    
    try {
      window.open(url, '_blank');
    } catch (error) {
      window.location.href = url;
    }
    
    setIsOpen(false);
  };

  const menuItems = [
    { href: '/dashboard/saldo', label: 'Saldo', icon: <FaWallet size={20} /> },
    { href: '/dashboard/extrato', label: 'Extrato', icon: <FaClipboardList size={20} /> },
    { href: '/dashboard/convenios', label: 'Convênios', icon: <FaStore size={20} /> },
    { href: '/dashboard/qrcode', label: 'QR Code', icon: <FaQrcode size={20} /> },
    { href: '/dashboard/dados', label: 'Meus Dados', icon: <FaUser size={20} /> },
    { href: '/dashboard/adesao-sasapp', label: 'Aderir ao Sascred', icon: <FaStar size={20} className="text-yellow-400" /> }
  ];

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('qrcred_user');
      window.location.href = '/login';
    }
  };

  return (
    <>
      {/* Botão de Menu para Mobile */}
      <button 
        className="lg:hidden fixed top-4 left-4 z-50 bg-blue-600 p-2 rounded-md text-white"
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
              Convênio: {userData?.nome_divisao || company}
            </p>
          </div>

          {/* Links de Navegação */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} passHref>
                    <div
                      className={`flex items-center px-5 py-3 transition-colors hover:bg-blue-700 ${
                        pathname === item.href ? 'bg-blue-700' : ''
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.label}
                    </div>
                  </Link>
                </li>
              ))}
              
              {/* Menu Antecipação - WhatsApp (renomeado de "Antecipação W") */}
              <li>
                <button
                  onClick={handleAntecipacao}
                  className="flex items-center w-full px-5 py-3 text-left transition-colors hover:bg-green-600"
                >
                  <span className="mr-3">
                    <FaWhatsapp size={20} />
                  </span>
                  Antecipação
                </button>
              </li>
            </ul>
          </nav>

          {/* Rodapé do Sidebar */}
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