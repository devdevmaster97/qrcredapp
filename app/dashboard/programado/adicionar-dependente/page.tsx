'use client';

import Link from 'next/link';
import { FaArrowLeft, FaWhatsapp, FaUserPlus } from 'react-icons/fa';

export default function AdicionarDependente() {
  const handleWhatsAppRedirect = () => {
    // Substitua pelo link real do termo de adesão para dependente
    const whatsappLink = "https://wa.me/5511999999999?text=Gostaria%20de%20adicionar%20um%20dependente%20ao%20Programa%20AMADO";
    window.open(whatsappLink, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
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
              Adicionar Dependente
            </h1>
            <p className="text-xl text-gray-600">
              Estenda a proteção para sua família
            </p>
          </div>
        </div>

        {/* Informações sobre Dependente */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Valor para Dependente
          </h2>
          
          <div className="bg-blue-50 p-6 rounded-lg mb-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600 mb-2">R$ 41,90/mês</p>
              <p className="text-gray-600">30% de desconto em relação ao titular</p>
            </div>
          </div>
          
          <div className="space-y-3 text-gray-700">
            <p><strong>✅ Mesma proteção:</strong> Todos os 5 pilares de proteção</p>
            <p><strong>✅ Valor reduzido:</strong> 30% de desconto</p>
            <p><strong>✅ Sem carência:</strong> Proteção imediata após adesão</p>
          </div>
        </div>

        {/* Card de Adesão */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <FaUserPlus className="text-blue-500 text-6xl mx-auto mb-6" />
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Termo de Adesão - Dependente
          </h2>
          
          <p className="text-gray-600 mb-8">
            Para adicionar um dependente ao Programa A.M.A.D.O, clique no botão abaixo.
          </p>
          
          <button
            onClick={handleWhatsAppRedirect}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-lg flex items-center mx-auto transition-colors"
          >
            <FaWhatsapp className="mr-3 text-2xl" />
            Adicionar Dependente
          </button>
          
          <div className="mt-8 text-sm text-gray-500">
            <p>
              Você será redirecionado para o WhatsApp onde poderá acessar o termo de adesão para dependente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
