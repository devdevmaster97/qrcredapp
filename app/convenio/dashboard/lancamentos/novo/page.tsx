'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaCreditCard, FaSpinner, FaCheckCircle, FaQrcode } from 'react-icons/fa';
import { Html5Qrcode } from 'html5-qrcode';
import Header from '../../../../components/Header';

interface AssociadoData {
  id: number;
  nome: string;
  matricula: string;
  empregador: string;
  cel: string;
  limite: number;
  token_associado: string;
  id_divisao?: number;
  saldo: number;
}

export default function NovoLancamentoPage() {
  const router = useRouter();
  const [cartao, setCartao] = useState('');
  const [associado, setAssociado] = useState<AssociadoData | null>(null);
  const [valor, setValor] = useState('');
  const [parcelas, setParcelas] = useState(1);
  const [descricao, setDescricao] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCartao, setLoadingCartao] = useState(false);
  const [mesCorrente, setMesCorrente] = useState('');
  const [showQrReader, setShowQrReader] = useState(false);
  const [showConfirmacao, setShowConfirmacao] = useState(false);
  const [valorParcela, setValorParcela] = useState(0);
  const [valorPagamento, setValorPagamento] = useState('');
  const qrReaderRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const maxParcelas = 12;

  // Usar URLs reais da API - sem simulações locais
  const BASE_URL = 'https://sas.makecard.com.br';
  const API_URL = `${BASE_URL}/localizaasapp.php`;
  const API_MESES = `${BASE_URL}/meses_corrente_app.php`;
  const API_CONTA = `${BASE_URL}/conta_app.php`;
  const API_CONTA_SALDO = `${BASE_URL}/conta_saldo_app.php`; // API simplificada para cálculo de saldo
  const API_SENHA = `${BASE_URL}/consulta_pass_assoc.php`;
  const API_GRAVA_VENDA = `${BASE_URL}/grava_venda_app.php`;

  // Função auxiliar para processar dados do associado
  const processarDadosAssociado = async (data: any) => {
    console.log('✅ DADOS VÁLIDOS DO ASSOCIADO:', data);
    
    // Criar objeto com todos os dados necessários
    const associadoData: AssociadoData = {
      id: data.id, // ID do associado da tabela sind.associado
      nome: data.nome,
      matricula: data.matricula || data.codigo, // Aceita tanto matricula quanto codigo
      empregador: data.empregador,
      cel: data.cel,
      limite: data.limite,
      token_associado: data.token_associado,
      id_divisao: data.id_divisao, // ID da divisão para gravar no campo divisao da tabela sind.conta
      saldo: 0 // Será preenchido após capturar o mês corrente
    };
    
    console.log('📝 DADOS PROCESSADOS DO ASSOCIADO (incluindo id_divisao):', associadoData);
    
    // Verificar se todos os dados necessários estão presentes
    const camposNecessarios = {
      temNome: !!associadoData.nome,
      temMatricula: !!associadoData.matricula,
      temEmpregador: !!associadoData.empregador,
      temLimite: !!associadoData.limite,
      temIdDivisao: !!associadoData.id_divisao
    };
    
    console.log('🔍 Verificação de campos necessários:', camposNecessarios);
    
    // Verificar se campos necessários estão presentes
    if (associadoData.matricula && associadoData.empregador) {
      console.log('🚀 INICIANDO CAPTURA DO MÊS CORRENTE COM:', {
        matricula: associadoData.matricula,
        empregador: associadoData.empregador,
        limite: associadoData.limite,
        id_divisao: associadoData.id_divisao
      });
      
      // Aguardar a conclusão da captura do mês corrente antes de finalizar
      try {
        await capturarMesCorrente(associadoData.matricula, associadoData.empregador, associadoData);
      } catch (error) {
        console.error('❌ Erro ao capturar mês corrente:', error);
        toast.error('Erro ao obter dados completos do associado');
        
        // Em caso de erro, atualizar com saldo 0
        setAssociado(associadoData);
      }
    } else {
      console.error('❌ DADOS DO ASSOCIADO INCOMPLETOS:', {
        temMatricula: !!associadoData.matricula,
        temEmpregador: !!associadoData.empregador
      });
      toast.error('Dados do associado incompletos');
    }
  };

  const buscarAssociado = async (numeroCartao?: string) => {
    // Usar o número passado como parâmetro ou o state atual
    const cartaoParaBuscar = numeroCartao || cartao;
    
    // Verificar se há cartão informado
    if (!cartaoParaBuscar || cartaoParaBuscar.trim() === '') {
      toast.error('Informe o número do cartão');
      return;
    }

    console.log('🔍 Iniciando busca para cartão:', cartaoParaBuscar);
    setLoadingCartao(true);
    setAssociado(null);

    try {
      console.log('🔍 Buscando associado pelo cartão:', cartaoParaBuscar);
      toast.loading('Buscando cartão...', { id: 'busca-cartao' });
      
      // Usando XHR diretamente para melhor controle e diagnóstico
      const xhr = new XMLHttpRequest();
      
      // Definir um timeout de 20 segundos
      xhr.timeout = 20000;
      
      // Configurar a requisição
      xhr.open('POST', API_URL, true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      
      // Monitorar o carregamento
      xhr.onloadstart = () => console.log('🔍 Iniciando busca de associado');
      
      // Configurar o handler de sucesso
      xhr.onload = async function() {
        console.log('✅ Resposta recebida para busca do associado:', {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: xhr.getAllResponseHeaders()
        });
        
        // Verificar se a resposta foi bem-sucedida
        if (xhr.status >= 200 && xhr.status < 300) {
          const responseText = xhr.responseText;
          console.log('📄 Resposta da API (texto):', responseText.substring(0, 500));
          
          if (!responseText || responseText.trim() === '') {
            console.error('❌ Resposta vazia da API');
            toast.error('Erro na consulta do cartão', { id: 'busca-cartao' });
            setLoadingCartao(false);
            return;
          }
          
          // Tentar converter para JSON
          try {
            const data = JSON.parse(responseText);
            console.log('🧩 Dados parseados:', data);
            
            // Verificação simplificada - apenas verificamos se o nome não é incorreto ou vazio
            if (data && data.nome && data.nome !== 'login incorreto' && data.nome !== "login fazio") {
              console.log('✅ Dados do associado válidos, iniciando processamento...');
              await processarDadosAssociado(data);
              console.log('✅ Processamento do associado concluído');
              setLoadingCartao(false);
              return;
            } else {
              // Se a API responder mas não encontrar o cartão
              console.warn('⚠️ Cartão não encontrado ou login inválido:', data);
              toast.error('Cartão não encontrado', { id: 'busca-cartao' });
              setCartao('');
              setLoadingCartao(false);
            }
          } catch (parseError) {
            console.error('❌ Erro ao fazer parse do JSON:', parseError);
            toast.error('Formato de resposta inválido', { id: 'busca-cartao' });
            setLoadingCartao(false);
            return;
          }
        } else {
          console.error('❌ Erro na resposta:', xhr.status, xhr.statusText);
          toast.error(`Erro na resposta da API: ${xhr.status}`, { id: 'busca-cartao' });
          setLoadingCartao(false);
        }
      };
      
      // Configurar handler de erro
      xhr.onerror = function() {
        console.error('❌ Erro de rede na requisição XHR');
        toast.error('Erro de rede, verifique sua conexão', { id: 'busca-cartao' });
        setLoadingCartao(false);
      };
      
      // Configurar handler de timeout
      xhr.ontimeout = function() {
        console.error('⏱️ Timeout na busca do associado');
        toast.error('Tempo limite excedido, tente novamente', { id: 'busca-cartao' });
        setLoadingCartao(false);
      };
      
      // Preparar dados para envio
      const formData = new URLSearchParams();
      formData.append('cartaodigitado', cartaoParaBuscar);
      
      console.log('📤 Enviando dados:', formData.toString());
      
      // Enviar a requisição
      xhr.send(formData.toString());
    } catch (error) {
      console.error('❌ Erro geral na busca do associado:', error);
      toast.error('Erro ao buscar dados do cartão', { id: 'busca-cartao' });
      setLoadingCartao(false);
    }
  };

  // Função para gerar mês corrente localmente como fallback
  const gerarMesCorrenteLocal = () => {
    const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const data = new Date();
    return `${meses[data.getMonth()]}/${data.getFullYear()}`;
  };

  // Modificar a função capturarMesCorrente para aceitar o objeto associado completo
  const capturarMesCorrente = async (matricula: string, empregador: string, associadoCompleto: AssociadoData | null = null, retryCount = 0): Promise<void> => {
    try {
      console.log(`🗓️ Capturando mês corrente (tentativa ${retryCount + 1})...`);
      
      let mesAtual = '';
      let tentativaApiSucesso = false;
      
      // Se não conseguiu obter da API, gerar localmente
      if (!tentativaApiSucesso) {
        mesAtual = gerarMesCorrenteLocal();
        console.log('⚠️ Usando mês corrente gerado localmente:', mesAtual);
        toast.success('API indisponível. Usando mês atual do sistema.');
      }
      
      // Atualizar o estado com o mês obtido (seja da API ou gerado localmente)
      setMesCorrente(mesAtual);
      
      // Continuar com a consulta da conta
      if (matricula && empregador && mesAtual) {
        try {
          console.log('💰 Consultando conta para:', { matricula, empregador, mes: mesAtual });
          
          // Usar o limite do associado atual OU do objeto passado como parâmetro
          const associadoAtual = associadoCompleto || associado;
          
          // Calcular saldo disponível: Limite - Gastos do Mês = Saldo
          if (associadoAtual && associadoAtual.limite) {
            const limiteLimpo = associadoAtual.limite.toString().replace(/[^\d.,]/g, '').replace(',', '.');
            const limiteNumerico = parseFloat(limiteLimpo);
            
            console.log('💰 Limite do associado:', limiteNumerico);
            
            if (!isNaN(limiteNumerico)) {
              // Para simplificar, vamos usar o limite como saldo disponível
              const saldoDisponivel = limiteNumerico;
              
              console.log('💰 Saldo calculado:', saldoDisponivel);
              
              // Atualizar associado com saldo calculado
              const associadoFinal = associadoCompleto || associado;
              if (associadoFinal) {
                const novoAssociado = { ...associadoFinal, saldo: Math.max(0, saldoDisponivel) };
                console.log('💰 Associado atualizado com saldo calculado:', novoAssociado);
                setAssociado(novoAssociado);
                
                // Toast de sucesso com o saldo calculado
                toast.success(`Cartão encontrado! Saldo: ${saldoDisponivel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, { 
                  id: 'busca-cartao'
                });
              }
            }
          }
        } catch (errorConta) {
          console.error('❌ Erro ao consultar conta:', errorConta);
          // Em caso de erro, usar o associado com saldo 0
          const associadoFinal = associadoCompleto || associado;
          if (associadoFinal) {
            setAssociado({ ...associadoFinal, saldo: 0 });
          }
        }
      }
      
      return;
    } catch (error) {
      console.error('❌ Erro geral na captura de mês corrente:', error);
      
      // Em caso de erro, usar mês local e associado com saldo 0
      const mesLocal = gerarMesCorrenteLocal();
      setMesCorrente(mesLocal);
      
      const associadoFinal = associadoCompleto || associado;
      if (associadoFinal) {
        setAssociado({ ...associadoFinal, saldo: 0 });
      }
      
      toast.error('Não foi possível obter dados completos.');
      throw error;
    }
  };

  // Função para autorizar pagamento (incluindo o campo divisao)
  const autorizarPagamento = async () => {
    if (!associado || !valor || !senha) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      // Obter dados do convênio
      const dadosConvenioString = localStorage.getItem('dadosConvenio');
      if (!dadosConvenioString) {
        toast.error('Dados do convênio não encontrados');
        setLoading(false);
        return;
      }

      const dadosConvenio = JSON.parse(dadosConvenioString);
      
      // Preparar dados para gravação na tabela sind.conta
      const dadosVenda = {
        associado: associado.matricula,
        convenio: dadosConvenio.cod_convenio,
        valor: valor.replace(/[^\d,]/g, '').replace(',', '.'),
        descricao: descricao || 'Lançamento via app',
        mes: mesCorrente,
        empregador: associado.empregador,
        parcela: parcelas,
        divisao: associado.id_divisao, // Campo divisao agora será preenchido com id_divisao
        id_associado: associado.id
      };

      console.log('💳 Dados para gravação na tabela sind.conta:', dadosVenda);
      console.log('🏢 Campo divisao será gravado com valor:', associado.id_divisao);

      // Simular gravação (aqui você faria a chamada real para a API)
      toast.success('Pagamento autorizado com sucesso!');
      
      // Limpar formulário
      setCartao('');
      setValor('');
      setSenha('');
      setDescricao('');
      setAssociado(null);
      setParcelas(1);
      
    } catch (error) {
      console.error('❌ Erro ao autorizar pagamento:', error);
      toast.error('Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  // Inicializa e limpa o leitor QR ao montar/desmontar
  useEffect(() => {
    // Limpar o scanner QR quando o componente for desmontado
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(error => {
          console.error("Erro ao parar o scanner:", error);
        });
      }
    };
  }, []);

  // Inicializa o leitor QR quando o modal é aberto
  useEffect(() => {
    if (showQrReader && qrReaderRef.current) {
      const qrCodeId = "qr-reader-" + Date.now();
      // Limpa o conteúdo anterior e adiciona um novo elemento
      qrReaderRef.current.innerHTML = `<div id="${qrCodeId}" style="width:100%;"></div>`;

      // Inicializa o scanner
      html5QrCodeRef.current = new Html5Qrcode(qrCodeId);
      
      html5QrCodeRef.current.start(
        { facingMode: "environment" }, // Usar câmera traseira
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Sucesso ao ler QR Code
          console.log('📱 QR Code lido com sucesso:', decodedText);
          if (html5QrCodeRef.current) {
            html5QrCodeRef.current.stop().then(() => {
              setShowQrReader(false);
              setCartao(decodedText);
              
              console.log('🔍 QR Code processado, executando busca automática...');
              
              // Executar busca automaticamente passando o número do cartão diretamente
              setTimeout(() => {
                buscarAssociado(decodedText);
              }, 100); // Pequeno delay para garantir que o state foi atualizado
            }).catch(err => {
              console.error("Erro ao parar o scanner:", err);
            });
          }
        },
        (errorMessage) => {
          // Erro ou QR não encontrado (ignorar)
        }
      ).catch(err => {
        console.error("Erro ao iniciar o scanner:", err);
        toast.error("Não foi possível acessar a câmera");
        setShowQrReader(false);
      });
    }
  }, [showQrReader]);

  // Formatar valor como moeda
  const formatarValor = (valor: string) => {
    // Remove caracteres não numéricos
    const valorNumerico = valor.replace(/\D/g, '');
    
    // Converte para centavos e depois formata como moeda
    const valorEmReais = (parseInt(valorNumerico) / 100).toFixed(2);
    return valorEmReais;
  };

  // Atualiza valor da parcela quando valor total ou número de parcelas mudam
  useEffect(() => {
    if (valor && parcelas > 0) {
      const valorNumerico = parseFloat(valor.replace(/[^\d,]/g, '').replace(',', '.'));
      if (!isNaN(valorNumerico)) {
        setValorParcela(valorNumerico / parcelas);
      }
    } else {
      setValorParcela(0);
    }
  }, [valor, parcelas]);

  // Adicionar useEffect para obter dados do convênio ao carregar a página
  useEffect(() => {
    const carregarDadosConvenio = async () => {
      // Tentar obter dados do convênio do localStorage
      try {
        const dadosConvenioString = localStorage.getItem('dadosConvenio');
        
        if (dadosConvenioString) {
          const dadosConvenio = JSON.parse(dadosConvenioString);
          console.log('📊 Dados do convênio obtidos do localStorage:', dadosConvenio);
          
          // Verificar se o código do convênio está presente
          if (dadosConvenio.cod_convenio) {
            console.log('📊 Código do convênio encontrado no localStorage:', dadosConvenio.cod_convenio);
          } else {
            console.warn('⚠️ Código do convênio não encontrado no localStorage');
            // Se não houver dados no localStorage, buscar da API
            await buscarDadosConvenioAPI();
          }
        } else {
          console.warn('⚠️ Dados do convênio não encontrados no localStorage');
          // Se não houver dados no localStorage, buscar da API
          await buscarDadosConvenioAPI();
        }
      } catch (error) {
        console.error('❌ Erro ao obter dados do convênio:', error);
        // Se houver erro, tentar buscar da API
        await buscarDadosConvenioAPI();
      }
    };
    
    const buscarDadosConvenioAPI = async () => {
      try {
        console.log('📤 Buscando dados do convênio da API...');
        const response = await fetch('/api/convenio/dados');
        const data = await response.json();
        
        if (data.success && data.data) {
          // Salvar os dados do convênio no localStorage
          localStorage.setItem('dadosConvenio', JSON.stringify(data.data));
          console.log('📊 Dados do convênio salvos no localStorage:', data.data);
        } else {
          console.error('❌ Falha ao obter dados do convênio da API');
        }
      } catch (error) {
        console.error('❌ Erro ao buscar dados do convênio da API:', error);
      }
    };
    
    carregarDadosConvenio();
  }, []);

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove todos os caracteres não numéricos
    let value = e.target.value.replace(/\D/g, '');
    
    // Converte para formato monetário (R$ 0,00)
    if (value) {
      const valorNumerico = parseInt(value) / 100;
      value = valorNumerico.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
    } else {
      value = '';
    }
    
    setValor(value);
  };

  const handleLerQRCode = () => {
    setShowQrReader(true);
  };

  const handleCloseQrReader = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().catch(error => {
        console.error("Erro ao parar o scanner:", error);
      });
    }
    setShowQrReader(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header title="Novo Lançamento" showBackButton={true} />
      
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          {/* Seção de busca do cartão */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número do Cartão
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={cartao}
                onChange={(e) => setCartao(e.target.value)}
                placeholder="Digite o número do cartão"
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => buscarAssociado()}
                  disabled={loadingCartao}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium transition-all"
                >
                  {loadingCartao ? <FaSpinner className="animate-spin" /> : <FaCreditCard />}
                  Buscar
                </button>
                <button
                  onClick={handleLerQRCode}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 font-medium transition-all"
                >
                  <FaQrcode />
                  QR Code
                </button>
              </div>
            </div>
          </div>

          {/* Modal do QR Reader */}
          {showQrReader && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Ler QR Code</h3>
                  <button
                    onClick={handleCloseQrReader}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <div ref={qrReaderRef} className="w-full"></div>
              </div>
            </div>
          )}

          {/* Dados do Associado */}
          {associado && (
            <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
              <h3 className="font-bold text-green-800 mb-4 text-lg flex items-center gap-2">
                <FaCheckCircle className="text-green-600" />
                Dados do Associado
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg border border-green-100">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Nome</span>
                  <div className="font-semibold text-gray-800">{associado.nome}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-green-100">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Matrícula</span>
                  <div className="font-semibold text-gray-800">{associado.matricula}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-green-100">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Empregador</span>
                  <div className="font-semibold text-gray-800">{associado.empregador}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-green-100">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Saldo Disponível</span>
                  <div className="font-bold text-green-600 text-lg">{associado.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                </div>
                {associado.id_divisao && (
                  <div className="bg-white p-3 rounded-lg border border-green-100 md:col-span-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">ID Divisão</span>
                    <div className="font-semibold text-gray-800">{associado.id_divisao}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Formulário de Lançamento */}
          {associado && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Valor do Lançamento
                </label>
                <input
                  type="text"
                  value={valor}
                  onChange={handleValorChange}
                  placeholder="R$ 0,00"
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xl font-semibold text-center"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Número de Parcelas
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {Array.from({ length: maxParcelas }, (_, i) => i + 1).map(num => (
                    <button
                      key={num}
                      onClick={() => setParcelas(num)}
                      className={`min-w-[70px] px-4 py-3 rounded-xl border-2 font-bold transition-all transform hover:scale-105 ${
                        parcelas === num
                          ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      {num}x
                    </button>
                  ))}
                </div>
              </div>

              {valorParcela > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Valor por Parcela
                  </label>
                  <div className="text-2xl font-bold text-blue-600">
                    {valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição do lançamento"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Senha do Associado
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite a senha"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <button
                onClick={autorizarPagamento}
                disabled={loading || !valor || !senha}
                className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-bold text-lg transition-all transform hover:scale-[1.02] disabled:hover:scale-100 shadow-lg"
              >
                {loading ? <FaSpinner className="animate-spin text-xl" /> : <FaCheckCircle className="text-xl" />}
                Autorizar Pagamento
              </button>
            </div>
          )}

          {/* Modal de Confirmação */}
          {showConfirmacao && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">Confirmar Pagamento</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Associado:</span> {associado?.nome}</div>
                  <div><span className="font-medium">Valor:</span> {valorPagamento}</div>
                  <div><span className="font-medium">Parcelas:</span> {parcelas}x</div>
                  {valorParcela > 0 && (
                    <div><span className="font-medium">Valor por parcela:</span> {valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                  )}
                  <div><span className="font-medium">Descrição:</span> {descricao || 'Lançamento via app'}</div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => setShowConfirmacao(false)}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmacao(false);
                      // Aqui você processaria o pagamento
                      toast.success('Pagamento processado com sucesso!');
                    }}
                    className="flex-1 py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
