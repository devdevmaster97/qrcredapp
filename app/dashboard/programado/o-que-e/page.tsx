'use client';

import Link from 'next/link';
import { FaArrowLeft, FaHeart, FaHospital, FaStethoscope, FaMoneyBillWave, FaBaby, FaPills, FaCalculator } from 'react-icons/fa';

export default function OQueEProgramado() {
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
            Voltar ao Dashboard
          </Link>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              O que é?
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Programa A.M.A.D.O = Amparo no Acidente e na Doença
            </p>
          </div>
        </div>

        {/* Introdução */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center mb-6">
            <FaHeart className="text-red-500 text-3xl mr-4" />
            <h2 className="text-2xl font-bold text-gray-900">
              Programa A.M.A.D.O
            </h2>
          </div>
          
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            É uma solução acessível que resolve o problema do trabalhador quando sofre um acidente ou descobre uma doença.
          </p>
        </div>

        {/* OS 5 PILARES DE PROTEÇÃO */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            OS 5 PILARES DE PROTEÇÃO DO AMADO
          </h2>
          
          <div className="space-y-8">
            {/* 1. COBERTURA CIRÚRGICA */}
            <div className="border-l-4 border-blue-500 pl-6 bg-blue-50 p-6 rounded-r-lg">
              <div className="flex items-center mb-4">
                <FaHospital className="text-blue-600 text-2xl mr-3" />
                <h3 className="text-xl font-bold text-gray-900">1. 🏥 COBERTURA CIRÚRGICA</h3>
              </div>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Valor:</strong> Até R$ 50.000</li>
                <li><strong>Abrangência:</strong> Mais de 900 cirurgias contempladas</li>
                <li><strong>Diferencial:</strong> Sem demora, sem burocracia excessiva</li>
              </ul>
            </div>

            {/* 2. DIAGNÓSTICO DE DOENÇA GRAVE */}
            <div className="border-l-4 border-green-500 pl-6 bg-green-50 p-6 rounded-r-lg">
              <div className="flex items-center mb-4">
                <FaStethoscope className="text-green-600 text-2xl mr-3" />
                <h3 className="text-xl font-bold text-gray-900">2. 🩺 DIAGNÓSTICO DE DOENÇA GRAVE</h3>
              </div>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Valor:</strong> R$ 15.000 no ato do diagnóstico</li>
                <li><strong>Objetivo:</strong> Tranquilidade financeira para focar no tratamento</li>
                <li><strong>Benefício:</strong> Evita endividamento em momento crítico</li>
              </ul>
            </div>

            {/* 3. DIÁRIAS POR INCAPACIDADE */}
            <div className="border-l-4 border-yellow-500 pl-6 bg-yellow-50 p-6 rounded-r-lg">
              <div className="flex items-center mb-4">
                <FaMoneyBillWave className="text-yellow-600 text-2xl mr-3" />
                <h3 className="text-xl font-bold text-gray-900">3. 💵 DIÁRIAS POR INCAPACIDADE</h3>
              </div>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Valor:</strong> R$ 50 por dia</li>
                <li><strong>Período:</strong> Até 60 diárias</li>
                <li><strong>Função:</strong> Cobrir necessidades básicas no período de espera do INSS</li>
                <li><strong>Dignidade:</strong> Evita humilhação de pedir empréstimos</li>
              </ul>
            </div>

            {/* 4. CESTA BÁSICA NATALIDADE */}
            <div className="border-l-4 border-pink-500 pl-6 bg-pink-50 p-6 rounded-r-lg">
              <div className="flex items-center mb-4">
                <FaBaby className="text-pink-600 text-2xl mr-3" />
                <h3 className="text-xl font-bold text-gray-900">4. 👶 CESTA BÁSICA NATALIDADE</h3>
              </div>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Valor:</strong> R$ 500</li>
                <li><strong>Momento:</strong> Nascimento do filho</li>
                <li><strong>Propósito:</strong> Reforçar orçamento familiar na chegada do bem maior</li>
              </ul>
            </div>

            {/* 5. DESCONTO EM MEDICAMENTOS */}
            <div className="border-l-4 border-purple-500 pl-6 bg-purple-50 p-6 rounded-r-lg">
              <div className="flex items-center mb-4">
                <FaPills className="text-purple-600 text-2xl mr-3" />
                <h3 className="text-xl font-bold text-gray-900">5. 💊 DESCONTO EM MEDICAMENTOS</h3>
              </div>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Momento:</strong> Necessidade de medicamento após acidente ou doença</li>
                <li><strong>Propósito:</strong> Diminuir os custos do tratamento</li>
              </ul>
            </div>
          </div>
        </div>

        {/* INVESTIMENTO ACESSÍVEL */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center mb-6">
            <FaCalculator className="text-green-600 text-3xl mr-4" />
            <h2 className="text-2xl font-bold text-gray-900">
              INVESTIMENTO ACESSÍVEL
            </h2>
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Valores que Cabem no Orçamento</h3>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="font-bold text-lg text-gray-900 mb-2">Titular</h4>
              <p className="text-2xl font-bold text-green-600">R$ 59,90/mês</p>
              <p className="text-sm text-gray-600">(menos de R$ 2,00 por dia)</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="font-bold text-lg text-gray-900 mb-2">Dependente</h4>
              <p className="text-2xl font-bold text-blue-600">R$ 41,90/mês</p>
              <p className="text-sm text-gray-600">(30% de desconto)</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-gray-900 mb-6">Comparação Reveladora</h3>
          
          <div className="space-y-6">
            {/* Exemplo 1: Doença Grave */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="font-bold text-lg text-gray-900 mb-4">Cenário: Descoberta de Doença Grave</h4>
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div className="bg-red-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Investimento Anual</p>
                  <p className="text-xl font-bold text-red-600">R$ 718,80</p>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Benefício Recebido</p>
                  <p className="text-xl font-bold text-green-600">R$ 15.000,00</p>
                </div>
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Benefício Líquido</p>
                  <p className="text-xl font-bold text-blue-600">R$ 14.281,20</p>
                </div>
              </div>
            </div>

            {/* Exemplo 2: Acidente */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="font-bold text-lg text-gray-900 mb-4">Cenário: Acidente com Cirurgia</h4>
              <div className="space-y-3 text-gray-700">
                <p><strong>Investimento Anual:</strong> R$ 718,80</p>
                <p><strong>Situação:</strong> Acidente - INSS demora a pagar benefício</p>
                <p><strong>Diárias:</strong> 60 diárias x R$ 50,00 = R$ 3.000,00</p>
                <p><strong>Cirurgia:</strong> R$ 4.000,00 (*exemplo - de acordo com a tabela da seguradora)</p>
                <p><strong>Benefício Líquido:</strong> R$ 6.281,20</p>
                <p><strong>Bônus:</strong> E mais desconto nos medicamentos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Proteja-se Agora!
          </h2>
          <p className="text-gray-600 mb-6">
            Não deixe para depois. A proteção que você precisa está ao seu alcance.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/dashboard/programado/aderir"
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              Aderir Agora
            </Link>
            
            <Link 
              href="/dashboard"
              className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
            >
              Voltar ao Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
