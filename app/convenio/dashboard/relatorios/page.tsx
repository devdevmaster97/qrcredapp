'use client';

import { useState, useEffect } from 'react';
import { FaSpinner, FaFilter, FaUndo, FaExclamationTriangle, FaTimes, FaCheck } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import axios from 'axios';

interface Lancamento {
  id: number;
  data: string;
  hora: string;
  valor: string;
  associado: string;
  empregador: string;
  mes: string;
  parcela: number;
  descricao: string;
  data_fatura: string;
  matricula?: string;
  codigoempregador?: number;
}

export default function RelatoriosPage() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState<string>('');
  const [mesesDisponiveis, setMesesDisponiveis] = useState<string[]>([]);
  const [loadingLancamentos, setLoadingLancamentos] = useState(true);
  const [estornandoId, setEstornandoId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState<Lancamento | null>(null);

  // Função para gerar o mês corrente no formato abreviado (ex: JAN/2024)
  const gerarMesCorrente = () => {
    const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const data = new Date();
    const mes = meses[data.getMonth()];
    const ano = data.getFullYear();
    return `${mes}/${ano}`;
  };

  // Buscar lançamentos do banco de dados
  useEffect(() => {
    const buscarLancamentos = async () => {
      try {
        const response = await fetch('/api/convenio/lancamentos');
        const data = await response.json();

        if (data.success) {
          setLancamentos(data.data);
          // Extrair meses únicos dos lançamentos
          const meses = Array.from(new Set(data.data.map((l: Lancamento) => l.mes))) as string[];
          // Ordenar meses do mais recente para o mais antigo
          const mesesOrdenados = meses.sort().reverse();
          setMesesDisponiveis(mesesOrdenados);
          
          // Definir o mês corrente como padrão
          const mesCorrente = gerarMesCorrente();
          setMesSelecionado(mesCorrente);
        } else {
          toast.error(data.message || 'Erro ao buscar lançamentos');
        }
      } catch (error) {
        console.error('Erro ao buscar lançamentos:', error);
        toast.error('Erro ao conectar com o servidor');
      } finally {
        setLoadingLancamentos(false);
      }
    };

    buscarLancamentos();
  }, []);

  // Filtrar lançamentos pelo mês selecionado
  const lancamentosFiltrados = mesSelecionado
    ? lancamentos.filter(l => l.mes === mesSelecionado)
    : lancamentos;

  // Abrir modal de confirmação antes de estornar
  const confirmarEstorno = (lancamento: Lancamento) => {
    setLancamentoSelecionado(lancamento);
    setShowModal(true);
  };

  // Função para estornar um lançamento
  const handleEstornar = async () => {
    if (!lancamentoSelecionado) return;
    
    const id = lancamentoSelecionado.id;
    setEstornandoId(id);
    setShowModal(false);
    
    try {
      // Log de debug para verificar a estrutura dos dados
      console.log('Lançamento selecionado:', lancamentoSelecionado);
      
      // Extrair código do empregador - verificar primeiro se codigoempregador existe
      let codigoEmpregador;
      if (lancamentoSelecionado.codigoempregador) {
        codigoEmpregador = lancamentoSelecionado.codigoempregador;
      } else {
        // Tentativa de extrair o código do texto (assumindo formato "CÓDIGO - Nome")
        const empregadorParts = lancamentoSelecionado.empregador.split(' - ');
        if (empregadorParts.length > 1 && !isNaN(Number(empregadorParts[0]))) {
          codigoEmpregador = parseInt(empregadorParts[0]);
        } else {
          // Fallback: usar 1 como código padrão ou perguntar ao usuário
          codigoEmpregador = 1; 
        }
      }
      
      // Formatação de data se necessário (DD/MM/YYYY -> YYYY-MM-DD)
      let dataFormatada = lancamentoSelecionado.data;
      if (dataFormatada.includes('/')) {
        const [dia, mes, ano] = dataFormatada.split('/');
        dataFormatada = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      }
      
      // Formatar o valor substituindo vírgula por ponto
      const valorFormatado = lancamentoSelecionado.valor.replace(',', '.');
      
      // Preparando os dados para enviar para a API
      const dadosEstorno = {
        lancamento: id.toString(),
        data: dataFormatada,
        hora: lancamentoSelecionado.hora, // Formato HH:MM:SS
        empregador: codigoEmpregador, // Enviando como número
        valor: valorFormatado, // Valor formatado com ponto
        mes: lancamentoSelecionado.mes
      };

      // Log de debug para verificar os parâmetros
      console.log('Parâmetros enviados para API:', dadosEstorno);

      // Chamada para a API Next.js
      const response = await fetch('/api/convenio/estorno', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosEstorno),
      });

      const resultData = await response.json();
      console.log('Resposta da API de estorno:', resultData);

      if (resultData.success) {
        toast.success('Lançamento estornado com sucesso');
        // Atualizar a lista removendo o item estornado
        setLancamentos(lancamentos.filter(l => l.id !== id));
      } else {
        toast.error(resultData.message || 'Erro ao estornar lançamento');
      }
    } catch (error) {
      console.error('Erro ao estornar lançamento:', error);
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setEstornandoId(null);
      setLancamentoSelecionado(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="mt-1 text-sm text-gray-600">Visualize e analise os dados do seu convênio</p>
      </div>

      {/* Listagem de Lançamentos */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-3">
          <h2 className="text-lg font-medium text-gray-900">Lançamentos</h2>
          <div className="flex items-center space-x-2">
            <FaFilter className="text-gray-500" />
            <label htmlFor="mes" className="text-sm font-medium text-gray-700">
              Filtrar por Mês:
            </label>
            <select
              id="mes"
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
              className="block w-full md:w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="">Todos os Meses</option>
              {mesesDisponiveis.map((mes) => (
                <option key={mes} value={mes}>
                  {mes}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadingLancamentos ? (
          <div className="text-center py-8">
            <FaSpinner className="animate-spin h-8 w-8 mx-auto text-blue-600" />
          </div>
        ) : lancamentosFiltrados.length > 0 ? (
          <>
            {/* Versão para Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Associado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empregador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mês
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Parcela
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Fatura
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lancamentosFiltrados.map((lancamento) => (
                    <tr key={lancamento.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lancamento.data} {lancamento.hora}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lancamento.associado}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lancamento.empregador}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        R$ {lancamento.valor}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lancamento.mes}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lancamento.parcela}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lancamento.data_fatura || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => confirmarEstorno(lancamento)}
                          disabled={estornandoId === lancamento.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {estornandoId === lancamento.id ? (
                            <FaSpinner className="animate-spin h-5 w-5" />
                          ) : (
                            <FaUndo className="h-5 w-5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Versão para Mobile */}
            <div className="md:hidden space-y-4">
              {lancamentosFiltrados.map((lancamento) => (
                <div key={lancamento.id} className="bg-white rounded-lg shadow border border-gray-200 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {lancamento.associado}
                      </h3>
                      <p className="text-sm text-gray-500">{lancamento.empregador}</p>
                    </div>
                    <span className="font-bold text-gray-900">R$ {lancamento.valor}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-gray-500">Data:</span>{' '}
                      <span className="text-gray-900">{lancamento.data}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Hora:</span>{' '}
                      <span className="text-gray-900">{lancamento.hora}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Mês:</span>{' '}
                      <span className="text-gray-900">{lancamento.mes}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Parcela:</span>{' '}
                      <span className="text-gray-900">{lancamento.parcela}</span>
                    </div>
                    {lancamento.data_fatura && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Data Fatura:</span>{' '}
                        <span className="text-gray-900">{lancamento.data_fatura}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2 border-t pt-2 flex justify-end">
                    <button
                      onClick={() => confirmarEstorno(lancamento)}
                      disabled={estornandoId === lancamento.id}
                      className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {estornandoId === lancamento.id ? (
                        <>
                          <FaSpinner className="animate-spin mr-2 h-4 w-4" />
                          Estornando...
                        </>
                      ) : (
                        <>
                          <FaUndo className="mr-2 h-4 w-4" />
                          Estornar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg p-8 text-center">
            <FaExclamationTriangle className="mx-auto h-12 w-12 text-yellow-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhum lançamento encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">
              {mesSelecionado 
                ? `Não há lançamentos registrados para o mês ${mesSelecionado}.` 
                : 'Não há lançamentos registrados no sistema.'}
            </p>
          </div>
        )}
      </div>

      {/* Modal de confirmação */}
      {showModal && lancamentoSelecionado && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full overflow-hidden shadow-xl transform transition-all">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <FaExclamationTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Confirmar estorno
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Tem certeza que deseja estornar este lançamento? Esta ação não poderá ser desfeita.
                    </p>
                    
                    <div className="mt-3 bg-gray-50 p-3 rounded-md text-sm">
                      <p><span className="font-semibold">Associado:</span> {lancamentoSelecionado.associado}</p>
                      <p><span className="font-semibold">Data:</span> {lancamentoSelecionado.data}</p>
                      <p><span className="font-semibold">Valor:</span> R$ {lancamentoSelecionado.valor}</p>
                      <p><span className="font-semibold">Mês:</span> {lancamentoSelecionado.mes}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={handleEstornar}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Confirmar Estorno
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}