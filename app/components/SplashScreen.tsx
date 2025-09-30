'use client';

import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Verifica se já mostrou o splash nesta sessão
    if (typeof window !== 'undefined') {
      const splashShown = sessionStorage.getItem('splashShown');
      
      if (splashShown) {
        setShowSplash(false);
        return;
      }

      // Marca que o splash foi mostrado
      sessionStorage.setItem('splashShown', 'true');

      // Oculta o splash após o vídeo terminar (3 segundos)
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  if (!showSplash) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <video
        autoPlay
        muted
        playsInline
        className="w-full h-full object-contain max-w-md"
        onEnded={() => setShowSplash(false)}
      >
        <source src="/videologo.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
