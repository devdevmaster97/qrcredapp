'use client';

import Link from 'next/link';
import { FaMoneyBillWave, FaStore, FaQrcode, FaClipboardList, FaWallet, FaUser, FaPhone, FaHistory, FaClock, FaStar, FaShieldAlt, FaMobileAlt, FaArrowRight, FaChartLine, FaGift } from 'react-icons/fa';
import { useAdesaoSasCred } from '@/app/hooks/useAdesaoSasCred';
import NotificationManager from '@/app/components/NotificationManager';

export default function DashboardPage() {
  const { jaAderiu } = useAdesaoSasCred();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Bem-vindo ao SasApp
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Sua plataforma completa para gestão financeira, convênios e serviços digitais. 
            Tudo o que você precisa em um só lugar.
          </p>
        </div>

        {/* Gerenciador de Notificações */}
        <div className="mb-8">
          <NotificationManager />
        </div>

        {/* Funcionalidades Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {/* SasCred */}
          <Link href="/dashboard/sascred/o-que-e" className="group">
            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
                <FaMoneyBillWave className="text-white text-4xl mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">SasCred</h3>
                <p className="text-green-100">Adiantamento Salarial</p>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  Antecipe seu salário de forma segura e sem burocracia. Até 40% do salário líquido disponível.
                </p>
                <div className="flex items-center text-green-600 font-semibold group-hover:text-green-700">
                  <span>Saiba mais</span>
                  <FaArrowRight className="ml-2 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </Link>

          {/* Convênios */}
          <Link href="/dashboard/convenios" className="group">
            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
                <FaStore className="text-white text-4xl mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Convênios</h3>
                <p className="text-blue-100">Rede de Parceiros</p>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  Acesse uma ampla rede de estabelecimentos parceiros com descontos exclusivos e facilidades.
                </p>
                <div className="flex items-center text-blue-600 font-semibold group-hover:text-blue-700">
                  <span>Ver convênios</span>
                  <FaArrowRight className="ml-2 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </Link>

          {/* QR Code */}
          {jaAderiu ? (
            <Link href="/dashboard/qrcode" className="group">
              <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6">
                  <FaQrcode className="text-white text-4xl mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">QR Code</h3>
                  <p className="text-purple-100">Pagamentos Rápidos</p>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 mb-4">
                    Realize pagamentos instantâneos nos estabelecimentos parceiros usando seu QR Code pessoal.
                  </p>
                  <div className="flex items-center text-purple-600 font-semibold group-hover:text-purple-700">
                    <span>Gerar QR Code</span>
                    <FaArrowRight className="ml-2 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="cursor-not-allowed">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden opacity-60">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6">
                  <FaQrcode className="text-white text-4xl mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">QR Code</h3>
                  <p className="text-purple-100">Pagamentos Rápidos</p>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 mb-4">
                    Realize pagamentos instantâneos nos estabelecimentos parceiros usando seu QR Code pessoal.
                  </p>
                  <div className="flex items-center text-gray-400 font-semibold">
                    <span>Requer adesão ao SasCred</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Saldo */}
          {jaAderiu ? (
            <Link href="/dashboard/saldo" className="group">
              <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6">
                  <FaWallet className="text-white text-4xl mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">Saldo</h3>
                  <p className="text-emerald-100">Consulta em Tempo Real</p>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 mb-4">
                    Consulte seu saldo atual e acompanhe suas movimentações financeiras em tempo real.
                  </p>
                  <div className="flex items-center text-emerald-600 font-semibold group-hover:text-emerald-700">
                    <span>Ver saldo</span>
                    <FaArrowRight className="ml-2 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="cursor-not-allowed">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden opacity-60">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6">
                  <FaWallet className="text-white text-4xl mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">Saldo</h3>
                  <p className="text-emerald-100">Consulta em Tempo Real</p>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 mb-4">
                    Consulte seu saldo atual e acompanhe suas movimentações financeiras em tempo real.
                  </p>
                  <div className="flex items-center text-gray-400 font-semibold">
                    <span>Requer adesão ao SasCred</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Extrato */}
          {jaAderiu ? (
            <Link href="/dashboard/extrato" className="group">
              <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6">
                  <FaClipboardList className="text-white text-4xl mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">Extrato</h3>
                  <p className="text-orange-100">Histórico Completo</p>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 mb-4">
                    Acesse seu extrato detalhado com todas as transações e movimentações financeiras.
                  </p>
                  <div className="flex items-center text-orange-600 font-semibold group-hover:text-orange-700">
                    <span>Ver extrato</span>
                    <FaArrowRight className="ml-2 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="cursor-not-allowed">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden opacity-60">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6">
                  <FaClipboardList className="text-white text-4xl mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">Extrato</h3>
                  <p className="text-orange-100">Histórico Completo</p>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 mb-4">
                    Acesse seu extrato detalhado com todas as transações e movimentações financeiras.
                  </p>
                  <div className="flex items-center text-gray-400 font-semibold">
                    <span>Requer adesão ao SasCred</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Meus Dados */}
          <Link href="/dashboard/dados" className="group">
            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
                <FaUser className="text-white text-4xl mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Meus Dados</h3>
                <p className="text-indigo-100">Perfil e Configurações</p>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  Gerencie suas informações pessoais, dados de contato e configurações de conta.
                </p>
                <div className="flex items-center text-indigo-600 font-semibold group-hover:text-indigo-700">
                  <span>Gerenciar dados</span>
                  <FaArrowRight className="ml-2 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Estatísticas e Recursos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Recursos Destacados */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <FaStar className="text-yellow-500 mr-3" />
              Recursos em Destaque
            </h3>
            <div className="space-y-4">
              <div className="flex items-start p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                <FaShieldAlt className="text-blue-500 text-2xl mr-4 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Segurança Avançada</h4>
                  <p className="text-gray-600">Suas informações protegidas com criptografia de ponta e conformidade com LGPD.</p>
                </div>
              </div>
              <div className="flex items-start p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                <FaMobileAlt className="text-green-500 text-2xl mr-4 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">100% Digital</h4>
                  <p className="text-gray-600">Todos os serviços disponíveis 24/7 direto do seu celular, sem burocracia.</p>
                </div>
              </div>
              <div className="flex items-start p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                <FaChartLine className="text-purple-500 text-2xl mr-4 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Controle Financeiro</h4>
                  <p className="text-gray-600">Acompanhe suas finanças com relatórios detalhados e insights personalizados.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Suporte e Contato */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <FaPhone className="text-blue-500 mr-3" />
              Suporte
            </h3>
            <div className="space-y-4">
              <Link href="/dashboard/contatos" className="block p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-blue-900">Central de Atendimento</h4>
                    <p className="text-blue-700 text-sm">Segunda a sexta, 8h às 18h</p>
                  </div>
                  <FaArrowRight className="text-blue-500" />
                </div>
              </Link>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Dúvidas Frequentes</h4>
                <p className="text-gray-600 text-sm">Encontre respostas para as principais dúvidas sobre o SasApp.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
          <FaGift className="text-4xl mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-4">Aproveite todos os benefícios</h3>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Explore todas as funcionalidades do SasApp e descubra como podemos facilitar sua vida financeira.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/dashboard/sascred/o-que-e"
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Conhecer SasCred
            </Link>
            <Link 
              href="/dashboard/convenios"
              className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-400 transition-colors border border-white/20"
            >
              Ver Convênios
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 