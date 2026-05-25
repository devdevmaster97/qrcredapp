'use client';

import { useState, useEffect } from 'react';

interface LogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'warn' | 'error';
}

export default function DebugLogger() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Interceptar console.log
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setLogs(prev => [...prev.slice(-50), { 
        timestamp: Date.now(), 
        message, 
        type: 'info' 
      }]);
      
      originalLog(...args);
    };

    console.warn = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setLogs(prev => [...prev.slice(-50), { 
        timestamp: Date.now(), 
        message, 
        type: 'warn' 
      }]);
      
      originalWarn(...args);
    };

    console.error = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setLogs(prev => [...prev.slice(-50), { 
        timestamp: Date.now(), 
        message, 
        type: 'error' 
      }]);
      
      originalError(...args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-[9999] bg-purple-600 text-white p-3 rounded-full shadow-lg"
        style={{ touchAction: 'manipulation' }}
      >
        🐛 Debug
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-90 flex flex-col">
      {/* Header */}
      <div className="bg-purple-600 text-white p-3 flex justify-between items-center">
        <h2 className="font-bold text-lg">🐛 Debug Console</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setLogs([])}
            className="bg-red-500 px-3 py-1 rounded text-sm"
          >
            🗑️ Limpar
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="bg-gray-700 px-3 py-1 rounded text-sm"
          >
            ✕ Fechar
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
        {logs.length === 0 ? (
          <div className="text-gray-400 text-center mt-10">
            Nenhum log ainda. Faça uma ação no app.
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={`mb-2 p-2 rounded ${
                log.type === 'error' 
                  ? 'bg-red-900 text-red-200' 
                  : log.type === 'warn'
                  ? 'bg-yellow-900 text-yellow-200'
                  : 'bg-gray-800 text-green-200'
              }`}
            >
              <div className="text-gray-400 text-[10px] mb-1">
                {new Date(log.timestamp).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  fractionalSecondDigits: 3
                })}
              </div>
              <pre className="whitespace-pre-wrap break-words">
                {log.message}
              </pre>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-800 text-gray-400 p-2 text-xs text-center">
        Total de logs: {logs.length} (últimos 50)
      </div>
    </div>
  );
}
