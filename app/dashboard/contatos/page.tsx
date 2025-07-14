'use client';

import Link from 'next/link';
import { FaArrowLeft, FaPhone, FaEnvelope, FaWhatsapp, FaMapMarkerAlt, FaClock, FaHeadset } from 'react-icons/fa';

export default function ContatosPage() {
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
              Contatos
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Entre em contato conosco através dos canais disponíveis
            </p>
          </div>
        </div>

        {/* Canais de atendimento */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* WhatsApp */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 rounded-full p-3 mr-4">
                <FaWhatsapp className="text-green-600 text-xl" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">WhatsApp</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Atendimento rápido e prático pelo WhatsApp
            </p>
            <div className="space-y-2">
              <p className="text-gray-700">
                <strong>Número:</strong> (11) 99999-9999
              </p>
              <p className="text-gray-700">
                <strong>Horário:</strong> Segunda à Sexta, 8h às 18h
              </p>
            </div>
            <a 
              href="https://wa.me/5511999999999" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <FaWhatsapp className="mr-2" />
              Conversar no WhatsApp
            </a>
          </div>

          {/* Telefone */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 rounded-full p-3 mr-4">
                <FaPhone className="text-blue-600 text-xl" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Telefone</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Central de atendimento telefônico
            </p>
            <div className="space-y-2">
              <p className="text-gray-700">
                <strong>Fixo:</strong> (11) 3333-4444
              </p>
              <p className="text-gray-700">
                <strong>0800:</strong> 0800 123 4567
              </p>
              <p className="text-gray-700">
                <strong>Horário:</strong> Segunda à Sexta, 8h às 18h
              </p>
            </div>
            <a 
              href="tel:08001234567"
              className="inline-flex items-center mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaPhone className="mr-2" />
              Ligar Agora
            </a>
          </div>

          {/* Email */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 rounded-full p-3 mr-4">
                <FaEnvelope className="text-purple-600 text-xl" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">E-mail</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Envie sua mensagem e receberá resposta em até 24 horas
            </p>
            <div className="space-y-2">
              <p className="text-gray-700">
                <strong>Geral:</strong> contato@sasapp.com.br
              </p>
              <p className="text-gray-700">
                <strong>Suporte:</strong> suporte@sasapp.com.br
              </p>
              <p className="text-gray-700">
                <strong>Financeiro:</strong> financeiro@sasapp.com.br
              </p>
            </div>
            <a 
              href="mailto:contato@sasapp.com.br"
              className="inline-flex items-center mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <FaEnvelope className="mr-2" />
              Enviar E-mail
            </a>
          </div>

          {/* Endereço */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="bg-orange-100 rounded-full p-3 mr-4">
                <FaMapMarkerAlt className="text-orange-600 text-xl" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Endereço</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Venha nos visitar em nosso escritório
            </p>
            <div className="space-y-2">
              <p className="text-gray-700">
                <strong>Endereço:</strong><br />
                Rua das Flores, 123<br />
                Centro - São Paulo/SP<br />
                CEP: 01234-567
              </p>
              <p className="text-gray-700">
                <strong>Horário:</strong> Segunda à Sexta, 8h às 17h
              </p>
            </div>
            <a 
              href="https://maps.google.com/maps?q=Rua+das+Flores+123+São+Paulo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center mt-4 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              <FaMapMarkerAlt className="mr-2" />
              Ver no Mapa
            </a>
          </div>
        </div>

        {/* Horários de funcionamento */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center mb-4">
            <div className="bg-gray-100 rounded-full p-3 mr-4">
              <FaClock className="text-gray-600 text-xl" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Horários de Funcionamento</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Atendimento Online</h3>
              <ul className="space-y-1 text-gray-700">
                <li>Segunda à Sexta: 8h às 18h</li>
                <li>Sábado: 8h às 12h</li>
                <li>Domingo: Emergências apenas</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Atendimento Presencial</h3>
              <ul className="space-y-1 text-gray-700">
                <li>Segunda à Sexta: 8h às 17h</li>
                <li>Sábado: Fechado</li>
                <li>Domingo: Fechado</li>
              </ul>
            </div>
          </div>
        </div>

        {/* FAQ Rápido */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 rounded-full p-3 mr-4">
              <FaHeadset className="text-blue-600 text-xl" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Perguntas Frequentes</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Como solicitar uma antecipação?</h3>
              <p className="text-gray-700">
                Acesse o menu "SasCred" → "Antecipação" e siga as instruções na tela.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Esqueci minha senha, o que fazer?</h3>
              <p className="text-gray-700">
                Na tela de login, clique em "Esqueci minha senha" e siga as instruções para redefinir.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Como atualizar meus dados?</h3>
              <p className="text-gray-700">
                Vá em "Meus Dados" no menu principal e clique em "Editar" para atualizar suas informações.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Nossa equipe está sempre pronta para ajudar você. Escolha o canal que for mais conveniente!
          </p>
        </div>
      </div>
    </div>
  );
} 