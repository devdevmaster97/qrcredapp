'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaCheckCircle, FaHome, FaStar, FaExternalLinkAlt, FaSignature, FaWhatsapp } from 'react-icons/fa';
import { isAssinaturaCompleta, marcarAssinaturaCompleta, abrirCanalAntecipacao, ZAPSIGN_URL, extrairSignerTokenDaUrl } from '@/app/utils/assinatura';
import { markPossibleSignature, triggerSasCredVerification } from '@/app/utils/sascredNotifications';

export default function SucessoAdesao() {
  const router = useRouter();
  const [assinaturaCompleta, setAssinaturaCompleta] = useState(false);

  const voltarDashboard = () => {
    router.push('/dashboard');
  };

  const abrirZapSign = () => {
    // Marcar que o usuário pode assinar digitalmente
    markPossibleSignature();
    
    // Abrir ZapSign em nova aba para manter o app aberto
    window.open(ZAPSIGN_URL, '_blank');
  };

  // Verificar ao carregar a página se a assinatura já foi completa
  useEffect(() => {
    setAssinaturaCompleta(isAssinaturaCompleta());

    // 🎯 LISTENER para detectar quando usuário volta após possível assinatura
    const handleWindowFocus = () => {
      console.log('🔍 Usuário voltou para a aba - verificando possível assinatura');
      
      // Se há uma possível assinatura pendente, forçar verificação
      const possibleSignature = localStorage.getItem('sascred_possible_signature');
      if (possibleSignature) {
        console.log('✍️ Possível assinatura detectada - forçando verificação SasCred');
        triggerSasCredVerification();
      }
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Ícone de Sucesso */}
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <FaCheckCircle className="text-green-600 text-4xl" />
            </div>
          </div>

          {/* Título */}
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            🎉 Parabéns!
          </h1>

          {/* Mensagem Principal */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-blue-600 mb-4 flex items-center justify-center">
              <FaStar className="text-yellow-500 mr-2" />
              Você aderiu ao Sascred com sucesso!
            </h2>
            
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Obrigado por aceitar os termos de adesão ao Sascred!</strong>
              </p>
              
              <p className="text-gray-600 leading-relaxed mb-4">
                Sua solicitação foi enviada para nossa central de atendimento. Nossa equipe irá processar sua adesão e entrar em contato com você em breve.
              </p>

              <div className="bg-white rounded-md p-4 border-l-4 border-blue-500">
                <p className="text-sm text-gray-600">
                  <strong>Próximos passos:</strong>
                </p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• Complete a verificação digital no link abaixo</li>
                  <li>• A taxa de R$ 7,50 mensal será cobrada conforme informado</li>
                  <li>• Em breve você terá acesso ao painel de créditos Sascred</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botão para ZapSign */}
          <div className="mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center mb-2">
                <FaSignature className="text-yellow-600 mr-2" />
                <span className="text-sm font-semibold text-yellow-800">
                  Assinatura Digital Necessária
                </span>
              </div>
              <p className="text-sm text-yellow-700 mb-3">
                Para finalizar seu processo de adesão, é necessário completar a verificação de assinatura digital.
              </p>
              <button
                onClick={abrirZapSign}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200 flex items-center mx-auto"
              >
                <FaSignature className="mr-2" />
                Completar Verificação
                <FaExternalLinkAlt className="ml-2 text-sm" />
              </button>
            </div>

            {/* Canal de Antecipação ou Mensagem sobre novidade */}
            {assinaturaCompleta ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-center mb-3">
                  <FaWhatsapp className="text-green-600 mr-2" />
                  <span className="text-sm font-semibold text-green-800">
                    Canal de Antecipação Liberado! 🎉
                  </span>
                </div>
                <p className="text-sm text-green-700 text-center mb-4">
                  <strong>✅ Assinatura Digital Completa!</strong><br/>
                  Agora você pode solicitar sua Antecipação de Crédito através do nosso canal exclusivo no WhatsApp.
                </p>
                <button
                  onClick={abrirCanalAntecipacao}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200 flex items-center mx-auto"
                >
                  <FaWhatsapp className="mr-2" />
                  Solicitar Antecipação
                  <FaExternalLinkAlt className="ml-2 text-sm" />
                </button>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <FaStar className="text-green-600 mr-2" />
                  <span className="text-sm font-semibold text-green-800">
                    Novidade em Breve!
                  </span>
                </div>
                <p className="text-sm text-green-700 text-center">
                  <strong>🚀 Após a finalização da sua adesão</strong>, será liberado neste app um canal exclusivo para <strong>solicitação de Antecipação de Crédito</strong>. Fique atento às novidades!
                </p>
              </div>
            )}
          </div>

          {/* Botão de Retorno */}
          <button
            onClick={voltarDashboard}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 flex items-center mx-auto"
          >
            <FaHome className="mr-2" />
            Voltar a página principal
          </button>
        </div>
      </div>
    </div>
  );
} 