'use client';

import Link from 'next/link';
import { FaArrowLeft, FaEnvelope, FaHospital, FaStethoscope, FaMoneyBillWave, FaBaby, FaPills } from 'react-icons/fa';

export default function SolicitarBeneficio() {
  const handleEmailRedirect = () => {
    const email = "beneficios@programaamado.com.br"; // Substitua pelo email real
    const subject = "Solicitação de Benefício - Programa A.M.A.D.O";
    const body = "Olá,\n\nGostaria de solicitar um benefício do Programa A.M.A.D.O.\n\nDados do solicitante:\nNome:\nCPF:\nTipo de benefício:\nDescrição do caso:\n\nAguardo retorno.\n\nAtenciosamente,";
    
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

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
              Solicitar Benefício
            </h1>
            <p className="text-xl text-gray-600">
              Acione sua proteção quando precisar
            </p>
          </div>
        </div>

        {/* Tipos de Benefício */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Tipos de Benefício Disponíveis
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg text-center">
              <FaHospital className="text-blue-600 text-3xl mx-auto mb-3" />
              <h3 className="font-bold text-gray-900 mb-2">Cobertura Cirúrgica</h3>
              <p className="text-sm text-gray-600">Até R$ 50.000 para mais de 900 cirurgias</p>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg text-center">
              <FaStethoscope className="text-green-600 text-3xl mx-auto mb-3" />
              <h3 className="font-bold text-gray-900 mb-2">Doença Grave</h3>
              <p className="text-sm text-gray-600">R$ 15.000 no ato do diagnóstico</p>
            </div>
            
            <div className="bg-yellow-50 p-6 rounded-lg text-center">
              <FaMoneyBillWave className="text-yellow-600 text-3xl mx-auto mb-3" />
              <h3 className="font-bold text-gray-900 mb-2">Diárias por Incapacidade</h3>
              <p className="text-sm text-gray-600">R$ 50/dia por até 60 dias</p>
            </div>
            
            <div className="bg-pink-50 p-6 rounded-lg text-center">
              <FaBaby className="text-pink-600 text-3xl mx-auto mb-3" />
              <h3 className="font-bold text-gray-900 mb-2">Cesta Natalidade</h3>
              <p className="text-sm text-gray-600">R$ 500 no nascimento do filho</p>
            </div>
            
            <div className="bg-purple-50 p-6 rounded-lg text-center">
              <FaPills className="text-purple-600 text-3xl mx-auto mb-3" />
              <h3 className="font-bold text-gray-900 mb-2">Desconto Medicamentos</h3>
              <p className="text-sm text-gray-600">Descontos em medicamentos</p>
            </div>
          </div>
        </div>

        {/* Documentos Necessários */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Documentos Geralmente Necessários
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Documentos Pessoais</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• CPF e RG</li>
                <li>• Comprovante de residência</li>
                <li>• Cartão do programa</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Documentos Médicos</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• Relatório médico</li>
                <li>• Exames complementares</li>
                <li>• Receitas médicas (se aplicável)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Card de Solicitação */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <FaEnvelope className="text-purple-500 text-6xl mx-auto mb-6" />
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Solicitar por E-mail
          </h2>
          
          <p className="text-gray-600 mb-8">
            Clique no botão abaixo para abrir seu cliente de e-mail com um modelo de solicitação pré-preenchido.
          </p>
          
          <button
            onClick={handleEmailRedirect}
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-4 px-8 rounded-lg flex items-center mx-auto transition-colors"
          >
            <FaEnvelope className="mr-3 text-2xl" />
            Enviar Solicitação por E-mail
          </button>
          
          <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Importante:</strong> Anexe todos os documentos necessários ao e-mail. 
              Nossa equipe entrará em contato em até 48 horas úteis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
