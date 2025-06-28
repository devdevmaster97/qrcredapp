'use client';

import { useState, useEffect } from 'react';
import { FaArrowLeft, FaCheckCircle, FaStar } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

export default function AdesaoSasapp() {
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [jaAderiu, setJaAderiu] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Verificar se o usuário já aderiu ao Sascred
    const verificarAdesao = () => {
      console.log('Iniciando verificação de adesão...');
      try {
        const storedUser = localStorage.getItem('qrcred_user');
        console.log('Usuário armazenado:', storedUser);
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          const adesaoStatus = localStorage.getItem(`sascred_${userData.cartao}`);
          console.log('Status de adesão:', adesaoStatus);
          
          if (adesaoStatus === 'aderido') {
            setJaAderiu(true);
            console.log('Usuário já aderiu ao Sascred.');
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
      localStorage.setItem(`sascred_${cartao}`, 'aderido');
      localStorage.setItem(`sascred_${cartao}_data`, new Date().toISOString());

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
                Você já aderiu ao Sascred!
              </h2>
              
              <div className="bg-green-50 rounded-lg p-6 mb-6">
                <p className="text-gray-700 leading-relaxed mb-4">
                  <strong>Parabéns!</strong> Você já aceitou os termos de adesão ao Sascred.
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
                Voltar ao Dashboard
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
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-blue-600 mb-6 text-center">
            Termo de Adesão ao Sistema de Créditos Sascred
          </h2>
          
          <p className="text-gray-700 text-center">
            Funcionalidade em desenvolvimento...
          </p>
        </div>
      </div>
    </div>
  );
} 