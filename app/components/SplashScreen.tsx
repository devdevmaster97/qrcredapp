'use client';

import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [hideContent, setHideContent] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Detecta se foi aberto via PWA
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                    (window.navigator as any).standalone ||
                    document.referrer.includes('android-app://');
      
      const urlParams = new URLSearchParams(window.location.search);
      const fromPWA = urlParams.get('source') === 'pwa';
      
      console.log('[SPLASH] isPWA:', isPWA, 'fromPWA:', fromPWA);
      
      // Se for PWA, sempre mostra o splash na primeira vez
      const splashShown = sessionStorage.getItem('splashShown');
      
      if (splashShown && !fromPWA) {
        setShowSplash(false);
        setHideContent(false);
        return;
      }

      // Marca que o splash foi mostrado
      sessionStorage.setItem('splashShown', 'true');

      // Fallback: se vídeo não carregar em 1 segundo, oculta splash
      const fallbackTimer = setTimeout(() => {
        if (!videoLoaded) {
          console.log('[SPLASH] Vídeo não carregou, ocultando splash');
          setShowSplash(false);
          setTimeout(() => setHideContent(false), 100);
        }
      }, 1000);

      // Timer principal: 3 segundos
      const mainTimer = setTimeout(() => {
        setShowSplash(false);
        setTimeout(() => setHideContent(false), 100);
      }, 3000);

      return () => {
        clearTimeout(fallbackTimer);
        clearTimeout(mainTimer);
      };
    }
  }, [videoLoaded]);

  const handleVideoLoad = () => {
    console.log('[SPLASH] Vídeo carregado com sucesso');
    setVideoLoaded(true);
  };

  const handleVideoError = (e: any) => {
    console.error('[SPLASH] Erro ao carregar vídeo:', e);
    // Se vídeo falhar, oculta splash imediatamente
    setShowSplash(false);
    setHideContent(false);
  };

  const handleVideoEnd = () => {
    console.log('[SPLASH] Vídeo terminou');
    setShowSplash(false);
    setTimeout(() => setHideContent(false), 100);
  };

  return (
    <>
      {/* Splash Screen com vídeo */}
      {showSplash && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
          <video
            autoPlay
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-contain max-w-md"
            onLoadedData={handleVideoLoad}
            onError={handleVideoError}
            onEnded={handleVideoEnd}
          >
            <source src="/videologo.mp4" type="video/mp4" />
          </video>
        </div>
      )}
      
      {/* Overlay para esconder conteúdo durante splash */}
      {hideContent && (
        <div className="fixed inset-0 z-[9998] bg-white" />
      )}
    </>
  );
}
