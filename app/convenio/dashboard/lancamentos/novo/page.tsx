'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import ModernAlert from '@/app/components/ModernAlert';
import { useModernAlert } from '@/app/hooks/useModernAlert';
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
  cpf?: string;
  nome_empregador?: string;
  nome_divisao?: string;
  id_associado?: number;
}

export default function NovoLancamentoPage() {
  const router = useRouter();
  const [associado, setAssociado] = useState<AssociadoData | null>(null);
  const [cartao, setCartao] = useState('');
  const [valor, setValor] = useState('');
  const [parcelas, setParcelas] = useState(1);
  const [descricao, setDescricao] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaVisual, setSenhaVisual] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCartao, setLoadingCartao] = useState(false);
  const [pagamentoProcessado, setPagamentoProcessado] = useState(false);
  const [mesCorrente, setMesCorrente] = useState('');
  const [showQrReader, setShowQrReader] = useState(false);
  const [qrReaderLoading, setQrReaderLoading] = useState(false);
  const [showConfirmacao, setShowConfirmacao] = useState(false);
  const [valorParcela, setValorParcela] = useState(0);
  
  // Hook para alertas modernos
  const { alert, success, error, warning, info, closeAlert } = useModernAlert();
  const [valorPagamento, setValorPagamento] = useState('');
  const qrReaderRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [maxParcelas, setMaxParcelas] = useState(12);
  const cartaoInputRef = useRef<HTMLInputElement>(null);

  // useEffect para focar no input do cartão quando a página carrega (apenas em desktop)
  useEffect(() => {
    const focusCartaoInput = () => {
      // Verificar se é desktop/computador
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isDesktop = !isMobile && !hasTouch;
      
      // Focar apenas em desktop para melhor UX
      if (isDesktop && cartaoInputRef.current) {
        setTimeout(() => {
          cartaoInputRef.current?.focus();
        }, 300); // Pequeno delay para garantir que a página carregou
      }
    };

    focusCartaoInput();
  }, []);

  // Função para detectar se é um dispositivo desktop/computador
  const isDesktop = () => {
    // Verifica se não é um dispositivo móvel baseado no user agent
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    
    // Também verifica se tem touch screen (dispositivos móveis geralmente têm)
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // É desktop se não for mobile E não tiver touch, OU se a tela for grande
    return (!isMobile && !hasTouch) || window.innerWidth >= 1024;
  };

  // Função para lidar com teclas pressionadas no campo do cartão
  const handleCartaoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Só executa no Enter e apenas em dispositivos desktop
    if (e.key === 'Enter' && isDesktop()) {
      e.preventDefault(); // Previne comportamento padrão
      console.log('🖥️ Enter pressionado em dispositivo desktop, executando busca...');
      buscarAssociado();
    }
  };

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
      saldo: 0, // Será preenchido após capturar o mês corrente
      cpf: data.cpf, // CPF do associado
      nome_empregador: data.nome_empregador || null, // Nome do empregador da API
      nome_divisao: data.nome_divisao || null, // Nome da divisão da API
      id_associado: data.id_associado,
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
      } catch (err) {
        console.error('❌ Erro ao capturar mês corrente:', err);
        closeAlert();
        error('Erro no Mês Corrente', 'Não foi possível obter dados completos do associado.');
        
        // Em caso de erro, atualizar com saldo 0
        setAssociado(associadoData);
      }
    } else {
      console.error('❌ DADOS DO ASSOCIADO INCOMPLETOS:', {
        temMatricula: !!associadoData.matricula,
        temEmpregador: !!associadoData.empregador
      });
      closeAlert();
      error('Dados Incompletos', 'Os dados do associado estão incompletos. Tente novamente.');
    }
  };

  const buscarAssociado = async (numeroCartao?: string) => {
    // Usar o número passado como parâmetro ou o state atual
    const cartaoParaBuscar = numeroCartao || cartao;
    
    // Verificar se há cartão informado
    if (!cartaoParaBuscar || cartaoParaBuscar.trim() === '') {
      closeAlert();
      error('Cartão Obrigatório', 'Por favor, informe o número do cartão.');
      return;
    }
  
    console.log('🔍 Iniciando busca para cartão:', cartaoParaBuscar);
    setLoadingCartao(true);
    setAssociado(null);
  
    try {
      console.log('🔍 Buscando associado pelo cartão via API interna:', cartaoParaBuscar);
      closeAlert();
      info('Buscando Cartão', 'Aguarde enquanto consultamos os dados do cartão...');
      
      const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
  
      const response = await fetch('/api/convenio/buscar-associado', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cartaodigitado: cartaoParaBuscar
        }),
        cache: 'no-store'
      });
  
      console.log('✅ Resposta recebida da API interna:', {
        status: response.status,
        statusText: response.statusText
      });
  
      const data = await response.json();
      console.log('📄 Dados recebidos da API:', data);
  
      if (response.ok && data.success && data.data) {
        console.log('✅ Dados do associado válidos, iniciando processamento...');
        await processarDadosAssociado(data.data);
        console.log('✅ Processamento do associado concluído');
      } else {
        // Tratar diferentes tipos de erro
        const errorMessage = data.error || 'Erro desconhecido';
        
        if (response.status === 404) {
          console.warn('⚠️ Cartão não encontrado:', errorMessage);
          console.log('🔧 DEBUG: Chamando closeAlert()...');
          closeAlert();
          console.log('🔧 DEBUG: Chamando error() para cartão não encontrado...');
          
          // Pequeno delay para garantir que o closeAlert() seja processado
          setTimeout(() => {
            error('Cartão Não Encontrado', 'O cartão informado não foi encontrado no sistema.');
            console.log('🔧 DEBUG: Função error() executada para cartão não encontrado');
          }, 100);
        } else if (response.status === 408) {
          console.error('⏱️ Timeout na busca:', errorMessage);
          closeAlert();
          setTimeout(() => {
            error('Conexão Lenta', 'Houve uma oscilação na sua conexão com a internet. Por favor, verifique sua conexão e tente novamente.');
          }, 100);
        } else {
          console.error('❌ Erro na API:', errorMessage);
          closeAlert();
          setTimeout(() => {
            error('Erro na Consulta', 'Não foi possível consultar os dados do cartão.');
          }, 100);
        }
        
        setCartao('');
      }
      
      setLoadingCartao(false);
      
    } catch (err) {
      console.error('❌ Erro geral na busca do associado:', err);
      
      if (err instanceof TypeError && err.message.includes('fetch')) {
        closeAlert();
        error('Erro de Rede', 'Verifique sua conexão com a internet e tente novamente.');
      } else {
        closeAlert();
        error('Erro na Busca', 'Não foi possível buscar os dados do cartão.');
      }
      
      setLoadingCartao(false);
    }
  };

  // Função removida - não usar fallback local para mês corrente

  // Modificar a função capturarMesCorrente para aceitar o objeto associado completo
  const capturarMesCorrente = async (matricula: string, empregador: string, associadoCompleto: AssociadoData | null = null, retryCount = 0): Promise<void> => {
    try {
      console.log(`🗓️ Capturando mês corrente (tentativa ${retryCount + 1})...`);
      
      let mesAtual = '';
      let tentativaApiSucesso = false;
      
      // Tentar obter da API primeiro
      try {
        console.log('📅 Consultando API interna de mês corrente...');
        const associadoAtual = associadoCompleto || associado;
        
        if (associadoAtual && associadoAtual.id_divisao) {
          console.log('📅 Enviando divisão para API interna:', associadoAtual.id_divisao);
          
          const headers = {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          };

          const mesResponse = await fetch(`/api/convenio/mes-corrente?t=${Date.now()}&divisao=${associadoAtual.id_divisao}`, {
            method: 'GET',
            headers,
            cache: 'no-store'
          });
          
          if (mesResponse.ok) {
            const mesData = await mesResponse.json();
            console.log('📅 Resposta da API interna de mês:', mesData);
            
            if (mesData.success && mesData.data && mesData.data.abreviacao) {
              mesAtual = mesData.data.abreviacao;
              tentativaApiSucesso = true;
              console.log('✅ Mês corrente obtido da API interna:', mesAtual);
            }
          }
        }
      } catch (errorApi) {
        console.error('❌ Erro ao consultar API interna de mês:', errorApi);
      }
      
      // Se não conseguiu obter da API, falhar o processo
      if (!tentativaApiSucesso) {
        console.error('❌ Falha obrigatória: não foi possível obter mês corrente da API');
        closeAlert();
        error('Erro no Mês Corrente', 'Não foi possível obter o mês corrente. Tente novamente.');
        setLoading(false);
        return; // Parar o processo aqui
      }
      
      // Atualizar o estado apenas com o mês obtido da API
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
              // Buscar gastos do mês corrente para calcular saldo real
              try {
                console.log('📊 Consultando gastos do mês corrente...');
                
                const dadosConta = {
                  matricula: associadoAtual.matricula,
                  empregador: associadoAtual.empregador.toString(),
                  mes: mesAtual,
                  id: associadoAtual.id.toString(),
                  divisao: associadoAtual.id_divisao?.toString() || ''
                };
                
                const contaResponse = await fetch('/api/convenio/consultar-conta', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                  },
                  body: JSON.stringify(dadosConta),
                  cache: 'no-store'
                });
                
                if (contaResponse.ok) {
                  const responseData = await contaResponse.json();
                  console.log('📊 Resposta da API interna:', responseData);
                  
                  let totalGastos = 0;
                  
                  if (responseData.success && Array.isArray(responseData.data)) {
                    // Somar todos os valores das contas do mês
                    totalGastos = responseData.data.reduce((total: number, conta: any) => {
                      const valor = parseFloat(conta.valor || 0);
                      return total + valor;
                    }, 0);
                  } else if (Array.isArray(responseData)) {
                    // Fallback para compatibilidade com formato antigo
                    totalGastos = responseData.reduce((total: number, conta: any) => {
                      const valor = parseFloat(conta.valor || 0);
                      return total + valor;
                    }, 0);
                  }
                  
                  console.log('💰 Total de gastos no mês:', totalGastos);
                  
                  // Calcular saldo real: Limite - Gastos
                  const saldoDisponivel = limiteNumerico - totalGastos;
                  
                  console.log('💰 Saldo disponível calculado:', saldoDisponivel);
                  
                  // Atualizar associado com saldo calculado
                  const associadoFinal = associadoCompleto || associado;
                  if (associadoFinal) {
                    const novoAssociado = { ...associadoFinal, saldo: Math.max(0, saldoDisponivel) };
                    console.log('💰 Associado atualizado com saldo real:', novoAssociado);
                    setAssociado(novoAssociado);
                    
                    // Toast de sucesso com o saldo real
                    closeAlert();
                    success('Cartão Encontrado!', `Saldo disponível: ${Math.max(0, saldoDisponivel).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
                  }
                } else {
                  console.error('❌ Erro ao consultar conta - API retornou erro');
                  const contaText = await contaResponse.text();
                  console.error('❌ Resposta da API conta:', contaText);
                  
                  closeAlert();
                  error('Erro no Saldo', 'Não foi possível consultar o saldo. Verifique os dados e tente novamente.');
                  setLoadingCartao(false);
                  return; // Parar o processo se não conseguir consultar o saldo
                }
              } catch (errorConsulta) {
                console.error('❌ Erro ao consultar gastos:', errorConsulta);
                closeAlert();
                error('Erro de Conexão', 'Problema na conexão ao consultar saldo. Verifique sua internet.');
                setLoadingCartao(false);
                return; // Parar o processo se houver erro de conexão
              }
            }
          }
        } catch (errorConta) {
          console.error('❌ Erro crítico ao consultar conta:', errorConta);
          closeAlert();
          error('Erro Crítico', 'Não foi possível consultar dados da conta. Operação cancelada.');
          setLoadingCartao(false);
          return; // Parar completamente se houver erro crítico
        }
      }
      
      return;
    } catch (err) {
      console.error('❌ Erro geral na captura de mês corrente:', err);
      
      // Em caso de erro, falhar o processo - não usar fallback
      console.error('❌ Falha crítica: não foi possível obter mês corrente da API');
      closeAlert();
      error('Erro Crítico', 'Não foi possível obter o mês corrente. Operação cancelada.');
      setLoading(false);
      return; // Parar completamente o processo
    }
  };

  const autorizarPagamento = async () => {
    if (!associado || !valor || !senha) {
      closeAlert();
      error('Campos Obrigatórios', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // Validar saldo disponível
    if (associado.saldo <= 0) {
      closeAlert();
      error('Saldo Insuficiente', 'O saldo disponível deve ser maior que zero para realizar lançamentos.');
      return;
    }

    // Converter valor para número para comparação
    const valorNumerico = parseFloat(valor.replace(/[^\d,]/g, '').replace(',', '.'));
    
    if (valorNumerico > associado.saldo) {
      closeAlert();
      error('Valor Inválido', `Valor da parcela (${valorNumerico.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) não pode ser maior que o saldo disponível (${associado.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`);
      return;
    }

    setLoading(true);

    try {
      // Obter dados do convênio com verificação de segurança para Android
      let dadosConvenio;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const dadosConvenioString = localStorage.getItem('dadosConvenio');
          if (!dadosConvenioString) {
            closeAlert();
            error('Dados Não Encontrados', 'Os dados do convênio não foram encontrados.');
            setLoading(false);
            return;
          }
          dadosConvenio = JSON.parse(dadosConvenioString);
        } else {
          throw new Error('localStorage não disponível');
        }
      } catch (storageError) {
        console.error('❌ Erro ao acessar localStorage:', storageError);
        closeAlert();
        error('Erro de Armazenamento', 'Não foi possível acessar os dados salvos. Tente fazer login novamente.');
        setLoading(false);
        return;
      }

      // 1. Verificar senha do associado
      console.log('🔐 Verificando senha do associado...');
      console.log('🔐 Matrícula:', associado.matricula);
      console.log('🔐 Senha (mascarada):', senha.replace(/./g, '*'));
      
      
      // 1. Verificar senha usando API interna com retry automático
      const verificarSenha = async (): Promise<void> => {
        const maxRetries = 3;
        let attempt = 0;
        
        while (attempt < maxRetries) {
          try {
            attempt++;
            console.log(`🔐 Verificando senha via API interna (tentativa ${attempt}/${maxRetries})...`);
            
            const headers = {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            };
            
            const response = await fetch('/api/convenio/verificar-senha', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                matricula: associado.matricula,
                senha: senha,
                id_associado: associado.id,
                empregador: associado.empregador // Empregador sempre existe
              }),
              cache: 'no-store'
            });
            
            console.log('🔐 Status da resposta da verificação:', response.status);
            
            const data = await response.json();
            console.log('🔐 Dados da verificação de senha:', data);
            
            if (response.status === 401) {
              closeAlert();
              error('Senha Incorreta', 'A senha informada está incorreta. Tente novamente.');
              throw new Error('Senha incorreta');
            }
            
            if (!response.ok || !data.success) {
              closeAlert();
              error('Erro na Verificação', data.error || 'Erro ao verificar senha');
              throw new Error(data.error || 'Erro na verificação de senha');
            }
            
            console.log('✅ Senha verificada com sucesso via API interna');
            return; // Sucesso, sair da função
            
          } catch (fetchError) {
            console.error(`❌ Erro na verificação de senha (tentativa ${attempt}):`, fetchError);
            
            if (fetchError instanceof Error && fetchError.message === 'Senha incorreta') {
              throw fetchError; // Re-throw para manter a mensagem específica
            }
            
            // Se é o último retry ou não é um erro de rede, falhar imediatamente
            const isNetworkError = fetchError instanceof TypeError && 
              (fetchError.message.includes('Failed to fetch') || 
               fetchError.message.includes('NetworkError') ||
               fetchError.message.includes('ERR_NETWORK_CHANGED'));
            
            if (attempt >= maxRetries || !isNetworkError) {
              // Tratamento específico para diferentes tipos de erro
              let errorTitle = 'Erro de Conexão';
              let errorMessage = 'Não foi possível verificar a senha. Tente novamente.';
              
              if (fetchError instanceof TypeError) {
                if (fetchError.message.includes('Failed to fetch')) {
                  errorTitle = 'Problema de Conectividade';
                  errorMessage = 'Houve uma instabilidade na sua conexão. Verifique sua internet e tente novamente.';
                } else if (fetchError.message.includes('NetworkError')) {
                  errorTitle = 'Erro de Rede';
                  errorMessage = 'Problema na conexão com o servidor. Tente novamente em alguns segundos.';
                }
              }
              
              closeAlert();
              error(errorTitle, errorMessage);
              throw new Error('Erro de conexão na verificação de senha');
            }
            
            // Aguardar antes do próximo retry (backoff exponencial)
            const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
            console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      };

      await verificarSenha();

      // 2. Preparar dados para gravação na tabela sind.conta (parâmetros corretos para a API)
      const valorLimpo = valor.replace(/[^\d,]/g, '').replace(',', '.');
      const valorPorParcela = (parseFloat(valorLimpo) / parcelas).toFixed(2);
      
      // Preparar dados base
      const dadosVenda: any = {
        // Parâmetros obrigatórios que a API espera
        valor_pedido: valorLimpo,
        cod_convenio: dadosConvenio.cod_convenio,
        matricula: associado.matricula,
        qtde_parcelas: parcelas, // Corrigido: PHP espera 'qtde_parcelas' na linha 47
        mes_corrente: mesCorrente,
        valor_parcela: valorPorParcela,
        primeiro_mes: mesCorrente,
        pass: senha,
        nome: associado.nome,
        cartao: '', // Será preenchido se necessário
        empregador: associado.empregador,
        descricao: descricao || 'Lançamento via app',
        uri_cupom: '', // Será preenchido se necessário
        id_associado: associado.id
      };

      // Adicionar divisao agora que a tabela estornos foi atualizada
      // Campo id_divisao foi renomeado para divisao e id_associado foi adicionado
      if (associado.id_divisao && associado.id_divisao !== null && associado.id_divisao !== undefined && String(associado.id_divisao).trim() !== '') {
        dadosVenda.divisao = associado.id_divisao;
        console.log('🏢 Campo divisao adicionado:', associado.id_divisao);
      } else {
        console.log('⚠️ Campo id_divisao não encontrado ou inválido, não será enviado');
      }

      console.log('💳 Dados para gravação na tabela sind.conta:', dadosVenda);
      console.log('🏢 Campo divisao será gravado com valor:', associado.id_divisao);
      console.log('🔍 Verificando se id_divisao existe no associado:', {
        temIdDivisao: !!associado.id_divisao,
        valorIdDivisao: associado.id_divisao,
        tipoIdDivisao: typeof associado.id_divisao
      });

      // 3. Buscar mês corrente da API interna antes de gravar
      console.log('📅 Buscando mês corrente da API interna...');
      console.log('📅 Divisão do associado:', associado.id_divisao);
      
      const buscarMesCorrente = async (): Promise<string> => {
        try {
          const headers = {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          };

          const response = await fetch(`/api/convenio/mes-corrente?t=${Date.now()}&divisao=${associado.id_divisao}`, {
            method: 'GET',
            headers,
            cache: 'no-store'
          });

          if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
          }

          const data = await response.json();
          console.log('📅 Resposta da API interna de mês corrente:', data);

          if (data.success && data.data && data.data.abreviacao) {
            console.log('✅ Mês corrente obtido da API interna:', data.data.abreviacao);
            return data.data.abreviacao;
          } else {
            throw new Error('Campo abreviacao não encontrado na resposta');
          }
        } catch (error) {
          console.error('❌ Erro ao buscar mês corrente da API interna:', error);
          throw new Error('Erro na consulta do mês corrente');
        }
      };

      const abreviacaoMes = await buscarMesCorrente();
      
      // Atualizar dadosVenda com a abreviação obtida da API
      dadosVenda.mes_corrente = abreviacaoMes;
      dadosVenda.primeiro_mes = abreviacaoMes;
      
      console.log('📅 Mês corrente atualizado nos dados de venda:', abreviacaoMes);

      // 4. Gravar venda na API
      console.log('💾 Gravando venda na API...');
      console.log('💾 URL da API:', '/api/convenio/gravar-venda');
      console.log('✅ Dados que serão gravados na tabela sind.conta:', dadosVenda);
      
      const gravarVenda = async () => {
        try {
          console.log('💾 Gravando venda via API interna...');
          console.log('✅ Dados que serão enviados:', dadosVenda);
          
          const headers = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          };
          
          const response = await fetch('/api/convenio/gravar-venda', {
            method: 'POST',
            headers,
            body: JSON.stringify(dadosVenda),
            cache: 'no-store'
          });

          console.log('✅ Resposta recebida da API interna:', {
            status: response.status,
            statusText: response.statusText
          });

          const data = await response.json();
          console.log('� Dados recebidos da API:', data);

          if (response.ok && data.success && data.situacao === 1) {
            console.log('✅ Venda gravada com sucesso na tabela sind.conta');
            console.log('📄 Registro gerado:', data.registrolan);
            
            // Armazenar o registrolan para usar no comprovante com verificação de segurança
            if (data.registrolan) {
              console.log('💾 Salvando registrolan para comprovante:', data.registrolan);
              try {
                if (typeof window !== 'undefined' && window.sessionStorage) {
                  sessionStorage.setItem('ultimoRegistroLan', data.registrolan);
                } else {
                  console.warn('⚠️ sessionStorage não disponível, usando variável temporária');
                  // Fallback: usar uma variável global temporária
                  (window as any).ultimoRegistroLan = data.registrolan;
                }
              } catch (storageError) {
                console.error('❌ Erro ao salvar no sessionStorage:', storageError);
                // Fallback: usar uma variável global temporária
                (window as any).ultimoRegistroLan = data.registrolan;
              }
            }
            
            return data;
          } else {
            // Tratar diferentes tipos de erro
            const errorMessage = data.error || 'Erro desconhecido';
            
            if (data.situacao === 2) {
              console.log('❌ Senha incorreta');
              throw new Error('Senha incorreta');
            } else if (response.status === 408) {
              console.error('⏱️ Timeout na gravação:', errorMessage);
              throw new Error('Conexão lenta. Houve uma oscilação na sua conexão com a internet. Tente novamente.');
            } else {
              console.log('❌ Erro ao gravar venda:', errorMessage);
              throw new Error(errorMessage);
            }
          }
          
        } catch (err) {
          console.error('❌ Erro geral na gravação da venda:', err);
          
          if (err instanceof TypeError && err.message.includes('fetch')) {
            throw new Error('Erro de rede. Verifique sua conexão com a internet e tente novamente.');
          } else {
            throw err;
          }
        }
      };

      await gravarVenda();

      // 4. Sucesso - marcar como processado e redirecionar
      console.log('🎉 Pagamento processado com sucesso!');
      setPagamentoProcessado(true); // Marcar como processado para manter botão desabilitado
      
      // Salvar dados da transação para a página de sucesso com verificação de segurança
      let registroLan = 'N/A';
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          registroLan = sessionStorage.getItem('ultimoRegistroLan') || 'N/A';
        } else if ((window as any).ultimoRegistroLan) {
          registroLan = (window as any).ultimoRegistroLan;
        }
      } catch (storageError) {
        console.error('❌ Erro ao acessar sessionStorage:', storageError);
        if ((window as any).ultimoRegistroLan) {
          registroLan = (window as any).ultimoRegistroLan;
        }
      }

      const dadosTransacao = {
        associado: associado.nome,
        cpf: associado.cpf,
        valor: valor,
        parcelas: parcelas,
        valorParcela: valorParcela,
        descricao: descricao || 'Lançamento via app',
        timestamp: new Date().toISOString(),
        nomeConvenio: dadosConvenio.razaosocial || dadosConvenio.nome || 'Convênio',
        lancamento: registroLan
      };
      
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('ultimaTransacao', JSON.stringify(dadosTransacao));
        } else {
          console.warn('⚠️ localStorage não disponível para salvar dados da transação');
          // Fallback: usar variável global temporária
          (window as any).ultimaTransacao = dadosTransacao;
        }
      } catch (storageError) {
        console.error('❌ Erro ao salvar dados da transação:', storageError);
        // Fallback: usar variável global temporária
        (window as any).ultimaTransacao = dadosTransacao;
      }
      
      // Redirecionar para página de sucesso
      router.push('/convenio/dashboard/lancamentos/sucesso');
      
    } catch (err) {
      console.error('❌ Erro ao autorizar pagamento:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar pagamento';
      closeAlert();
      error('Erro no Pagamento', errorMessage);
    } finally {
      // Só reabilitar o loading se não foi processado com sucesso
      if (!pagamentoProcessado) {
        setLoading(false);
      }
      // Se foi processado com sucesso, manter loading=true e pagamentoProcessado=true
      // para manter o botão desabilitado até o redirecionamento
    }
  };

  // Inicializa e limpa o leitor QR ao montar/desmontar
  useEffect(() => {
    // Limpar o scanner QR quando o componente for desmontado
    return () => {
      if (html5QrCodeRef.current) {
        // Verificar se o scanner está rodando antes de tentar parar
        const state = html5QrCodeRef.current.getState();
        if (state === 2) { // 2 = SCANNING (scanner está rodando)
          html5QrCodeRef.current.stop().catch(error => {
            console.error("Erro ao parar o scanner:", error);
          });
        }
      }
    };
  }, []);

  // Inicializa o leitor QR quando o modal é aberto
  useEffect(() => {
    if (showQrReader && qrReaderRef.current) {
      console.log('📷 Iniciando leitor QR Code...');
      setQrReaderLoading(true);
      
      const qrCodeId = "qr-reader-" + Date.now();
      
      // Pequeno delay para garantir que o DOM está pronto
      setTimeout(() => {
        if (!qrReaderRef.current) {
          console.error('❌ qrReaderRef.current não está disponível');
          setQrReaderLoading(false);
          return;
        }
        
        try {
          // Limpa o conteúdo anterior e adiciona um novo elemento
          qrReaderRef.current.innerHTML = `<div id="${qrCodeId}" style="width:100%; min-height:300px;"></div>`;
          
          console.log('✅ Elemento QR Code criado:', qrCodeId);

          // Inicializa o scanner
          html5QrCodeRef.current = new Html5Qrcode(qrCodeId);
          
          console.log('📱 Solicitando permissão da câmera...');
          
          // Primeiro, vamos listar as câmeras disponíveis
          Html5Qrcode.getCameras().then(devices => {
            console.log('📷 Câmeras disponíveis:', devices);
            
            if (devices && devices.length > 0) {
              // Preferir câmera traseira se disponível
              const cameraId = devices.length > 1 ? devices[1].id : devices[0].id;
              console.log('📷 Usando câmera:', cameraId);
              
              // Iniciar com ID da câmera específica
              html5QrCodeRef.current!.start(
                cameraId,
                {
                  fps: 10,
                  qrbox: 250, // Tamanho fixo de 250x250px para garantir que a caixa apareça
                  aspectRatio: 1.777778, // 16:9
                  disableFlip: false // Permite espelhar a imagem
                },
                (decodedText) => {
                  // Sucesso ao ler QR Code
                  console.log('📱 QR Code lido com sucesso:', decodedText);
                  if (html5QrCodeRef.current) {
                    // Verificar se o scanner está rodando antes de tentar parar
                    const state = html5QrCodeRef.current.getState();
                    if (state === 2) { // 2 = SCANNING (scanner está rodando)
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
                    } else {
                      // Se não estiver rodando, apenas atualiza o estado
                      setShowQrReader(false);
                      setCartao(decodedText);
                      console.log('🔍 QR Code processado, executando busca automática...');
                      setTimeout(() => {
                        buscarAssociado(decodedText);
                      }, 100);
                    }
                  }
                },
                (errorMessage) => {
                  // Erro ou QR não encontrado durante a varredura
                  // Isso é normal e acontece continuamente até encontrar um QR Code
                  // Não precisa logar para não poluir o console
                }
              ).then(() => {
                console.log('✅ Scanner QR Code iniciado com sucesso');
                setQrReaderLoading(false);
                
                // Forçar dimensões do vídeo (corrige bug do Html5Qrcode em mobile)
                setTimeout(() => {
                  const videoElement = document.querySelector(`#${qrCodeId} video`) as HTMLVideoElement;
                  console.log('🎥 Elemento de vídeo encontrado:', videoElement);
                  
                  if (videoElement) {
                    // Forçar dimensões do vídeo
                    videoElement.style.width = '100%';
                    videoElement.style.height = 'auto';
                    videoElement.style.maxWidth = '100%';
                    videoElement.style.display = 'block';
                    
                    console.log('✅ Dimensões do vídeo forçadas');
                    console.log('🎥 Novas dimensões:', {
                      width: videoElement.clientWidth,
                      height: videoElement.clientHeight,
                      styleWidth: videoElement.style.width,
                      styleHeight: videoElement.style.height
                    });
                  } else {
                    console.error('❌ Elemento de vídeo não encontrado');
                  }
                  
                  // Também forçar dimensões do canvas se existir
                  const canvasElement = document.querySelector(`#${qrCodeId} canvas`) as HTMLCanvasElement;
                  if (canvasElement) {
                    canvasElement.style.width = '100%';
                    canvasElement.style.height = 'auto';
                    canvasElement.style.display = 'block';
                    console.log('✅ Dimensões do canvas forçadas');
                  }
                  
                  // Verificar estado do scanner e retomar se estiver pausado
                  if (html5QrCodeRef.current) {
                    const scannerState = html5QrCodeRef.current.getState();
                    console.log('📊 Estado do scanner:', scannerState);
                    console.log('📊 Estados possíveis: 0=NOT_STARTED, 1=UNKNOWN, 2=SCANNING, 3=PAUSED');
                    
                    // Se não estiver em SCANNING (2), tentar retomar
                    if (scannerState === 3) { // PAUSED
                      console.log('⚠️ Scanner está pausado (estado 3), tentando retomar...');
                      try {
                        html5QrCodeRef.current.resume();
                        console.log('✅ Scanner retomado com sucesso');
                      } catch (err) {
                        console.error('❌ Erro ao retomar scanner:', err);
                      }
                    } else if (scannerState !== 2) {
                      console.warn(`⚠️ Scanner em estado inesperado: ${scannerState} (esperado: 2=SCANNING)`);
                    } else {
                      console.log('✅ Scanner em estado correto: SCANNING (2)');
                    }
                  }
                  
                  // Remover mensagem "Scanner paused" se existir
                  const pausedMessage = document.querySelector(`#${qrCodeId} div[style*="text-align"]`);
                  if (pausedMessage && pausedMessage.textContent?.includes('paused')) {
                    console.log('🗑️ Removendo mensagem "Scanner paused"');
                    pausedMessage.remove();
                  }
                  
                  // Forçar visibilidade e estilo da caixa de leitura (QR box)
                  let qrShadedRegion = document.querySelector(`#${qrCodeId} div[style*="position: absolute"]`) as HTMLDivElement;
                  
                  if (!qrShadedRegion) {
                    // QR box não foi criada pela biblioteca, vamos criar manualmente
                    console.warn('⚠️ QR box não encontrada, criando manualmente...');
                    
                    const container = document.getElementById(qrCodeId);
                    if (container && videoElement) {
                      // Criar div da caixa de leitura
                      qrShadedRegion = document.createElement('div');
                      
                      // Calcular posição centralizada
                      const boxSize = 250;
                      const videoWidth = videoElement.clientWidth;
                      const videoHeight = videoElement.clientHeight;
                      const left = (videoWidth - boxSize) / 2;
                      const top = (videoHeight - boxSize) / 2;
                      
                      // Estilizar a caixa
                      qrShadedRegion.style.position = 'absolute';
                      qrShadedRegion.style.width = `${boxSize}px`;
                      qrShadedRegion.style.height = `${boxSize}px`;
                      qrShadedRegion.style.left = `${left}px`;
                      qrShadedRegion.style.top = `${top}px`;
                      qrShadedRegion.style.border = '4px solid #00ff00';
                      qrShadedRegion.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.5)';
                      qrShadedRegion.style.borderRadius = '12px';
                      qrShadedRegion.style.zIndex = '1000';
                      qrShadedRegion.style.pointerEvents = 'none';
                      
                      // Adicionar ao container
                      container.style.position = 'relative';
                      container.appendChild(qrShadedRegion);
                      
                      console.log('✅ QR box criada manualmente:', {
                        width: boxSize,
                        height: boxSize,
                        left: left,
                        top: top,
                        videoWidth: videoWidth,
                        videoHeight: videoHeight
                      });
                    }
                  } else {
                    // QR box existe, apenas estilizar
                    qrShadedRegion.style.display = 'block';
                    qrShadedRegion.style.visibility = 'visible';
                    qrShadedRegion.style.border = '4px solid #00ff00';
                    qrShadedRegion.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.5)';
                    qrShadedRegion.style.borderRadius = '12px';
                    qrShadedRegion.style.zIndex = '1000';
                    console.log('✅ QR box encontrada e estilizada');
                  }
                  
                  // Listar todos os elementos criados pelo Html5Qrcode
                  const allElements = document.querySelectorAll(`#${qrCodeId} *`);
                  console.log('📋 Elementos criados pelo scanner:', allElements.length);
                  allElements.forEach((el, index) => {
                    console.log(`  ${index}: ${el.tagName} - display: ${window.getComputedStyle(el).display}, visibility: ${window.getComputedStyle(el).visibility}`);
                  });
                }, 500);
              }).catch(err => {
                console.error("❌ Erro ao iniciar o scanner:", err);
                console.error("❌ Detalhes do erro:", JSON.stringify(err));
                setQrReaderLoading(false);
                closeAlert();
                error('Erro na Câmera', `Não foi possível acessar a câmera. ${err.message || 'Verifique as permissões.'}`);
                setShowQrReader(false);
              });
            } else {
              console.error("❌ Nenhuma câmera encontrada");
              setQrReaderLoading(false);
              closeAlert();
              error('Erro', 'Nenhuma câmera foi encontrada no dispositivo.');
              setShowQrReader(false);
            }
          }).catch(err => {
            console.error("❌ Erro ao listar câmeras:", err);
            console.error("❌ Detalhes do erro:", JSON.stringify(err));
            setQrReaderLoading(false);
            closeAlert();
            error('Erro', `Erro ao acessar câmeras: ${err.message || 'Permissão negada'}`);
            setShowQrReader(false);
          });
        } catch (err: any) {
          console.error("❌ Erro ao criar scanner:", err);
          console.error("❌ Detalhes do erro:", JSON.stringify(err));
          setQrReaderLoading(false);
          closeAlert();
          error('Erro', `Erro ao inicializar: ${err.message || 'Erro desconhecido'}`);
          setShowQrReader(false);
        }
      }, 100); // Delay de 100ms para garantir que o modal está renderizado
    }
  }, [showQrReader, error, closeAlert]);

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
            
            // Configurar número máximo de parcelas baseado nos dados do convênio
            if (dadosConvenio.parcelas && dadosConvenio.parcelas > 0) {
              setMaxParcelas(dadosConvenio.parcelas);
              console.log('📊 Número máximo de parcelas definido pelo convênio:', dadosConvenio.parcelas);
            } else {
              console.log('📊 Usando número padrão de parcelas (12)');
            }
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
          
          // Configurar número máximo de parcelas baseado nos dados do convênio
          if (data.data.parcelas && data.data.parcelas > 0) {
            setMaxParcelas(data.data.parcelas);
            console.log('📊 Número máximo de parcelas definido pelo convênio (API):', data.data.parcelas);
          } else {
            console.log('📊 Usando número padrão de parcelas (12) - API');
          }
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

  const handleSenhaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Se o usuário está apagando (backspace), remover último caractere
    if (inputValue.length < senhaVisual.length) {
      const newSenha = senha.slice(0, -1);
      setSenha(newSenha);
      setSenhaVisual('•'.repeat(newSenha.length));
      return;
    }
    
    // Se o usuário está digitando, pegar apenas o último caractere digitado
    const lastChar = inputValue.slice(-1);
    if (/\d/.test(lastChar)) { // Apenas números
      const newSenha = senha + lastChar;
      setSenha(newSenha);
      setSenhaVisual('•'.repeat(newSenha.length));
    }
  };

  const handleLerQRCode = () => {
    setShowQrReader(true);
  };

  const handleCloseQrReader = () => {
    if (html5QrCodeRef.current) {
      // Verificar se o scanner está rodando antes de tentar parar
      const state = html5QrCodeRef.current.getState();
      if (state === 2) { // 2 = SCANNING (scanner está rodando)
        html5QrCodeRef.current.stop().catch(error => {
          console.error("Erro ao parar o scanner:", error);
        });
      }
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
                ref={cartaoInputRef}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={cartao}
                onChange={(e) => setCartao(e.target.value)}
                onKeyDown={handleCartaoKeyDown}
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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-lg max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Ler QR Code</h3>
                  <button
                    onClick={handleCloseQrReader}
                    className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                  >
                    ✕
                  </button>
                </div>
                {qrReaderLoading && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <FaSpinner className="animate-spin text-blue-600 text-4xl mb-4" />
                    <p className="text-gray-600">Iniciando câmera...</p>
                    <p className="text-sm text-gray-500 mt-2">Aguarde a permissão da câmera</p>
                  </div>
                )}
                {!qrReaderLoading && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 text-center">
                      📱 Posicione o QR Code dentro da caixa verde
                    </p>
                    <p className="text-xs text-blue-600 text-center mt-1">
                      A leitura é automática
                    </p>
                  </div>
                )}
                <div 
                  ref={qrReaderRef} 
                  className="w-full"
                  style={{ 
                    display: qrReaderLoading ? 'none' : 'block',
                    minHeight: '300px',
                    position: 'relative'
                  }}
                ></div>
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
                  <span className="text-xs text-gray-500 uppercase tracking-wide">CPF</span>
                  <div className="font-semibold text-gray-800">{associado.cpf || 'Não informado'}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-green-100">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Empregador</span>
                  <div className="font-semibold text-gray-800">{associado.nome_empregador || `ID: ${associado.empregador}`}</div>
                </div>
                {(associado.nome_divisao || associado.id_divisao) && (
                  <div className="bg-white p-3 rounded-lg border border-green-100">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Divisão</span>
                    <div className="font-semibold text-gray-800">{associado.nome_divisao || `Divisão ${associado.id_divisao}`}</div>
                  </div>
                )}
                {mesCorrente && (
                  <div className="bg-white p-3 rounded-lg border border-green-100">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Mês Desconto</span>
                    <div className="font-semibold text-blue-600">{mesCorrente}</div>
                  </div>
                )}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200 shadow-md">
                  <span className="text-sm text-green-700 uppercase tracking-wide font-bold">Saldo Disponível</span>
                  <div className="font-bold text-green-600 text-2xl mt-1">{associado.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                </div>
              </div>
            </div>
          )}

          {/* Formulário de Lançamento */}
          {associado && associado.saldo > 0 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Valor do Lançamento
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
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
                <div className={`p-4 rounded-lg border ${
                  valorParcela > associado.saldo 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <label className={`block text-sm font-medium mb-2 ${
                    valorParcela > associado.saldo 
                      ? 'text-red-800' 
                      : 'text-blue-800'
                  }`}>
                    Valor por Parcela
                  </label>
                  <div className={`text-2xl font-bold ${
                    valorParcela > associado.saldo 
                      ? 'text-red-600' 
                      : 'text-blue-600'
                  }`}>
                    {valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  {valorParcela > associado.saldo && (
                    <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 font-bold">⚠️</span>
                        <span className="text-red-800 font-semibold text-sm">
                          Valor da parcela excede o saldo disponível!
                        </span>
                      </div>
                      <div className="text-red-700 text-xs mt-1">
                        Saldo disponível: {associado.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!(valorParcela > associado.saldo) && (
                <>
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
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={senhaVisual}
                      onChange={handleSenhaChange}
                      placeholder="Digite a senha"
                      autoComplete="off"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </>
              )}

              {!(valorParcela > associado.saldo) && (
                <button
                  onClick={autorizarPagamento}
                  disabled={loading || pagamentoProcessado || !valor || !senha || !associado || associado.saldo <= 0 || (valor ? parseFloat(valor.replace(/[^\d,]/g, '').replace(',', '.')) > associado.saldo : false)}
                  className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-bold text-lg transition-all transform hover:scale-[1.02] disabled:hover:scale-100 shadow-lg"
                >
                  {loading ? <FaSpinner className="animate-spin text-xl" /> : <FaCheckCircle className="text-xl" />}
                  {pagamentoProcessado ? 'Pagamento Processado' : loading ? 'Processando...' : 'Autorizar Pagamento'}
                </button>
              )}
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
                      closeAlert();
                      success('Pagamento Processado!', 'O pagamento foi processado com sucesso.');
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

      {/* Componente de Alerta Moderno */}
      <ModernAlert
        isOpen={alert.isOpen}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={closeAlert}
        autoClose={alert.autoClose}
        duration={alert.duration}
      />
    </div>
  );
}
