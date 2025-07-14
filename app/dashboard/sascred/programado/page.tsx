'use client';

import Link from 'next/link';
import { FaArrowLeft, FaCalendarAlt, FaCog, FaRocket } from 'react-icons/fa';

export default function ProgramadoSasCred() {
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
              SasCred Programado
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Funcionalidade em desenvolvimento - em breve disponível
            </p>
          </div>
        </div>

        {/* Card principal */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="bg-blue-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <FaCog className="text-blue-600 text-3xl animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Funcionalidade em Desenvolvimento
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-6">
              O <strong>SasCred Programado</strong> permitirá que você agende antecipações salariais 
              recorrentes ou para datas específicas, oferecendo ainda mais controle sobre suas finanças.
            </p>
          </div>

          {/* Preview das funcionalidades */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FaCalendarAlt className="text-green-600 text-xl" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Agendamento</h3>
              <p className="text-gray-600 text-sm">
                Programe antecipações para datas específicas
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FaRocket className="text-purple-600 text-xl" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Automação</h3>
              <p className="text-gray-600 text-sm">
                Configure regras automáticas de antecipação
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-orange-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FaCog className="text-orange-600 text-xl" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Personalização</h3>
              <p className="text-gray-600 text-sm">
                Defina valores e periodicidade conforme sua necessidade
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-yellow-800 mb-2">Status do Desenvolvimento</h3>
            <p className="text-yellow-700">
              Nossa equipe está trabalhando para disponibilizar esta funcionalidade em breve. 
              Assim que estiver pronta, você será notificado através do aplicativo.
            </p>
          </div>

          {/* Botões de ação */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/dashboard"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Voltar ao Dashboard
            </Link>
            
            <Link 
              href="/dashboard/antecipacao"
              className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
            >
              Usar Antecipação Atual
            </Link>
          </div>
        </div>

        {/* Informações adicionais */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Tem sugestões para esta funcionalidade? Entre em contato conosco através do suporte.
          </p>
        </div>
      </div>
    </div>
  );
} 