'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaCheckCircle, FaHome, FaPlus, FaReceipt } from 'react-icons/fa';
import Header from '../../../../components/Header';

interface DadosTransacao {
  associado: string;
  cpf: string;
  valor: string;
  parcelas: number;
  valorParcela: number;
  descricao: string;
  timestamp: string;
}

export default function SucessoPage() {
  const router = useRouter();
  const [dadosTransacao, setDadosTransacao] = useState<DadosTransacao | null>(null);

  useEffect(() => {
    // Recuperar dados da transação do localStorage
    const dadosString = localStorage.getItem('ultimaTransacao');
    if (dadosString) {
      try {
        const dados = JSON.parse(dadosString);
        setDadosTransacao(dados);
        // Limpar dados após carregar para evitar reutilização
        localStorage.removeItem('ultimaTransacao');
      } catch (error) {
        console.error('Erro ao carregar dados da transação:', error);
        // Se não conseguir carregar, redirecionar de volta
        router.push('/convenio/dashboard/lancamentos');
      }
    } else {
      // Se não há dados, redirecionar de volta
      router.push('/convenio/dashboard/lancamentos');
    }
  }, [router]);

  const formatarData = (timestamp: string) => {
    const data = new Date(timestamp);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!dadosTransacao) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="bg-gradient-to-br from-green-50 to-emerald-100 text-white p-4 shadow-md">
        <div className="container mx-auto flex items-center">
          <h1 className="text-xl font-bold"></h1>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Ícone de Sucesso Animado */}
        <div className="text-center mb-8" style={{ paddingTop: '30px' }}>
          <div className="relative inline-block mb-6">
            {/* Círculo animado de fundo */}
            <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center animate-bounce shadow-2xl">
              <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center animate-pulse">
                <FaCheckCircle className="text-white text-5xl animate-ping" />
              </div>
            </div>
            {/* Efeito de ondas */}
            <div className="absolute inset-0 w-32 h-32 bg-green-400 rounded-full animate-ping opacity-30"></div>
            <div className="absolute inset-0 w-32 h-32 bg-green-300 rounded-full animate-ping opacity-20" style={{animationDelay: '0.5s'}}></div>
          </div>
          <h1 className="text-3xl font-bold text-green-800 mb-2">
            Transação Efetuada com Sucesso!
          </h1>
        </div>

        {/* Detalhes da Transação */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-green-200 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FaReceipt className="text-green-600" />
            Detalhes da Transação
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className="text-xs text-gray-500 uppercase tracking-wide block">Associado</span>
                <div className="font-semibold text-gray-800">{dadosTransacao.associado}</div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className="text-xs text-gray-500 uppercase tracking-wide block">CPF</span>
                <div className="font-semibold text-gray-800">{dadosTransacao.cpf || 'Não informado'}</div>
              </div>
            </div>

            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <span className="text-xs text-green-600 uppercase tracking-wide block">Valor Total</span>
                  <div className="text-2xl font-bold text-green-800">{dadosTransacao.valor}</div>
                </div>
                
                <div>
                  <span className="text-xs text-green-600 uppercase tracking-wide block">Parcelas</span>
                  <div className="text-2xl font-bold text-green-800">{dadosTransacao.parcelas}x</div>
                </div>
                
                {dadosTransacao.valorParcela > 0 && (
                  <div>
                    <span className="text-xs text-green-600 uppercase tracking-wide block">Valor por Parcela</span>
                    <div className="text-2xl font-bold text-green-800">
                      {dadosTransacao.valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {dadosTransacao.descricao && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className="text-xs text-gray-500 uppercase tracking-wide block">Descrição</span>
                <div className="font-semibold text-gray-800">{dadosTransacao.descricao}</div>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <span className="text-xs text-blue-600 uppercase tracking-wide block">Data e Hora</span>
              <div className="font-semibold text-blue-800">{formatarData(dadosTransacao.timestamp)}</div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="space-y-4">
          <button
            onClick={() => router.push('/convenio/dashboard/lancamentos/novo')}
            className="w-full py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center gap-3 font-bold text-lg transition-all transform hover:scale-[1.02] shadow-lg"
          >
            <FaPlus className="text-xl" />
            Novo Lançamento
          </button>
          
          <button
            onClick={() => router.push('/convenio/dashboard')}
            className="w-full py-4 bg-gray-600 text-white rounded-xl hover:bg-gray-700 flex items-center justify-center gap-3 font-bold text-lg transition-all transform hover:scale-[1.02] shadow-lg"
          >
            <FaHome className="text-xl" />
            Voltar à Página Principal
          </button>
        </div>

      </div>
    </div>
  );
}
