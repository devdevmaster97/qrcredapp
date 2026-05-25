'use client';

import { useState, useEffect } from 'react';
import { FaInfoCircle, FaTimes, FaDownload, FaShieldAlt } from 'react-icons/fa';

export default function InstallPWABanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Verificar se já está instalado (modo standalone)
    const isInStandaloneMode = () => {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://')
      );
    };

    setIsStandalone(isInStandaloneMode());

    // Se já está instalado, não mostrar banner
    if (isInStandaloneMode()) {
      return;
    }

    // Verificar se usuário já fechou o banner (localStorage)
    const bannerDismissed = localStorage.getItem('pwa-install-banner-dismissed');
    const dismissedDate = bannerDismissed ? new Date(bannerDismissed) : null;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Mostrar banner se não foi fechado ou se já passou 1 dia
    if (!bannerDismissed || (dismissedDate && dismissedDate < oneDayAgo)) {
      setShowBanner(true);
    }

    // Capturar evento de instalação do PWA
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Se não há prompt disponível, mostrar instruções manuais
      alert('Para instalar:\n\n1. Toque no menu do navegador (⋮)\n2. Selecione "Adicionar à tela inicial"\n3. Toque em "Adicionar"');
      return;
    }

    // Mostrar prompt de instalação
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA instalado com sucesso');
      setShowBanner(false);
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-banner-dismissed', new Date().toISOString());
  };

  // Não mostrar se já está instalado ou se foi fechado
  if (!showBanner || isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-2xl animate-slide-up">
      <div className="max-w-4xl mx-auto p-4">
        {/* Botão Fechar */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          <FaTimes size={20} />
        </button>

        {/* Conteúdo Principal */}
        <div className="pr-8">
          {/* Título */}
          <div className="flex items-center gap-2 mb-3">
            <FaDownload className="text-yellow-300" size={24} />
            <h3 className="text-lg font-bold">Instale o SasApp no seu celular</h3>
          </div>

          {/* Descrição */}
          <p className="text-sm mb-3 leading-relaxed">
            Acesse mais rápido e tenha uma experiência melhor instalando o app na tela inicial do seu celular.
          </p>

          {/* Alerta sobre Google Play Protect */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-4 border border-white/20">
            <div className="flex items-start gap-2">
              <FaShieldAlt className="text-yellow-300 mt-0.5 flex-shrink-0" size={18} />
              <div className="text-sm">
                <p className="font-semibold mb-1">⚠️ Mensagem do Google Play Protect</p>
                <p className="text-xs leading-relaxed opacity-90">
                  Se aparecer uma mensagem de segurança durante a instalação, <strong>não se preocupe!</strong> 
                  O SasApp é totalmente seguro. Clique em <strong>"Mais detalhes"</strong> e depois em 
                  <strong> "Instalar mesmo assim"</strong>. Esta mensagem aparece porque o app não está na Play Store, 
                  mas isso não significa que há risco para o seu celular.
                </p>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-white text-blue-600 font-semibold py-2.5 px-4 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <FaDownload size={16} />
              Instalar Agora
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 text-white/90 hover:text-white font-medium transition-colors"
            >
              Agora não
            </button>
          </div>

          {/* Instruções Adicionais */}
          <p className="text-xs mt-3 opacity-75 text-center">
            Ou toque no menu do navegador (⋮) e selecione "Adicionar à tela inicial"
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
