'use client';

import { useEffect, useState } from 'react';

// Verifica no carregamento inicial se deve mostrar
const shouldShowSplash = () => {
  if (typeof window === 'undefined') return false;
  const splashShown = sessionStorage.getItem('splashShown');
  return !splashShown;
};

export default function SplashScreen() {
  const [show, setShow] = useState(shouldShowSplash);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const splashShown = sessionStorage.getItem('splashShown');
      
      if (splashShown) {
        // Já mostrou nesta sessão, garante que está oculto
        if (process.env.NODE_ENV === 'development') {
          console.log('[SPLASH] Já foi exibido nesta sessão, pulando');
        }
        setShow(false);
        return;
      }

      // Primeira vez nesta sessão
      if (process.env.NODE_ENV === 'development') {
        console.log('[SPLASH] Primeira abertura, exibindo splash');
      }
      
      // Marca que já foi mostrado
      sessionStorage.setItem('splashShown', 'true');
      
      // Timer para ocultar após 3 segundos
      const timer = setTimeout(() => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[SPLASH] Ocultando splash após 3s');
        }
        setShow(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: 'white'
      }}
    >
      <video
        autoPlay
        muted
        playsInline
        preload="auto"
        className="w-full h-full object-contain"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          maxWidth: '500px'
        }}
        onLoadedData={() => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[SPLASH] Vídeo carregado');
          }
        }}
        onError={(e) => {
          if (process.env.NODE_ENV === 'development') {
            console.error('[SPLASH] Erro ao carregar vídeo:', e);
          }
          setShow(false);
        }}
        onEnded={() => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[SPLASH] Vídeo terminou');
          }
          setShow(false);
        }}
      >
        <source src="/videologo.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
