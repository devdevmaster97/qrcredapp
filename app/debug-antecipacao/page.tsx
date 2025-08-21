'use client';

import { useState } from 'react';
import { useAdesaoAntecipacao } from '@/app/hooks/useAdesaoAntecipacao';

export default function DebugAntecipacao() {
  const [codigo, setCodigo] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Hook de adesão para teste
  const { jaAderiu, loading: hookLoading, dadosAdesao } = useAdesaoAntecipacao();

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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🔍 Debug Antecipação</h1>
        
        {/* Status do Hook */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Status do Hook useAdesaoAntecipacao:</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm font-medium text-gray-600">Já Aderiu</div>
              <div className={`text-lg font-bold ${jaAderiu ? 'text-green-600' : 'text-red-600'}`}>
                {jaAderiu ? '✅ SIM' : '❌ NÃO'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm font-medium text-gray-600">Loading</div>
              <div className={`text-lg font-bold ${hookLoading ? 'text-yellow-600' : 'text-green-600'}`}>
                {hookLoading ? '🔄 SIM' : '✅ NÃO'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm font-medium text-gray-600">Dados</div>
              <div className="text-sm">
                {dadosAdesao ? '📄 Presentes' : '❌ Ausentes'}
              </div>
            </div>
          </div>
          
          {dadosAdesao && (
            <div className="mt-4 p-4 bg-blue-50 rounded">
              <h3 className="font-semibold mb-2">Dados da Adesão:</h3>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(dadosAdesao, null, 2)}
              </pre>
            </div>
          )}
        </div>
        
        {/* Teste Manual da API */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Teste Manual da API</h2>
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
            <h2 className="text-lg font-semibold mb-4">Resultado da API:</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(resultado, null, 2)}
            </pre>
          </div>
        )}

        {/* Instruções */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 p-4 rounded">
          <h3 className="font-semibold text-yellow-800 mb-2">📝 Como testar:</h3>
          <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
            <li>Digite um código de associado que tenha assinado o contrato de antecipação</li>
            <li>Clique em "Testar API" para ver a resposta</li>
            <li>Verifique se "jaAderiu" está retornando true</li>
            <li>Observe os logs no console do navegador (F12)</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-semibold text-blue-800 mb-2">🔍 Critérios de Detecção:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• <strong>SasCred:</strong> "TERMO DE ADESÃO DO CARTÃO CONVÊNIO"</li>
              <li>• <strong>Antecipação:</strong> "Contrato de Antecipação Salarial"</li>
              <li>• <strong>Tipo:</strong> "antecipacao" ou "antecipação"</li>
              <li>• <strong>Has_signed:</strong> true + doc_name com "antecip"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
