'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaUser, FaStore } from 'react-icons/fa';
import MenuCard from '../components/MenuCard';
import Logo from '../components/Logo';
import UpdateChecker from '../components/UpdateChecker';

interface ReactNativeWindow extends Window {
  ReactNativeWebView?: {
    postMessage: (message: string) => void;
  };
}

interface AndroidWindow extends Window {
  Android?: {
    exitApp: () => void;
  };
}

interface WebkitWindow extends Window {
  webkit?: {
    messageHandlers?: {
      exitApp?: {
        postMessage: (message: string) => void;
      };
    };
  };
}

export default function MenuPage() {
  const router = useRouter();
  const [appVersion, setAppVersion] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setAppVersion('1.0.0');
  }, []);

  const handleUserCardClick = () => {
    router.push('/login');
  };

  const handleConvenioCardClick = () => {
    router.push('/convenio/login');
  };

  const handlePoliticaPrivacidadeClick = () => {
    router.push('/politica-privacidade');
  };
  
  const handleEncerrarApp = () => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    if (isMobile) {
      const windowWithRN = window as ReactNativeWindow;
      const windowWithAndroid = window as AndroidWindow;
      const windowWithWebkit = window as WebkitWindow;
      
      if (windowWithRN.ReactNativeWebView) {
        windowWithRN.ReactNativeWebView.postMessage(JSON.stringify({ type: 'EXIT_APP' }));
        return;
      }
      
      if (windowWithAndroid.Android) {
        windowWithAndroid.Android.exitApp();
        return;
      }
      
      if (windowWithWebkit.webkit?.messageHandlers?.exitApp) {
        windowWithWebkit.webkit.messageHandlers.exitApp.postMessage('');
        return;
      }
      
      const confirmExit = confirm('Para sair completamente do aplicativo, feche-o usando os controles do seu dispositivo:\n\n• Android: botão Recentes e deslize o app para cima\n• iOS: deslize para cima a partir da parte inferior da tela');
      
      if (confirmExit) {
        router.push('/');
      }
      return;
    }
    
    if (typeof window !== 'undefined' && window.close) {
      window.close();
      return;
    }
    
    alert('Aplicativo encerrado com sucesso!');
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        {/* Tela em branco durante carregamento - splash screen cuida da exibição inicial */}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <main className="container mx-auto py-4 md:py-8 flex flex-col items-center w-full max-w-md md:max-w-2xl">
        <div className="mb-6 md:mb-10 text-center">
          <div className="mb-3 md:mb-4">
            <Logo size="md" />
          </div>
          <div className="max-w-sm md:max-w-md mx-auto">
            <h1 className="text-xl md:text-3xl font-bold text-gray-800 leading-tight">
              Sistema de Assistência Social
            </h1>
            <h2 className="text-lg md:text-2xl font-semibold text-blue-600 mt-1 md:mt-2">
              por Convênios
            </h2>
            <div className="w-16 md:w-20 h-1 bg-gradient-to-r from-blue-600 to-green-500 mx-auto mt-2 md:mt-4 rounded-full"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full max-w-sm md:max-w-lg mx-auto">
          <MenuCard 
            icon={<FaUser />} 
            title="Área do Associado" 
            onClick={handleUserCardClick} 
          />
          <MenuCard 
            icon={<FaStore />} 
            title="Área do Convênio" 
            onClick={handleConvenioCardClick} 
          />
        </div>
        
        <div className="mt-6 md:mt-12 text-center">
          <div className="flex flex-wrap justify-center gap-4 mb-2">
            <button 
              onClick={handlePoliticaPrivacidadeClick}
              className="text-blue-600 hover:underline text-sm"
            >
              Política de Privacidade
            </button>
          </div>
          <p className="text-gray-500 text-xs mt-1">
            Versão: {appVersion}
          </p>
        </div>
      </main>

      <UpdateChecker />
    </div>
  );
}
