'use client';

import Link from 'next/link';
import { FaArrowLeft, FaWhatsapp, FaFileContract } from 'react-icons/fa';

export default function AderirProgramado() {
  const handleWhatsAppRedirect = () => {
    // Substitua pelo link real do termo de adesão
    const whatsappLink = "https://wa.me/5511999999999?text=Gostaria%20de%20aderir%20ao%20Programa%20AMADO";
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
            Voltar a página principal
          </Link>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Aderir ao Programa A.M.A.D.O
            </h1>
            <p className="text-xl text-gray-600">
              Sua proteção está a um clique de distância
            </p>
          </div>
        </div>

        {/* Card de Adesão */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <FaFileContract className="text-green-500 text-6xl mx-auto mb-6" />
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Termo de Adesão
          </h2>
          
          <p className="text-gray-600 mb-8">
            Para aderir ao Programa A.M.A.D.O, clique no botão abaixo para acessar o termo de adesão via WhatsApp.
          </p>
          
          <button
            onClick={handleWhatsAppRedirect}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg flex items-center mx-auto transition-colors"
          >
            <FaWhatsapp className="mr-3 text-2xl" />
            Acessar Termo de Adesão
          </button>
          
          <div className="mt-8 text-sm text-gray-500">
            <p>
              Você será redirecionado para o WhatsApp onde poderá acessar o termo de adesão e concluir sua inscrição.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
