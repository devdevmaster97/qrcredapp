'use client';

import { FaShieldAlt, FaInfoCircle } from 'react-icons/fa';

export default function ProtecaoFamiliarOQueEPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Proteção Familiar - O que é</h1>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-blue-600 flex items-center">
          <FaShieldAlt className="text-white text-2xl mr-3" />
          <h2 className="text-xl font-bold text-white">Proteção Familiar</h2>
        </div>

        <div className="p-6">
          <div className="flex items-start space-x-4 mb-6">
            <FaInfoCircle className="text-blue-500 text-2xl mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                O que é a Proteção Familiar?
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                A Proteção Familiar é um conjunto de serviços e benefícios oferecidos para garantir 
                maior segurança e comodidade para você e sua família. Através desta funcionalidade, 
                você tem acesso a convênios especiais e pode realizar agendamentos de forma prática e segura.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Convênios</h4>
              <p className="text-gray-600 text-sm">
                Acesse uma rede credenciada de estabelecimentos com condições especiais 
                e descontos exclusivos para associados.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Agendamentos</h4>
              <p className="text-gray-600 text-sm">
                Realize agendamentos de serviços de forma simples e organize sua agenda 
                com total comodidade.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-400">
            <p className="text-blue-800 text-sm">
              <strong>Dica:</strong> Explore os menus "Convênios" e "Agendamentos" para descobrir 
              todos os benefícios disponíveis para você e sua família.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
