'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaArrowLeft, FaMoneyBillWave, FaCalculator, FaWhatsapp, FaShieldAlt, FaCheckCircle } from 'react-icons/fa';
import { isAssinaturaCompleta, abrirCanalAntecipacao } from '@/app/utils/assinatura';

export default function AnteciparSasCred() {
  const [assinaturaCompleta, setAssinaturaCompleta] = useState(false);
  const [valor, setValor] = useState('');
  const [simulacao, setSimulacao] = useState<any>(null);

  useEffect(() => {
    setAssinaturaCompleta(isAssinaturaCompleta());
  }, []);

  const calcularSimulacao = () => {
    const valorNumerico = parseFloat(valor.replace(/[^\d,]/g, '').replace(',', '.'));
    if (valorNumerico > 0) {
      // Simulação básica - você pode ajustar conforme as regras reais
      const taxa = 0.05; // 5% de taxa exemplo
      const valorTaxa = valorNumerico * taxa;
      const valorLiquido = valorNumerico - valorTaxa;
      
      setSimulacao({
        valorSolicitado: valorNumerico,
        taxa: valorTaxa,
        valorLiquido: valorLiquido
      });
    }
  };

  const handleSolicitarAntecipacao = () => {
    // Abrir canal do WhatsApp para antecipação
    abrirCanalAntecipacao();
  };

  // Se não tem assinatura digital completa, redirecionar para aderir
  if (!assinaturaCompleta) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link 
              href="/dashboard" 
              className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
              <FaArrowLeft className="mr-2" />
              Voltar a página principal
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <FaShieldAlt className="text-yellow-500 text-6xl mx-auto mb-6" />
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Assinatura Digital Necessária
            </h2>
            
            <p className="text-gray-600 mb-8">
              Para acessar a funcionalidade de antecipação, você precisa primeiro fazer a adesão com assinatura digital.
            </p>
            
            <Link 
              href="/dashboard/sascred/antecipacao/aderir"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg inline-flex items-center transition-colors"
            >
              <FaFileContract className="mr-3" />
              Fazer Adesão com Assinatura Digital
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <FaArrowLeft className="mr-2" />
            Voltar a página principal
          </Link>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Solicitar Antecipação
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Antecipe seu salário de forma rápida e segura
            </p>
          </div>
        </div>

        {/* Status da Assinatura */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center justify-center mb-4">
            <FaCheckCircle className="text-green-500 text-3xl mr-3" />
            <h2 className="text-2xl font-bold text-green-700">
              Assinatura Digital Completa
            </h2>
          </div>
          <p className="text-center text-gray-600">
            Parabéns! Sua assinatura digital foi validada e você já pode solicitar antecipações.
          </p>
        </div>

        {/* Simulador */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center mb-6">
            <FaCalculator className="text-blue-500 text-3xl mr-4" />
            <h2 className="text-2xl font-bold text-gray-900">
              Simular Antecipação
            </h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor Desejado
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="R$ 0,00"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={calcularSimulacao}
                  className="ml-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Simular
                </button>
              </div>
            </div>
            
            {simulacao && (
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="font-bold text-gray-900 mb-4">Simulação de Antecipação</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Valor Solicitado</p>
                    <p className="text-xl font-bold text-blue-600">
                      {simulacao.valorSolicitado.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Taxa do Serviço</p>
                    <p className="text-xl font-bold text-orange-600">
                      {simulacao.taxa.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Valor Líquido</p>
                    <p className="text-xl font-bold text-green-600">
                      {simulacao.valorLiquido.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Solicitar Antecipação */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <FaWhatsapp className="text-green-500 text-6xl mx-auto mb-6" />
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Solicitar via WhatsApp
          </h2>
          
          <p className="text-gray-600 mb-8">
            Para solicitar sua antecipação, clique no botão abaixo e será redirecionado para nosso canal exclusivo no WhatsApp.
          </p>
          
          <button
            onClick={handleSolicitarAntecipacao}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg flex items-center mx-auto transition-colors"
          >
            <FaWhatsapp className="mr-3 text-2xl" />
            Solicitar Antecipação
          </button>
          
          <div className="mt-8 text-sm text-gray-500">
            <p>
              Nossa equipe especializada irá te atender e processar sua solicitação de antecipação salarial.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
