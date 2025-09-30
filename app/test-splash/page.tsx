'use client';

export default function TestSplash() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-4">Teste do Splash Screen</h1>
      
      <div className="bg-white p-4 rounded shadow mb-4">
        <h2 className="font-bold mb-2">Vídeo Direto:</h2>
        <video
          autoPlay
          muted
          playsInline
          controls
          className="w-full max-w-md"
          onLoadedData={() => console.log('Vídeo carregado')}
          onError={(e) => console.error('Erro:', e)}
        >
          <source src="/videologo.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="bg-white p-4 rounded shadow mb-4">
        <h2 className="font-bold mb-2">Informações:</h2>
        <p>Caminho do vídeo: /videologo.mp4</p>
        <p>Tamanho: ~330KB</p>
        <a 
          href="/videologo.mp4" 
          target="_blank"
          className="text-blue-600 underline"
        >
          Abrir vídeo diretamente
        </a>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-bold mb-2">Console Logs:</h2>
        <p className="text-sm text-gray-600">
          Abra o DevTools (F12) e verifique o console para ver os logs do splash screen
        </p>
      </div>
    </div>
  );
}
