'use client';

import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [hideContent, setHideContent] = useState(true);

  useEffect(() => {
    // Verifica se já mostrou o splash nesta sessão
    if (typeof window !== 'undefined') {
      const splashShown = sessionStorage.getItem('splashShown');
      
      if (splashShown) {
        setShowSplash(false);
        setHideContent(false);
        return;
      }

      // Marca que o splash foi mostrado
      sessionStorage.setItem('splashShown', 'true');

      // Oculta o splash após o vídeo terminar (3 segundos)
      const timer = setTimeout(() => {
        setShowSplash(false);
        // Pequeno delay para transição suave
        setTimeout(() => setHideContent(false), 100);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <>
      {/* Splash Screen com vídeo */}
      {showSplash && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
          <video
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain max-w-md"
            onEnded={() => {
              setShowSplash(false);
              setTimeout(() => setHideContent(false), 100);
            }}
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
