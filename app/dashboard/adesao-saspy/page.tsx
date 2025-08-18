'use client';

import { useState, useEffect } from 'react';
import { FaArrowLeft, FaCheckCircle, FaStar } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

export default function AdesaoSaspyPlus() {
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [jaAderiu, setJaAderiu] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Verificar se o usuário já aderiu ao Saspyx
    const verificarAdesao = () => {
      console.log('Iniciando verificação de adesão...');
      try {
        const storedUser = localStorage.getItem('qrcred_user');
        console.log('Usuário armazenado:', storedUser);
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          const adesaoStatus = localStorage.getItem(`saspy_plus_${userData.cartao}`);
          console.log('Status de adesão:', adesaoStatus);
          
          if (adesaoStatus === 'aderido') {
            setJaAderiu(true);
            console.log('Usuário já aderiu ao Saspyx.');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status de adesão:', error);
      } finally {
        setCheckingStatus(false);
        console.log('Verificação de adesão concluída.');
      }
    };

    verificarAdesao();
  }, []);

  const handleAccept = async () => {
    if (!isChecked) {
      alert('Você deve aceitar os termos para prosseguir.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Recupera os dados do usuário do localStorage
      const storedUser = localStorage.getItem('qrcred_user');
      if (!storedUser) {
        throw new Error('Usuário não encontrado. Por favor, faça login novamente.');
      }

      const userData = JSON.parse(storedUser);
      const { cartao, senha } = userData;

      console.log('Enviando dados para localização:', { cartao, senha });

      // Busca os dados completos do usuário na API de localização
      const localizaResponse = await fetch('/api/localiza-associado', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          cartao,
          senha,
        }).toString(),
      });

      // Tenta ler a resposta como texto primeiro para debug
      const responseText = await localizaResponse.text();
      console.log('Resposta bruta da API de localização:', responseText);

      // Tenta fazer o parse do JSON
      let localizaData;
      try {
        localizaData = JSON.parse(responseText);
        console.log('Dados recebidos da API de localização:', localizaData);
      } catch (e) {
        console.error('Erro ao fazer parse da resposta:', e);
        throw new Error('Erro ao processar resposta da API. Por favor, tente novamente.');
      }

      if (!localizaResponse.ok) {
        throw new Error('Erro ao buscar dados do usuário. Por favor, tente novamente.');
      }

      // Verifica se os dados necessários estão presentes e mostra detalhes do que está faltando
      const camposFaltantes = [];
      if (!localizaData?.matricula) camposFaltantes.push('matricula');
      if (!localizaData?.nome) camposFaltantes.push('nome');
      if (!localizaData?.cel) camposFaltantes.push('cel');

      if (camposFaltantes.length > 0) {
        console.error('Campos faltantes:', camposFaltantes);
        throw new Error(`Dados incompletos. Faltam os seguintes campos: ${camposFaltantes.join(', ')}`);
      }

      // Prepara os dados no formato JSON que a API espera
      const dadosParaEnviar = {
        codigo: localizaData.matricula.toString(),
        nome: localizaData.nome,
        celular: localizaData.cel
      };

      console.log('Enviando dados para API de associados:', dadosParaEnviar);

      // Envia os dados para nossa API route local (que fará o proxy para a API externa)
      const adesaoResponse = await fetch('/api/adesao-saspy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosParaEnviar)
      });

      // Tenta ler a resposta como texto primeiro
      const adesaoResponseText = await adesaoResponse.text();
      console.log('Resposta da API de associados:', adesaoResponseText);

      // Tenta fazer o parse da resposta como JSON
      let responseData;
      try {
        responseData = JSON.parse(adesaoResponseText);
        console.log('Resposta parseada:', responseData);
      } catch (e) {
        console.error('Erro ao fazer parse da resposta:', e);
        throw new Error('Erro interno do servidor.');
      }

      if (!adesaoResponse.ok) {
        throw new Error(
          responseData?.mensagem || 
          `Erro ao processar a adesão: ${adesaoResponseText}`
        );
      }

      // Salvar status de adesão no localStorage
      localStorage.setItem(`saspy_plus_${cartao}`, 'aderido');
      localStorage.setItem(`saspy_plus_${cartao}_data`, new Date().toISOString());

      // Marcar que o usuário vai assinar digitalmente
      localStorage.setItem('sascred_possible_signature', Date.now().toString());
      
      // Redirecionar para link de assinatura digital
      window.location.href = 'https://app.zapsign.com.br/verificar/doc/b4ab32f3-d964-4fae-b9d2-01c05f2f4258';
    } catch (error) {
      console.error('Erro completo:', error);
      alert(error instanceof Error ? error.message : 'Erro ao processar a adesão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const voltarDashboard = () => {
    router.push('/dashboard');
  };

  // Loading inicial
  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-xl text-gray-500">Verificando status...</div>
      </div>
    );
  }

  // Se já aderiu, mostrar página diferente
  if (jaAderiu) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={voltarDashboard}
              className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
              <FaArrowLeft className="mr-2" />
              Voltar
            </button>
            <h1 className="text-3xl font-bold text-gray-900 text-center">
              Aderir ao Sascred
            </h1>
          </div>

          {/* Conteúdo para quem já aderiu */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <FaCheckCircle className="text-green-600 text-3xl" />
              </div>
              
              <h2 className="text-2xl font-semibold text-green-600 mb-4 flex items-center justify-center">
                <FaStar className="text-yellow-500 mr-2" />
                Você já aderiu ao Saspyx!
              </h2>
              
              <div className="bg-green-50 rounded-lg p-6 mb-6">
                <p className="text-gray-700 leading-relaxed mb-4">
                  <strong>Parabéns!</strong> Você já aceitou os termos de adesão ao Saspyx.
                </p>
                
                <p className="text-gray-600 leading-relaxed mb-4">
                  Sua solicitação já foi enviada para nossa central de atendimento. Nossa equipe irá processar sua adesão e entrar em contato com você em breve.
                </p>

                <div className="bg-white rounded-md p-4 border-l-4 border-green-500">
                  <p className="text-sm text-gray-600">
                    <strong>Status:</strong> Adesão em processamento
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>Próximos passos:</strong> Aguarde o contato da nossa equipe
                  </p>
                </div>
              </div>

              <button
                onClick={voltarDashboard}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 flex items-center mx-auto"
              >
                <FaArrowLeft className="mr-2" />
                Voltar a página principal
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tela normal de adesão
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <FaArrowLeft className="mr-2" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            Aderir ao Sascred
          </h1>
        </div>

        {/* Conteúdo do Termo */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="prose max-w-none">
            <h2 className="text-2xl font-semibold text-blue-600 mb-6 text-center">
              Termo de Adesão ao Sistema de Créditos Saspyx
            </h2>
            
            <div className="text-gray-700 leading-relaxed space-y-4">
              <p className="text-justify">
                Ao prosseguir, o(a) usuário(a) declara ter lido, compreendido e aceitado integralmente os termos e condições abaixo, ciente de que a aceitação implica adesão automática ao sistema Saspyx.
              </p>

              <div className="space-y-6 mt-8">
                <section>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">1. Sobre o Saspyx</h3>
                  <p className="text-justify">
                    O Saspyx é um sistema de créditos integrado ao aplicativo SaSapp, que permite ao usuário utilizar créditos digitais disponibilizado pela sua empregadora, como forma de pagamento em estabelecimentos participantes da rede conveniada SaSapp, e somente poderá usufruir do benefício o empregado da empregadora da categoria, que não estiver usufruindo de licença para tratamento de saúde, aviso prévio ou outro afastamento de qualquer natureza que implique em suspensão do contrato de trabalho e do pagamento dos salários.
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">2. Adesão e Taxa</h3>
                  <p className="text-justify mb-3">
                    A adesão ao Saspyx será realizada após a aceitação dos termos, e a ativação do serviço implica a cobrança de taxa de manutenção no valor mensal de <strong className="text-blue-600">R$ 7,50 (sete reais e cinquenta centavos)</strong>, através de desconto em folha, que dede já autoriza a sua empregadora em efetivá-lo.
                  </p>
                  <p className="text-justify">
                    Uma vez aderido, o(a) usuário(a) terá acesso ao painel de créditos, onde poderá:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                    <li>Receber crédito disponibilizado por sua empresadora;</li>
                    <li>Consultar saldo e histórico de movimentações;</li>
                    <li>Utilizar créditos como forma de pagamento nos estabelecimentos credenciados.</li>
                  </ul>
                  <p className="text-justify mt-3">
                    Após a adesão o titular receberá uma comunicação informando seu limite de crédito liberado pela empregadora, sendo que o saldo disponível para compras poderá ser consultado no APP e em qualquer estabelecimento credenciado via internet.
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">3. Das Condições Adesão</h3>
                  <p className="text-justify mb-2">
                    O titular do beneficio autoriza o desconto a ser efetuado pela sua empregadora no momento do pagamento de seu salário, dos valores concedidos a título de adiantamento salarial utilizados durante o período de uso do cartão, e da taxa de administração no valor de R$ 7,50 (sete reais e cinquenta centavos).
                  </p>
                  <p className="text-justify mb-2">
                    O titular do beneficio concorda que a sua empregadora, no momento da rescisão contratual terá a obrigação de descontar os valores remanescentes originários do convênio ora pactuado.
                  </p>
                  <p className="text-justify mb-2">
                    O desconto em folha será efetuado conforme Artigo 462 da CLT e na Convenção Coletiva de Trabalho da Categoria.
                  </p>
                  <p className="text-justify mb-2">
                    As parcelas das compras que vencerem no mês de férias, serão descontadas antecipadamente, conforme folha de pagamento (das férias) da empresa. As compras efetuadas em parcelas serão parceladas em, no máximo, 02 (duas) vezes (com ou sem acréscimo).
                  </p>
                  <p className="text-justify">
                    O titular do beneficio tem ciência que, após efetuada a aquisição de bens e serviços, dentro dos parâmetros do limite autorizado e vigente, a empresa não poderá deixar, sob qualquer hipótese, de fazer o desconto na folha de pagamento do titular e o consequente repasse sob pena de arcar com tal valor.
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">4. Uso dos Créditos</h3>
                  <p className="text-justify mb-2">Os créditos adquiridos por meio do Saspyx:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>São pessoais e intransferíveis;</li>
                    <li>Podem ser utilizados exclusivamente na rede conveniada SaSapp, disponível para consulta no próprio aplicativo.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">5. Responsabilidades do Usuário</h3>
                  <p className="text-justify mb-2">O(a) usuário(a) se compromete a:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Utilizar os créditos de maneira lícita e conforme os termos aqui descritos;</li>
                    <li>Manter seus dados pessoais atualizados no aplicativo;</li>
                    <li>Reportar ao suporte do SaSapp qualquer atividade suspeita ou uso indevido da conta.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">6. Privacidade e Proteção de Dados</h3>
                  <p className="text-justify">
                    Ao aderir ao Sascred, o(a) usuário(a) autoriza o tratamento de seus dados pessoais conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), exclusivamente para fins de operação, segurança e aperfeiçoamento do sistema de créditos.
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">7. Modificações e Cancelamento</h3>
                  <p className="text-justify">
                    O SaSapp reserva-se o direito de atualizar este termo ou suspender o sistema de créditos, mediante aviso prévio no aplicativo. O cancelamento da adesão por parte do usuário pode ser solicitado a qualquer momento, contudo, a taxa de adesão não é reembolsável.
                  </p>
                </section>
              </div>
            </div>
          </div>

          {/* Checkbox e Botão de Aceitação */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="bg-blue-50 p-4 rounded-lg">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                  className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  <strong>☑ Declaro que li, entendi e concordo com os termos acima, ciente de que a aceitação implica minha adesão automática ao Saspyx e autorizo minha empregadora a efetivar o desconto em folha dos créditos disponibilizados e efetivamente utilizados e a cobrança de taxa de manutenção no valor mensal de R$ 7,50 (sete reais e cinquenta centavos).</strong>
                </span>
              </label>
            </div>

            <div className="mt-6 space-y-4">
              <div className="text-center text-sm text-gray-600">
                <p>Local, data e hora da assinatura eletrónica.</p>
                <br />
                <p>Titular do Beneficio</p>
              </div>

              <div className="flex justify-center">
              <button
                onClick={handleAccept}
                disabled={!isChecked || isLoading}
                className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
                  isChecked && !isLoading
                    ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processando...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <FaCheckCircle className="mr-2" />
                      Aceitar e Aderir ao Sascred
                  </div>
                )}
              </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 