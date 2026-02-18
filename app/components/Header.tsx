'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

export default function Header({ title, showBackButton = false, onBackClick }: HeaderProps) {
  const router = useRouter();
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detectar iOS (iPhone, iPad, iPod)
    if (typeof window !== 'undefined') {
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsIOS(isIOSDevice);
    }
  }, []);

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.back();
    }
  };

  return (
    <header 
      className="bg-blue-600 text-white p-4 shadow-md"
      style={{
        paddingTop: isIOS ? 'calc(env(safe-area-inset-top, 0px) + 1rem)' : undefined
      }}
    >
      <div className="container mx-auto flex items-center">
        {showBackButton && (
          <button
            onClick={handleBackClick}
            className="mr-4 p-1 rounded-full hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="Voltar"
          >
            <FaArrowLeft size={20} />
          </button>
        )}
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
    </header>
  );
}