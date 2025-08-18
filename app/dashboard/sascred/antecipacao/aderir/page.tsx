'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaArrowLeft, FaFileContract, FaSignature, FaCheckCircle, FaMoneyBillWave, FaShieldAlt, FaClock } from 'react-icons/fa';

export default function AderirAntecipacao() {
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAceitarEAderirAntecipacao = () => {
    if (!isChecked) {
      alert('Você deve aceitar os termos para prosseguir.');
      return;
    }

    setIsLoading(true);
    
    // Redirecionar para ZapSign para assinatura digital da antecipação
    const zapSignUrl = "https://app.zapsign.com.br/verificar/doc/762dbe4c-654b-432b-a7a9-38435966e0aa";
    window.open(zapSignUrl, '_blank');
    
    // Reset loading após um tempo
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
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
            Voltar a página principal
          </Link>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Aderir à Antecipação SasCred
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Antecipe seu salário de forma segura e sem burocracia
            </p>
          </div>
        </div>

        {/* Introdução */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center mb-6">
            <FaMoneyBillWave className="text-green-500 text-3xl mr-4" />
            <h2 className="text-2xl font-bold text-gray-900">
              Antecipação Salarial SasCred
            </h2>
          </div>
          
          <div className="text-lg text-gray-700 leading-relaxed space-y-4">
            <p>
              A <strong>Antecipação SasCred</strong> permite que você receba parte do seu salário antes do fechamento do mês, oferecendo uma solução prática para imprevistos e necessidades financeiras urgentes.
            </p>
            
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <p className="text-blue-800 font-medium">
                💡 <strong>Importante:</strong> A Antecipação SasCred não é um empréstimo! É o seu próprio salário sendo antecipado.
              </p>
            </div>
          </div>
        </div>

        {/* Benefícios */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Benefícios da Antecipação
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FaCheckCircle className="text-green-600 text-xl" />
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
                <FaSignature className="text-purple-600 text-xl" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">100% Digital</h3>
              <p className="text-gray-600 text-sm">
                Processo completamente digital com assinatura eletrônica
              </p>
            </div>
          </div>
        </div>

        {/* Regras e Limites */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Regras e Limites da Antecipação
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
                  Assinatura digital obrigatória
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Termos Específicos da Antecipação */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Termos Específicos da Antecipação Salarial
          </h2>
          
          <div className="text-gray-700 leading-relaxed space-y-4">
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">1. Sobre a Antecipação Salarial</h3>
              <p className="text-justify">
                A Antecipação Salarial SasCred permite ao usuário receber parte de seu salário futuro de forma antecipada, 
                mediante desconto automático na folha de pagamento do mês subsequente.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">2. Condições de Antecipação</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>O valor antecipado será limitado a 40% do salário líquido mensal</li>
                <li>Taxa de administração será aplicada conforme tabela vigente</li>
                <li>Desconto automático será realizado na próxima folha de pagamento</li>
                <li>Assinatura digital é obrigatória para cada solicitação</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">3. Autorização de Desconto</h3>
              <p className="text-justify">
                O usuário autoriza expressamente sua empregadora a efetuar o desconto dos valores antecipados 
                diretamente em sua folha de pagamento, conforme Artigo 462 da CLT.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">4. Assinatura Digital</h3>
              <p className="text-justify">
                Para garantir a segurança e validade jurídica da operação, é obrigatória a assinatura digital 
                do contrato de antecipação através da plataforma ZapSign.
              </p>
            </section>
          </div>
        </div>

        {/* Checkbox de Aceitação */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="bg-blue-50 p-6 rounded-lg">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                <strong>☑ Declaro que li, entendi e concordo com os termos da Antecipação Salarial SasCred, 
                ciente de que a aceitação implica minha adesão ao serviço de antecipação e autorizo minha empregadora 
                a efetivar o desconto em folha dos valores antecipados e das taxas de administração aplicáveis.</strong>
              </span>
            </label>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <FaSignature className="text-blue-500 text-6xl mx-auto mb-6" />
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Assinatura Digital Obrigatória
          </h2>
          
          <p className="text-gray-600 mb-8">
            Para aderir à Antecipação SasCred, você deve aceitar os termos e fazer a assinatura digital do contrato.
          </p>
          
          <button
            onClick={handleAceitarEAderirAntecipacao}
            disabled={!isChecked || isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-lg flex items-center mx-auto transition-colors"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Redirecionando...
              </>
            ) : (
              <>
                <FaSignature className="mr-3 text-xl" />
                Aceitar e Aderir à Antecipação
              </>
            )}
          </button>
          
          <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Importante:</strong> Você será redirecionado para a plataforma ZapSign para assinar digitalmente o contrato de antecipação. 
              Após a assinatura, a funcionalidade "Antecipar" ficará disponível no menu.
            </p>
          </div>
        </div>

        {/* Segurança */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-8 mt-8">
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
      </div>
    </div>
  );
}
