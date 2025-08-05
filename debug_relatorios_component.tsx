'use client';

import { useState } from 'react';
import { FaBug, FaEye, FaDatabase, FaCode } from 'react-icons/fa';

interface DebugRelatoriosProps {
  lancamentos: any[];
  mesesDisponiveis: string[];
  mesSelecionado: string;
}

export default function DebugRelatorios({ lancamentos, mesesDisponiveis, mesSelecionado }: DebugRelatoriosProps) {
  const [showDebug, setShowDebug] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

  if (!showDebug) {
    return (
      <button
        onClick={() => setShowDebug(true)}
        className="fixed bottom-4 right-4 bg-red-500 text-white p-3 rounded-full shadow-lg hover:bg-red-600 z-50"
        title="Debug Relatórios"
      >
        <FaBug size={20} />
      </button>
    );
  }

  // Análise dos dados
  const totalLancamentos = lancamentos.length;
  const lancamentosAgo2025 = lancamentos.filter(l => l.mes === 'AGO/2025');
  const mesesUnicos = Array.from(new Set(lancamentos.map(l => l.mes))).sort();
  const temAgo2025 = mesesUnicos.includes('AGO/2025');
  const mesesComAno2025 = mesesUnicos.filter(m => m.includes('2025'));

  // Análise de convenios
  const conveniosUnicos = Array.from(new Set(lancamentos.map(l => l.convenio || 'N/A')));

  // Últimos lançamentos
  const ultimosLancamentos = lancamentos.slice(0, 5);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <FaBug className="mr-2 text-red-500" />
            Debug - Relatórios de Convênio
          </h2>
          <button
            onClick={() => setShowDebug(false)}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Resumo Geral */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
              <FaDatabase className="mr-2" />
              Resumo dos Dados
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-700">Total Lançamentos</div>
                <div className="text-lg font-bold text-blue-600">{totalLancamentos}</div>
              </div>
              <div>
                <div className="font-medium text-gray-700">AGO/2025</div>
                <div className={`text-lg font-bold ${temAgo2025 ? 'text-green-600' : 'text-red-600'}`}>
                  {lancamentosAgo2025.length}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Meses Únicos</div>
                <div className="text-lg font-bold text-purple-600">{mesesUnicos.length}</div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Convênios</div>
                <div className="text-lg font-bold text-orange-600">{conveniosUnicos.length}</div>
              </div>
            </div>
          </div>

          {/* Status AGO/2025 */}
          <div className={`border rounded-lg p-4 ${temAgo2025 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <h3 className={`font-semibold mb-3 ${temAgo2025 ? 'text-green-800' : 'text-red-800'}`}>
              Status AGO/2025
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Encontrado nos dados: </span>
                <span className={temAgo2025 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                  {temAgo2025 ? 'SIM' : 'NÃO'}
                </span>
              </div>
              <div>
                <span className="font-medium">Quantidade: </span>
                <span className="font-bold">{lancamentosAgo2025.length} lançamentos</span>
              </div>
              <div>
                <span className="font-medium">Na lista de meses disponíveis: </span>
                <span className={mesesDisponiveis.includes('AGO/2025') ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                  {mesesDisponiveis.includes('AGO/2025') ? 'SIM' : 'NÃO'}
                </span>
              </div>
              <div>
                <span className="font-medium">Mês selecionado atual: </span>
                <span className="font-bold">{mesSelecionado}</span>
              </div>
            </div>
          </div>

          {/* Meses de 2025 */}
          {mesesComAno2025.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-3">Meses de 2025 Encontrados</h3>
              <div className="flex flex-wrap gap-2">
                {mesesComAno2025.map(mes => (
                  <span key={mes} className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-sm">
                    {mes}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Todos os Meses */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Todos os Meses Únicos</h3>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {mesesUnicos.map(mes => (
                <span key={mes} className={`px-2 py-1 rounded text-sm ${
                  mes === 'AGO/2025' ? 'bg-green-200 text-green-800 font-bold' :
                  mes.includes('2025') ? 'bg-blue-200 text-blue-800' :
                  'bg-gray-200 text-gray-700'
                }`}>
                  {mes}
                </span>
              ))}
            </div>
          </div>

          {/* Lançamentos AGO/2025 (se houver) */}
          {lancamentosAgo2025.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-3">
                Lançamentos AGO/2025 ({lancamentosAgo2025.length})
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {lancamentosAgo2025.map(lanc => (
                  <div key={lanc.id} className="text-sm bg-white p-2 rounded border">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div><span className="font-medium">ID:</span> {lanc.id}</div>
                      <div><span className="font-medium">Data:</span> {lanc.data}</div>
                      <div><span className="font-medium">Valor:</span> R$ {lanc.valor}</div>
                      <div><span className="font-medium">Associado:</span> {lanc.associado}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Últimos Lançamentos */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-800 mb-3">Últimos 5 Lançamentos</h3>
            <div className="space-y-2 text-sm">
              {ultimosLancamentos.map(lanc => (
                <div key={lanc.id} className="bg-white p-2 rounded border">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div><span className="font-medium">ID:</span> {lanc.id}</div>
                    <div><span className="font-medium">Data:</span> {lanc.data}</div>
                    <div><span className="font-medium">Mês:</span> 
                      <span className={lanc.mes === 'AGO/2025' ? 'font-bold text-green-600' : ''}>
                        {lanc.mes}
                      </span>
                    </div>
                    <div><span className="font-medium">Valor:</span> R$ {lanc.valor}</div>
                    <div><span className="font-medium">Associado:</span> {lanc.associado}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dados Brutos */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
              <FaCode className="mr-2" />
              Dados Brutos
              <button
                onClick={() => setShowRawData(!showRawData)}
                className="ml-2 px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
              >
                {showRawData ? 'Ocultar' : 'Mostrar'}
              </button>
            </h3>
            {showRawData && (
              <div className="bg-white p-3 rounded border max-h-60 overflow-auto">
                <pre className="text-xs text-gray-600">
                  {JSON.stringify({ lancamentos, mesesDisponiveis, mesSelecionado }, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Instruções */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-3">Próximos Passos</h3>
            <div className="text-sm space-y-2">
              {!temAgo2025 ? (
                <div className="text-red-600">
                  ❌ AGO/2025 não foi encontrado nos dados retornados pela API.
                  <br />
                  Verifique se a API PHP `listar_lancamentos_convenio_app.php` está retornando todos os dados.
                </div>
              ) : !mesesDisponiveis.includes('AGO/2025') ? (
                <div className="text-yellow-600">
                  ⚠️ AGO/2025 existe nos dados mas não aparece na lista de meses disponíveis.
                  <br />
                  Verifique a lógica de extração de meses únicos no frontend.
                </div>
              ) : (
                <div className="text-green-600">
                  ✅ AGO/2025 foi encontrado e está disponível. Verifique se o filtro está funcionando.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}