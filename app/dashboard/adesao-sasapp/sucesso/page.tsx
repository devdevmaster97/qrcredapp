'use client';

import { useRouter } from 'next/navigation';
import { FaCheckCircle, FaHome, FaStar } from 'react-icons/fa';

export default function SucessoAdesao() {
  const router = useRouter();

  const voltarDashboard = () => {
    router.push('/dashboard');
  };

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
                Sua solicitação foi enviada para nossa central de atendimento. Nossa equipe irá processar sua adesão e entrar em contato com você o mais breve possível para finalizar o processo.
              </p>

              <div className="bg-white rounded-md p-4 border-l-4 border-blue-500">
                <p className="text-sm text-gray-600">
                  <strong>Próximos passos:</strong>
                </p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• Aguarde o contato da nossa equipe</li>
                  <li>• A taxa de R$ 7,50 mensal será cobrada conforme informado</li>
                  <li>• Em breve você terá acesso ao painel de créditos Sascred</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Informações Adicionais */}
          <div className="bg-gray-50 rounded-lg p-4 mb-8">
            <p className="text-sm text-gray-600">
              <strong>Em caso de dúvidas:</strong> Entre em contato com nosso suporte ou aguarde o retorno da nossa equipe.
            </p>
          </div>

          {/* Botão de Retorno */}
          <button
            onClick={voltarDashboard}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 flex items-center mx-auto"
          >
            <FaHome className="mr-2" />
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    </div>
  );
} 