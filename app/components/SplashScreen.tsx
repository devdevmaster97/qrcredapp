'use client';

import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    console.log('[SPLASH] Componente montado');
    
    // Timer para ocultar após 3 segundos
    const timer = setTimeout(() => {
      console.log('[SPLASH] Ocultando splash após 3s');
      setShow(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (!show) {
    console.log('[SPLASH] Splash oculto');
    return null;
  }

  console.log('[SPLASH] Renderizando splash');

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
        onLoadedData={() => console.log('[SPLASH] Vídeo carregado')}
        onError={(e) => {
          console.error('[SPLASH] Erro ao carregar vídeo:', e);
          setShow(false);
        }}
        onEnded={() => {
          console.log('[SPLASH] Vídeo terminou');
          setShow(false);
        }}
      >
        <source src="/videologo.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
