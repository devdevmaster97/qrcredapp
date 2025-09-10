'use client';

import { useState, useEffect, useRef } from 'react';
import { FaDownload, FaTimes } from 'react-icons/fa';

// Adicionar interface para o navigator com propriedade standalone
declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

// Declaração de tipo personalizada para o Window
declare global {
  interface Window {
    deferredPrompt?: any;
  }
}

export default function PWAInstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [installedPWA, setInstalledPWA] = useState(false);
  const deferredPrompt = useRef<any>(null);

  useEffect(() => {
    // Verificar se já está instalado como PWA
    if (typeof window !== 'undefined') {
      if (window.matchMedia('(display-mode: standalone)').matches || 
          window.navigator.standalone === true) {
        setInstalledPWA(true);
        return;
      }
    }

    // Intercepta o evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      // Impede que o navegador mostre o prompt automaticamente
      e.preventDefault();
      // Salva o evento para poder disparar mais tarde
      deferredPrompt.current = e;
      // Mostra nosso botão de instalação personalizado
      setIsVisible(true);
    };

    // Adiciona o listener do evento
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      // Verifica se já foi instalado
      window.addEventListener('appinstalled', () => {
        setInstalledPWA(true);
        setIsVisible(false);
        deferredPrompt.current = null;
      });
    }

    // Cleanup ao desmontar
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', () => {});
      }
    };
  }, []);

  const handleInstallClick = () => {
    if (!deferredPrompt.current) {
      // Se o prompt não estiver disponível, oferece instruções alternativas
      const userAgent = navigator.userAgent.toLowerCase();
      
      if (userAgent.includes('android')) {
        // Instruções para Android
        if (confirm('Para instalar o app, clique nos três pontos do menu e selecione "Instalar aplicativo" ou "Adicionar à tela inicial".')) {
          setIsVisible(false);
        }
      } else if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ipod')) {
        // Instruções para iOS foram movidas para componente separado
        setIsVisible(false);
      } else {
        // Outros navegadores
        if (confirm('Para instalar o app, clique no ícone de instalação na barra de endereço do navegador.')) {
          setIsVisible(false);
        }
      }
      return;
    }

    // Mostra o prompt nativo de instalação
    deferredPrompt.current.prompt();
    
    // Espera o usuário responder ao prompt
    deferredPrompt.current.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('Usuário aceitou a instalação do PWA');
        setInstalledPWA(true);
      }
      deferredPrompt.current = null;
      setIsVisible(false);
    });
  };

  // Se o app já estiver instalado ou o prompt não for suportado, não mostra nada
  if (installedPWA || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-4 flex justify-between items-center z-50">
      <div className="flex-1">
        <p className="font-medium">Instale nosso app para uma experiência melhor!</p>
        <p className="text-sm opacity-80">Acesse offline e com mais funcionalidades.</p>
      </div>
      <div className="flex space-x-2">
        <button 
          onClick={handleInstallClick}
          className="flex items-center bg-white text-blue-600 px-4 py-2 rounded font-medium"
        >
          <FaDownload className="mr-2" />
          Instalar
        </button>
        <button 
          onClick={() => setIsVisible(false)}
          className="p-2 rounded hover:bg-blue-700"
          aria-label="Fechar"
        >
          <FaTimes />
        </button>
      </div>
    </div>
  );
} 