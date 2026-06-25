'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { FaMoneyBillWave, FaStore, FaQrcode, FaClipboardList, FaWallet, FaUser, FaPhone, FaHistory, FaClock, FaStar, FaShieldAlt, FaMobileAlt, FaArrowRight, FaChartLine, FaInfoCircle, FaHeadset, FaBuilding, FaCalendar, FaFileInvoice } from 'react-icons/fa';
import { useAdesaoSasCred } from '@/app/hooks/useAdesaoSasCred';
import NotificationManager from '@/app/components/NotificationManager';

interface LocalUserData {
  nome: string;
  cartao: string;
  nome_divisao: string;
  [key: string]: string;
}

export default function DashboardPage() {
  const { jaAderiu, temAntecipacao, loading } = useAdesaoSasCred();
  const { data: session } = useSession();
  const [localUser, setLocalUser] = useState<LocalUserData | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('qrcred_user');
    if (stored) {
      try {
        setLocalUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  // Dados do usuário: localStorage tem prioridade (disponível imediatamente),
  // sessão NextAuth como complemento
  const userName = localUser?.nome || session?.user?.nome || '';
  const userCartao = localUser?.cartao || session?.user?.cartao || '';
  const userNomeDivisao = localUser?.nome_divisao || session?.user?.nome_divisao || 'SasApp';

  // Layout moderno seguindo o design system Luminous Flux
  if (jaAderiu) {
    return (
      <div className="bg-[#f8f9fa]">
        <main className="px-5 py-6 space-y-6">
          {/* Card Principal do Usuário */}
          <div
            className="rounded-2xl p-6 text-white shadow-lg overflow-hidden relative"
            style={{
              backgroundImage: "url('/background-card.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* overlay suave para garantir legibilidade do texto */}
            <div className="absolute inset-0 bg-[#00677d]/60 rounded-2xl" />
            {/* conteúdo acima do overlay */}
            <div className="relative z-10">
              <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {userName}
              </h1>
              <p className="text-sm text-white/90 mb-1">
                Cartão: {userCartao}
              </p>
              <p className="text-sm text-white/90 mb-4">
                Convênio: {userNomeDivisao}
              </p>
              <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <span className="text-sm font-semibold">SasCred Ativo</span>
              </div>
            </div>
          </div>


          {/* Meus Dados e Seguro Indicações */}
          <div className="grid grid-cols-2 gap-4">
            <Link href="/dashboard/dados">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e1e3e4] hover:shadow-md transition-all text-center">
                <div className="w-12 h-12 rounded-full bg-[#e7f6f9] flex items-center justify-center mx-auto mb-3">
                  <FaUser className="text-[#00677d]" size={20} />
                </div>
                <h3 className="text-[#191c1d] font-semibold text-sm mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  Meus Dados
                </h3>
                <p className="text-xs text-[#6d797e]">Perfil & Configurações</p>
              </div>
            </Link>

            <Link href="/dashboard/seguro-indicacoes">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e1e3e4] hover:shadow-md transition-all text-center">
                <div className="w-12 h-12 rounded-full bg-[#ffe7ec] flex items-center justify-center mx-auto mb-3">
                  <FaShieldAlt className="text-[#ba1340]" size={20} />
                </div>
                <h3 className="text-[#191c1d] font-semibold text-sm mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  Seguro Indicações
                </h3>
                <p className="text-xs text-[#6d797e]">Minhas Indicações</p>
              </div>
            </Link>
          </div>

          {/* PROTEÇÃO FAMILIAR */}
          <div>
            <div className="flex items-center gap-2 mb-4 px-1">
              <FaShieldAlt className="text-[#00677d]" size={16} />
              <h2 className="text-[#3d494d] font-semibold text-sm uppercase tracking-wide" style={{ fontFamily: 'Inter, sans-serif' }}>
                PROTEÇÃO FAMILIAR
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Link href="/dashboard/protecao-familiar/o-que-e">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e1e3e4] hover:shadow-md transition-all text-center">
                  <div className="w-12 h-12 rounded-full bg-[#e7f6f9] flex items-center justify-center mx-auto mb-2">
                    <FaInfoCircle className="text-[#00677d]" size={20} />
                  </div>
                  <p className="text-xs text-[#191c1d] font-medium">O que é</p>
                </div>
              </Link>

              <Link href="/dashboard/convenios">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e1e3e4] hover:shadow-md transition-all text-center">
                  <div className="w-12 h-12 rounded-full bg-[#e7f6f9] flex items-center justify-center mx-auto mb-2">
                    <FaBuilding className="text-[#00677d]" size={20} />
                  </div>
                  <p className="text-xs text-[#191c1d] font-medium">Convênios</p>
                </div>
              </Link>

              <Link href="/dashboard/agendamentos">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e1e3e4] hover:shadow-md transition-all text-center">
                  <div className="w-12 h-12 rounded-full bg-[#e7f6f9] flex items-center justify-center mx-auto mb-2">
                    <FaCalendar className="text-[#00677d]" size={20} />
                  </div>
                  <p className="text-xs text-[#191c1d] font-medium">Agendas</p>
                </div>
              </Link>
            </div>
          </div>

          {/* SasCred Card - Escuro */}
          <div className="bg-[#2e3132] rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#00677d] flex items-center justify-center">
                  <FaWallet className="text-white" size={24} />
                </div>
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  SasCred
                </h2>
              </div>
              <span className="text-sm text-[#4cd6fb] font-semibold px-3 py-1 bg-[#00677d]/30 rounded-lg">
                Disponível
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Link href="/dashboard/sascred/o-que-e" className="block">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all flex flex-col items-center justify-center gap-2 h-24 overflow-hidden">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <FaInfoCircle className="text-white" size={18} />
                  </div>
                  <p className="text-[11px] text-white/90 font-medium text-center leading-tight px-1">O que é</p>
                </div>
              </Link>

              <Link href="/dashboard/saldo" className="block">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all flex flex-col items-center justify-center gap-2 h-24 overflow-hidden">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <FaWallet className="text-white" size={18} />
                  </div>
                  <p className="text-[11px] text-white/90 font-medium text-center leading-tight px-1">Saldo</p>
                </div>
              </Link>

              <Link href="/dashboard/extrato" className="block">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all flex flex-col items-center justify-center gap-2 h-24 overflow-hidden">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <FaFileInvoice className="text-white" size={18} />
                  </div>
                  <p className="text-[11px] text-white/90 font-medium text-center leading-tight px-1">Extrato</p>
                </div>
              </Link>

              <Link href="/dashboard/qrcode" className="block">
                <div className="bg-[#00677d] rounded-xl hover:bg-[#00b4d8] transition-all flex flex-col items-center justify-center gap-2 h-24 overflow-hidden">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <FaQrcode className="text-white" size={18} />
                  </div>
                  <p className="text-[11px] text-white font-medium text-center leading-tight px-1">QR Code</p>
                </div>
              </Link>

              <Link href="/dashboard/convenios" className="block">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all flex flex-col items-center justify-center gap-2 h-24 overflow-hidden">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <FaStore className="text-white" size={18} />
                  </div>
                  <p className="text-[11px] text-white/90 font-medium text-center leading-tight px-1">Convênios</p>
                </div>
              </Link>

              {temAntecipacao ? (
                <Link href="/dashboard/antecipacao" className="block">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all flex flex-col items-center justify-center gap-2 h-24 overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <FaChartLine className="text-white" size={18} />
                    </div>
                    <p className="text-[11px] text-white/90 font-medium text-center leading-tight px-1">Antecipação</p>
                  </div>
                </Link>
              ) : (
                <Link href="/dashboard/sascred/antecipacao/aderir" className="block">
                  <div className="bg-white/5 rounded-xl flex flex-col items-center justify-center gap-2 h-24 overflow-hidden opacity-60">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                      <FaChartLine className="text-white/60" size={18} />
                    </div>
                    <p className="text-[10px] text-white/60 font-medium text-center leading-tight px-1">Antecipação</p>
                    <p className="text-[9px] text-white/40 font-medium text-center leading-tight px-1 -mt-1">Aderir</p>
                  </div>
                </Link>
              )}
            </div>
          </div>

          {/* Contatos */}
          <Link href="/dashboard/contatos" className="block">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e1e3e4] hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#e7f6f9] flex items-center justify-center">
                    <FaHeadset className="text-[#00677d]" size={24} />
                  </div>
                  <div>
                    <h3 className="text-[#191c1d] font-semibold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      Contatos
                    </h3>
                    <p className="text-sm text-[#6d797e]">Suporte & Canais de Ajuda</p>
                  </div>
                </div>
                <FaPhone className="text-[#6d797e]" />
              </div>
            </div>
          </Link>

          {/* Gerenciador de Notificações */}
          <div className="pb-20">
            <NotificationManager />
          </div>
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-[#e1e3e4] px-2 py-3 safe-area-bottom">
          <div className="grid grid-cols-4 w-full">
            <Link href="/dashboard/saldo" className="flex flex-col items-center gap-1 text-[#6d797e] hover:text-[#00677d] transition-colors">
              <FaWallet size={22} />
              <span className="text-[10px] font-medium">Saldo</span>
            </Link>

            <Link href="/dashboard/extrato" className="flex flex-col items-center gap-1 text-[#6d797e] hover:text-[#00677d] transition-colors">
              <FaFileInvoice size={22} />
              <span className="text-[10px] font-medium">Extrato</span>
            </Link>

            <Link href="/dashboard/qrcode" className="flex flex-col items-center gap-1 text-[#6d797e] hover:text-[#00677d] transition-colors">
              <FaQrcode size={22} />
              <span className="text-[10px] font-medium">QR Code</span>
            </Link>

            {temAntecipacao ? (
              <Link href="/dashboard/antecipacao" className="flex flex-col items-center gap-1 text-[#6d797e] hover:text-[#00677d] transition-colors">
                <FaChartLine size={22} />
                <span className="text-[10px] font-medium">Antecipação</span>
              </Link>
            ) : (
              <Link href="/dashboard/sascred/antecipacao/aderir" className="flex flex-col items-center gap-1 text-[#b0bbbf] transition-colors">
                <FaChartLine size={22} className="opacity-50" />
                <span className="text-[10px] font-medium opacity-50">Antecipação</span>
              </Link>
            )}
          </div>
        </nav>
      </div>
    );
  }

  // Layout completo para associados que ainda NÃO aderiram ao SasCred
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


      </div>
    </div>
  );
} 