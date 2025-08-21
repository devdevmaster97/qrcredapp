'use client';

import { useState } from 'react';

export default function TestAntecipacao() {
  const [codigo, setCodigo] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testarAPI = async () => {
    if (!codigo) {
      alert('Digite um código');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/verificar-adesao-antecipacao-simples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ codigo })
      });

      const data = await response.json();
      setResultado(data);
      console.log('Resultado da API:', data);
    } catch (error) {
      console.error('Erro:', error);
      setResultado({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Teste API Antecipação</h1>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código do Associado:
            </label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Digite o código..."
            />
          </div>
          
          <button
            onClick={testarAPI}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-md"
          >
            {loading ? 'Testando...' : 'Testar API'}
          </button>
        </div>

        {resultado && (
          <div className="mt-6 bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Resultado:</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(resultado, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
