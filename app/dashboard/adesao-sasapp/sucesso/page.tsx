'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaCheckCircle, FaHome, FaStar, FaExternalLinkAlt, FaSignature, FaWhatsapp } from 'react-icons/fa';
import { isAssinaturaCompleta, marcarAssinaturaCompleta, abrirCanalAntecipacao, ZAPSIGN_URL, extrairSignerTokenDaUrl } from '@/app/utils/assinatura';

export default function SucessoAdesao() {
  const router = useRouter();
  const [assinaturaCompleta, setAssinaturaCompleta] = useState(false);

  const voltarDashboard = () => {
    router.push('/dashboard');
  };

  const abrirZapSign = async () => {
    try {
      // 🔍 DEBUG: Testar API ZapSign antes de abrir o link
      console.log('🔍 [DEBUG] Iniciando teste da API ZapSign...');
      
      // Extrair signer_token da URL do ZapSign
      const signerToken = extrairSignerTokenDaUrl(ZAPSIGN_URL);
      
      if (!signerToken) {
        alert('🐛 DEBUG: Não foi possível extrair signer_token da URL');
        console.error('❌ Signer token não encontrado na URL:', ZAPSIGN_URL);
        return;
      }

      console.log('✅ Signer token extraído:', signerToken);
      
      // Fazer chamada para a API de verificação
      const zapSignResponse = await fetch('/api/verificar-assinatura-zapsign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signer_token: signerToken
        })
      });

      const zapSignData = await zapSignResponse.json();
      
      // Detectar tipo de token pela URL
      const isDocumentPattern = ZAPSIGN_URL.includes('/doc/');
      const tokenType = isDocumentPattern ? 'Document ID' : 'Signer Token';
      
      // Popup de debug detalhado
      const debugInfo = `
🔍 DEBUG - Teste API ZapSign
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 URL ZapSign Original:
• ${ZAPSIGN_URL}

🔑 Token Extraído:
• Tipo: ${tokenType}
• Valor: ${signerToken}
• Padrão: ${isDocumentPattern ? '/verificar/doc/{id}' : '/verificar/{signer_token}'}

🌐 API Endpoint Testada:
• https://api.zapsign.com.br/api/v1/signers/${signerToken}/

📥 Resposta da API:
• Status HTTP: ${zapSignResponse.status}
• Status Text: ${zapSignResponse.statusText}
• Success: ${zapSignData.success || 'N/A'}
• Status Assinatura: ${zapSignData.status || 'N/A'}
• Message: ${zapSignData.message || 'N/A'}

📊 Dados Completos da Resposta:
${JSON.stringify(zapSignData, null, 2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  Este popup é apenas para debug em desenvolvimento
🚀 Adesão ao Sascred foi concluída com sucesso!

Clique em OK para abrir o ZapSign...
      `;
      
      alert(debugInfo);
      console.log('🐛 [DEBUG] Dados completos ZapSign:', zapSignData);
      
    } catch (debugError) {
      console.error('🐛 [DEBUG] Erro ao testar API ZapSign:', debugError);
      const errorMessage = debugError instanceof Error ? debugError.message : String(debugError);
      alert(`🐛 DEBUG ERROR - ZapSign API:\n${errorMessage}\n\nClique em OK para continuar com o ZapSign...`);
    }
    
    // Abrir ZapSign em nova aba para manter o app aberto
    window.open(ZAPSIGN_URL, '_blank');
  };

  // Verificar ao carregar a página se a assinatura já foi completa
  useEffect(() => {
    setAssinaturaCompleta(isAssinaturaCompleta());
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
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    </div>
  );
} 