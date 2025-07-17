'use client';

import Link from 'next/link';
import { FaArrowLeft, FaMoneyBillWave, FaCalendarCheck, FaShieldAlt, FaClock, FaUserCheck, FaMobileAlt } from 'react-icons/fa';
import { useAdesaoSasCred } from '@/app/hooks/useAdesaoSasCred';

export default function OQueESasCred() {
  // Hook para verificar se o usuário já aderiu ao SasCred
  const { jaAderiu: jaAderiuSasCred, loading: loadingAdesao } = useAdesaoSasCred();

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
              O que é o SasCred?
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Conheça o sistema de adiantamento salarial que oferece mais flexibilidade financeira para associados
            </p>
          </div>
        </div>

        {/* Introdução */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center mb-6">
            <FaMoneyBillWave className="text-green-500 text-3xl mr-4" />
            <h2 className="text-2xl font-bold text-gray-900">
              Adiantamento Salarial Inteligente
            </h2>
          </div>
          
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            O <strong>SasCred</strong> é um sistema inovador que permite aos associados receberem parte do salário 
            antes do fechamento do mês, oferecendo uma solução prática para imprevistos e necessidades financeiras urgentes.
          </p>
          
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <p className="text-blue-800 font-medium">
              💡 <strong>Importante:</strong> O SasCred não é um empréstimo! É o seu próprio salário sendo 
              antecipado.
            </p>
          </div>
        </div>

        {/* Como Funciona */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <FaClock className="text-blue-500 mr-3" />
            Como Funciona
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-blue-100 rounded-full p-2 mr-4 mt-1">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Adesão ao Sistema</h3>
                  <p className="text-gray-600">
                    Faça sua adesão pelo aplicativo de forma rápida e segura
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-blue-100 rounded-full p-2 mr-4 mt-1">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Solicitação</h3>
                  <p className="text-gray-600">
                    Solicite o valor desejado dentro do limite disponível
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-green-100 rounded-full p-2 mr-4 mt-1">
                  <span className="text-green-600 font-bold">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Aprovação Automática</h3>
                  <p className="text-gray-600">
                    Análise rápida baseada no seu histórico trabalhista
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-green-100 rounded-full p-2 mr-4 mt-1">
                  <span className="text-green-600 font-bold">4</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Recebimento</h3>
                  <p className="text-gray-600">
                    O valor é creditado em sua conta em poucos minutos
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vantagens */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <FaShieldAlt className="text-green-500 mr-3" />
            Principais Vantagens
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FaCalendarCheck className="text-green-600 text-xl" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Sem Juros Abusivos</h3>
              <p className="text-gray-600 text-sm">
                Taxa transparente e muito menor que empréstimos tradicionais
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FaClock className="text-blue-600 text-xl" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Liberação Rápida</h3>
              <p className="text-gray-600 text-sm">
                Aprovação em minutos e dinheiro na conta no mesmo dia
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FaUserCheck className="text-purple-600 text-xl" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Sem Burocracia</h3>
              <p className="text-gray-600 text-sm">
                Processo 100% digital, sem papelada ou filas
              </p>
            </div>
          </div>
        </div>

        {/* Regras e Limites */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Regras e Limites
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4 text-lg">Limites de Antecipação</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Até 40% do salário líquido mensal
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Mínimo de R$ 50,00 por solicitação
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Máximo conforme política da empresa
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-4 text-lg">Condições de Uso</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Disponível apenas para associados ativos
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Desconto automático na folha de pagamento
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Pode ser utilizado quantas vezes necessário
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Segurança */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-8 mb-8">
          <div className="text-center">
            <FaShieldAlt className="text-blue-600 text-4xl mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Segurança e Proteção de Dados
            </h2>
            <p className="text-gray-700 max-w-2xl mx-auto">
              Todos os dados são protegidos com criptografia de ponta e o sistema segue as normas 
              da LGPD. Suas informações financeiras estão sempre seguras conosco.
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Pronto para começar?
          </h2>
          <p className="text-gray-600 mb-6">
            Faça sua adesão agora e tenha acesso imediato ao adiantamento salarial
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* Só mostrar botão "Aderir" se ainda não aderiu */}
            {!loadingAdesao && !jaAderiuSasCred && (
              <Link 
                href="/dashboard/adesao-sasapp"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Aderir ao SasCred
              </Link>
            )}
            
            <Link 
              href="/dashboard"
              className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
            >
              Voltar ao Dashboard
            </Link>
          </div>
        </div>

        {/* Footer da página */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Para mais informações, entre em contato com o atendimento ou consulte os termos de uso.
          </p>
        </div>
      </div>
    </div>
  );
} 