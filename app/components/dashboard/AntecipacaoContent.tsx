'use client';

import { useState, useEffect, ChangeEvent, FormEvent, useCallback, useRef } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FaSpinner, FaClockRotateLeft, FaArrowRotateLeft, FaHourglassHalf } from 'react-icons/fa6';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

interface AntecipacaoProps {
  cartao?: string;
}

interface AssociadoData {
  matricula: string;
  empregador: string;
  nome: string;
  limite: string;
  email: string;
  cel: string;
  cpf: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  id?: number;
  id_divisao?: number;
}

interface SaldoData {
  saldo: number;
  limite: number;
  total: number;
  mesCorrente: string;
  porcentagem?: number;
}

interface SolicitacaoAntecipacao {
  id: string;
  matricula: string;
  data_solicitacao: string;
  valor_solicitado: string;
  taxa: string;
  valor_descontar: string;
  mes_corrente: string;
  chave_pix: string;
  status: string | boolean | null;
}

// Cache global para controlar submissões em andamento
const submissoesEmAndamento = new Map<string, boolean>();
const ultimaSubmissao = new Map<string, number>();

// Map global para rastrear execuções por requestId (proteção contra React StrictMode)
const execucoesPorRequestId = new Map<string, number>();

// Função para salvar proteção no localStorage (funciona em PWA e navegador)
const salvarProtecaoLocalStorage = (chave: string, timestamp: number) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const protecoes = JSON.parse(localStorage.getItem('protecaoAntecipacao') || '{}');
      protecoes[chave] = timestamp;
      localStorage.setItem('protecaoAntecipacao', JSON.stringify(protecoes));
    }
  } catch (error) {
    console.warn('Erro ao salvar proteção no localStorage:', error);
  }
};

// Função para verificar proteção no localStorage
const verificarProtecaoLocalStorage = (chave: string, tempoLimite: number): boolean => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const protecoes = JSON.parse(localStorage.getItem('protecaoAntecipacao') || '{}');
      const ultimoTimestamp = protecoes[chave];
      if (ultimoTimestamp && (Date.now() - ultimoTimestamp) < tempoLimite) {
        return true; // Ainda está protegido
      }
    }
  } catch (error) {
    console.warn('Erro ao verificar proteção no localStorage:', error);
  }
  return false; // Não está protegido
};

// Função para limpar proteções antigas do localStorage
const limparProtecoesAntigas = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const protecoes = JSON.parse(localStorage.getItem('protecaoAntecipacao') || '{}');
      const agora = Date.now();
      const protecoesLimpas: {[key: string]: number} = {};
      
      // Manter apenas proteções dos últimos 5 minutos
      Object.entries(protecoes).forEach(([chave, timestamp]) => {
        if (agora - (timestamp as number) < 300000) { // 5 minutos
          protecoesLimpas[chave] = timestamp as number;
        }
      });
      
      localStorage.setItem('protecaoAntecipacao', JSON.stringify(protecoesLimpas));
    }
  } catch (error) {
    console.warn('Erro ao limpar proteções antigas:', error);
  }
};

export default function AntecipacaoContent({ cartao: propCartao }: AntecipacaoProps) {
  const { data: session } = useSession({ required: false });
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [associadoData, setAssociadoData] = useState<AssociadoData | null>(null);
  const [saldoData, setSaldoData] = useState<SaldoData | null>(null);
  const [cartao, setCartao] = useState('');
  const [valorSolicitado, setValorSolicitado] = useState("");
  const [valorFormatado, setValorFormatado] = useState("");
  const [taxa, setTaxa] = useState(0);
  const [valorTotal, setValorTotal] = useState(0);
  const [chavePix, setChavePix] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [solicitado, setSolicitado] = useState(false);
  const [solicitacaoData, setSolicitacaoData] = useState("");
  const [ultimasSolicitacoes, setUltimasSolicitacoes] = useState<SolicitacaoAntecipacao[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [mostrarTodasSolicitacoes, setMostrarTodasSolicitacoes] = useState(false);
  
  // Valores para exibição após a solicitação ser enviada
  const [valorConfirmado, setValorConfirmado] = useState("");
  const [taxaConfirmada, setTaxaConfirmada] = useState(0);
  const [totalConfirmado, setTotalConfirmado] = useState(0);
  
  // Estados para controle mobile
  const [isMobile, setIsMobile] = useState(false);
  const [ultimoClickMobile, setUltimoClickMobile] = useState<number | null>(null);
  const [bloqueioAtivo, setBloqueioAtivo] = useState(false);
  const [botaoDesabilitadoPermanente, setBotaoDesabilitadoPermanente] = useState(false);
  // Proteção universal - aplicada a TODOS os dispositivos
  const [protecaoUniversal, setProtecaoUniversal] = useState(false);
  
  // Sistema de logs visível no celular
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [mostrarDebug, setMostrarDebug] = useState(true); // Sempre mostrar no mobile

  // Função para adicionar logs visíveis no debug
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setDebugLogs(prev => [...prev.slice(-19), logMessage]); // Manter últimos 20 logs
    console.log(logMessage);
  };

  // Função segura para verificar se uma string está em um array
  const isStringInArray = (str: any, arr: string[]): boolean => {
    try {
      if (typeof str !== 'string' || !str) return false;
      if (!Array.isArray(arr)) return false;
      return arr.includes(str.toLowerCase().trim());
    } catch (error) {
      console.warn('⚠️ Erro em isStringInArray:', error, { str, arr });
      return false;
    }
  };

  // Detectar dispositivo móvel e limpar cache global
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      
      const isMobileDevice = isMobileUA || (isTouchDevice && isSmallScreen);
      setIsMobile(isMobileDevice);
      
      addDebugLog(`📱 Dispositivo: ${isMobileDevice ? 'MOBILE' : 'DESKTOP'} - UA:${isMobileUA} Touch:${isTouchDevice} Screen:${window.innerWidth}px`);
    };
    
    // LIMPEZA CRÍTICA: Limpar cache global ao inicializar componente
    const cacheAnterior = {
      submissoes: submissoesEmAndamento.size,
      ultimasReq: ultimaSubmissao.size
    };
    
    submissoesEmAndamento.clear();
    ultimaSubmissao.clear();
    
    addDebugLog(`🧹 CACHE LIMPO - Anterior: ${cacheAnterior.submissoes} submissões, ${cacheAnterior.ultimasReq} rate limits`);
    
    checkMobile();
  }, []);

  // Verificar se há saldo disponível para antecipação
  const temSaldoDisponivel = (): boolean => {
    if (!saldoData) {
      return false;
    }

    // Verificar se o saldo disponível é maior que zero
    const saldoDisponivel = saldoData.saldo > 0;

    console.log('🔍 Verificando saldo disponível:', {
      saldoAtual: saldoData.saldo,
      limite: saldoData.limite,
      total: saldoData.total,
      mesCorrente: saldoData.mesCorrente,
      temSaldoDisponivel: saldoDisponivel
    });

    return saldoDisponivel;
  };

  // Função para buscar o mês corrente usando id_divisao do associado
  const fetchMesCorrente = useCallback(async (idDivisao: number) => {
    try {
      if (!idDivisao) {
        console.error('ID divisão não fornecido para buscar mês corrente');
        return null;
      }

      console.log('🔍 Buscando mês corrente para divisão:', idDivisao);
      
      // Chamar API correta com id_divisao como parâmetro GET
      const response = await axios.get(`/api/convenio/mes-corrente?divisao=${idDivisao}&t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log('📥 Resposta da API de mês corrente:', response.data);
      
      // Verificar se a API retornou erro
      if (response.data && !response.data.success) {
        console.error('❌ Erro da API de mês corrente:', response.data.error || response.data.message);
        throw new Error(response.data.error || response.data.message || 'Erro ao buscar mês corrente');
      }

      // Verificar se a resposta contém dados válidos
      if (response.data.success && response.data.data && response.data.data.abreviacao) {
        const mesAtual = response.data.data.abreviacao;
        const porcentagem = parseFloat(response.data.data.porcentagem || '0');
        console.log('✅ Mês corrente obtido da API:', mesAtual, 'porcentagem:', porcentagem);
        return { mesAtual, porcentagem };
      } else {
        console.error('❌ Resposta inválida da API de mês corrente:', response.data);
        throw new Error('Não foi possível obter o mês corrente da API');
      }
    } catch (err) {
      console.error('❌ Erro ao buscar mês corrente:', err);
      throw err;
    }
  }, []);

  // Função para buscar os dados da conta e calcular o saldo
  const fetchConta = useCallback(async (matricula: string, empregador: string, mes: string, id?: number, divisao?: number) => {
    try {
      // Validar todos os parâmetros obrigatórios
      if (!matricula || !empregador || !mes || !id || !divisao) {
        throw new Error('Todos os parâmetros são obrigatórios: matricula, empregador, mes, id, divisao');
      }

      console.log('📊 Enviando parâmetros para /api/conta:', { matricula, empregador, mes, id, divisao });

      // Buscar os dados da conta com todos os parâmetros obrigatórios
      const formDataConta = new FormData();
      formDataConta.append('matricula', matricula);
      formDataConta.append('empregador', empregador.toString());
      formDataConta.append('mes', mes);
      formDataConta.append('id', id.toString());
      formDataConta.append('divisao', divisao.toString());
      
      const response = await axios.post('/api/conta', formDataConta, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log('📥 Resposta da API conta:', response.data);
      
      // Verificar se a API retornou erro
      if (response.data && response.data.error) {
        console.error('❌ Erro da API conta:', response.data.error);
        throw new Error(response.data.error || 'Erro ao consultar conta');
      }
      
      if (Array.isArray(response.data)) {
        // Calcular o total das contas do mês corrente
        let total = 0;
        for (const item of response.data) {
          total += parseFloat(item.valor || '0');
        }
        
        console.log('💰 Total calculado das contas do mês:', total);
        return total;
      } else {
        console.warn('⚠️ Nenhum dado de conta encontrado, assumindo total = 0');
        return 0; // Se não há dados, assumir que não há gastos
      }
    } catch (error) {
      console.error('❌ Erro ao buscar dados da conta:', error);
      throw error;
    }
  }, []);

  // Função para buscar dados do associado uma única vez
  const fetchAssociado = useCallback(async (cartaoParam: string) => {
    try {
      const formDataAssociado = new FormData();
      formDataAssociado.append('cartao', cartaoParam.trim());
      
      const associadoResponse = await axios.post('/api/localiza-associado', formDataAssociado, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (!associadoResponse.data) {
        throw new Error('Dados do associado não encontrados');
      }

      return associadoResponse.data;
    } catch (error) {
      console.error('Erro ao buscar dados do associado:', error);
      throw error;
    }
  }, []);

  // Função principal para carregar todos os dados
  const loadSaldoData = useCallback(async () => {
    if (!cartao || !associadoData) {
      return;
    }
    
    try {
      // NÃO alterar loading aqui para evitar conflito com submissão de antecipação
      setErro("");
      
      // 1. Validar se temos id_divisao do associado
      if (!associadoData.id_divisao) {
        throw new Error('ID divisão do associado não disponível');
      }

      // 2. Buscar mês corrente usando id_divisao do associado
      const { mesAtual, porcentagem } = await fetchMesCorrente(associadoData.id_divisao) || { mesAtual: null, porcentagem: 0 };
      
      if (!mesAtual) {
        throw new Error('Mês corrente não disponível');
      }
      
      // 3. Buscar dados da conta com os dados do associado que já temos
      const total = await fetchConta(
        associadoData.matricula, 
        associadoData.empregador, 
        mesAtual,
        associadoData.id,
        associadoData.id_divisao
      );
      
      // 4. Calcular saldo
      const limite = parseFloat(associadoData.limite || '0');
      const saldo = limite - total;
      
      // 5. Atualizar o estado
      setSaldoData({
        saldo,
        limite,
        total,
        mesCorrente: mesAtual,
        porcentagem
      });

      console.log('✅ SALDO RECALCULADO PARA O MÊS CORRENTE:', {
        mesCorrente: mesAtual,
        limite: limite,
        totalGastoNoMes: total,
        saldoDisponivel: saldo,
        porcentagem: porcentagem,
        idDivisao: associadoData.id_divisao
      });
      
    } catch (error) {
      console.error('Erro ao carregar dados de saldo:', error);
      if (error instanceof Error) {
        setErro(`Não foi possível carregar seus dados: ${error.message}`);
      } else {
        setErro('Não foi possível carregar seus dados. Tente novamente.');
      }
    } finally {
      // Só alterar loading se não estivermos em uma submissão ativa
      if (!submissoesEmAndamento.size) {
        setLoading(false);
      }
      setIsInitialLoading(false);
    }
  }, [cartao, associadoData, fetchMesCorrente, fetchConta]);

  // Função para buscar o histórico de solicitações
  const fetchHistoricoSolicitacoes = useCallback(async () => {
    if (!associadoData?.matricula) return;
    
    try {
      setLoadingHistorico(true);
      
      const formData = new FormData();
      formData.append('matricula', associadoData.matricula);
      formData.append('empregador', associadoData.empregador.toString());
      
      const response = await axios.post('/api/historico-antecipacao', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (Array.isArray(response.data)) {
        setUltimasSolicitacoes(response.data);
      } else {
        console.error('Formato de resposta inválido para histórico de solicitações');
        setUltimasSolicitacoes([]);
      }
    } catch (error) {
      console.error('Erro ao buscar histórico de solicitações:', error);
      setUltimasSolicitacoes([]);
    } finally {
      setLoadingHistorico(false);
    }
  }, [associadoData]);

  // Carregar o cartão do usuário - apenas uma vez
  useEffect(() => {
    // Priorizar o cartão passado como prop
    const cartaoAtual = propCartao || session?.user?.cartao || '';
    
    if (cartaoAtual) {
      setCartao(cartaoAtual);
    } else if (typeof window !== 'undefined') {
      // Tentar obter do localStorage se não foi fornecido de outra forma
      const storedUser = localStorage.getItem('qrcred_user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setCartao(parsedUser.cartao || '');
        } catch (e) {
          console.error('Erro ao ler dados do usuário do localStorage', e);
        }
      }
    }
  }, [propCartao, session]);

  // Carregar o associado quando tiver o cartão - apenas uma vez
  useEffect(() => {
    if (cartao && !associadoData) {
      const getAssociado = async () => {
        try {
          setIsInitialLoading(true);
          const data = await fetchAssociado(cartao);
          setAssociadoData(data);
        } catch (error) {
          console.error('Erro ao buscar dados do associado:', error);
          setErro('Não foi possível carregar seus dados. Tente novamente.');
          setIsInitialLoading(false);
        }
      };
      
      getAssociado();
    }
  }, [cartao, fetchAssociado, associadoData]);

  // Carregar dados de saldo e histórico quando o associado estiver disponível
  useEffect(() => {
    if (associadoData) {
      if (isInitialLoading) {
        loadSaldoData();
      }
      fetchHistoricoSolicitacoes();
    }
  }, [associadoData, loadSaldoData, isInitialLoading, fetchHistoricoSolicitacoes]);

  // Função para forçar atualização do saldo (útil quando mês corrente muda)
  const atualizarSaldo = useCallback(async () => {
    console.log('🔄 Forçando atualização do saldo para verificar mudança de mês...');
    await loadSaldoData();
  }, [loadSaldoData]);

  // Formatar o valor como moeda brasileira
  const formatarValor = (valor: number): string => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  // Manipular mudança no input de valor
  const handleValorChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Limpar qualquer formatação
    const valor = e.target.value.replace(/\D/g, '');
    
    // Converter para número
    const valorNumerico = parseFloat(valor) / 100;
    setValorSolicitado(valor);
    
    // Validar se o valor é válido
    if (valorNumerico > (saldoData?.saldo || 0)) {
      setErro(`Valor indisponível. Saldo restante: ${formatarValor(saldoData?.saldo || 0)}`);
      setValorFormatado("");
      setTaxa(0);
      setValorTotal(0);
    } else if (valorNumerico > 0) {
      setErro("");
      // Formatar o valor para exibição
      setValorFormatado(formatarValor(valorNumerico));
      
      // Taxa fixa de R$ 22,50
      const taxaCalculada = 22.50;
      setTaxa(taxaCalculada);
      
      // Calcular valor total
      setValorTotal(valorNumerico + taxaCalculada);
    } else {
      setErro("");
      setValorFormatado("");
      setTaxa(0);
      setValorTotal(0);
    }
  };

  // Refs para controle de execução única (proteção contra React StrictMode)
  const isSubmittingRef = useRef(false);
  const lastSubmissionRef = useRef<number>(0);
  const submissionIdRef = useRef<string>('');

  // Manipular envio do formulário
  const handleSubmit = async (e?: any) => {
    if (e) e.preventDefault();
    
    // Proteção específica para mobile - evitar cliques duplos rápidos
    const agora = Date.now();
    const chaveProtecao = `${associadoData?.matricula}_${valorSolicitado}_${chavePix}`;
    
    // PROTEÇÃO CRÍTICA 1: Verificar se já está processando (primeira linha de defesa)
    if (loading || isSubmittingRef.current) {
      console.log('🚫 Já está processando, ignorando clique');
      return;
    }
    
    // PROTEÇÃO CRÍTICA 2: Verificar se houve submissão muito recente (menos de 3 segundos)
    if (ultimaSubmissao.has(chaveProtecao)) {
      const ultimoTempo = ultimaSubmissao.get(chaveProtecao)!;
      if (agora - ultimoTempo < 3000) {
        console.log('🚫 Submissão muito recente, ignorando');
        return;
      }
    }
    
    // PROTEÇÃO CRÍTICA 3: Verificar se já existe submissão em andamento para esta combinação
    if (submissoesEmAndamento.has(chaveProtecao)) {
      console.log('🚫 Submissão já em andamento para esta combinação');
      return;
    }
    
    // PROTEÇÃO CRÍTICA 4: Verificar se a mesma submissão já foi iniciada recentemente (proteção contra React StrictMode)
    if (lastSubmissionRef.current > 0 && (agora - lastSubmissionRef.current) < 100) {
      console.log('🚫 Submissão duplicada detectada (React StrictMode), ignorando');
      return;
    }
    
    // MARCAR TODAS AS PROTEÇÕES DE UMA VEZ (ATÔMICO)
    isSubmittingRef.current = true;
    lastSubmissionRef.current = agora;
    setLoading(true);
    submissoesEmAndamento.set(chaveProtecao, true);
    ultimaSubmissao.set(chaveProtecao, agora);
    
    // Validações básicas APÓS marcar proteções
    if (!valorSolicitado || parseFloat(valorSolicitado) / 100 <= 0) {
      setErro("Digite o valor desejado");
      setLoading(false);
      isSubmittingRef.current = false;
      lastSubmissionRef.current = 0;
      submissoesEmAndamento.delete(chaveProtecao);
      return;
    }
    
    if (!chavePix) {
      setErro("Digite a chave PIX para receber o valor");
      setLoading(false);
      isSubmittingRef.current = false;
      lastSubmissionRef.current = 0;
      submissoesEmAndamento.delete(chaveProtecao);
      return;
    }

    if (!senha) {
      setErro("Digite sua senha para confirmar");
      setLoading(false);
      isSubmittingRef.current = false;
      lastSubmissionRef.current = 0;
      submissoesEmAndamento.delete(chaveProtecao);
      return;
    }

    // Gerar ID único para esta requisição específica
    const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // PROTEÇÃO CRÍTICA 5: Verificar se este requestId já foi usado recentemente (proteção contra React StrictMode)
    if (execucoesPorRequestId.has(requestId)) {
      console.log(`🚫 RequestId duplicado detectado (React StrictMode), ignorando: ${requestId}`);
      return;
    }
    
    // Marcar este requestId como usado
    execucoesPorRequestId.set(requestId, agora);
    
    // Limpeza automática de requestIds antigos (mais de 30 segundos)
    Array.from(execucoesPorRequestId.entries()).forEach(([id, timestamp]) => {
      if (agora - timestamp > 30000) {
        execucoesPorRequestId.delete(id);
      }
    });
    
    addDebugLog(`🚀 [${requestId}] Iniciando submissão - Chave: ${chaveProtecao}`);
    console.log(`🚀 [${requestId}] Iniciando submissão - Chave: ${chaveProtecao}`);
    console.trace(`🔍 [${requestId}] Stack trace da submissão:`);
    setErro("");
    
    try {
      const valorNumerico = parseFloat(valorSolicitado) / 100;
      
      const payload = {
        matricula: associadoData?.matricula,
        pass: senha,
        empregador: associadoData?.empregador,
        valor_pedido: valorNumerico.toFixed(2),
        taxa: taxa.toFixed(2),
        valor_descontar: valorTotal.toFixed(2),
        mes_corrente: saldoData?.mesCorrente,
        chave_pix: chavePix,
        id: associadoData?.id,
        id_divisao: associadoData?.id_divisao,
        request_id: requestId, // Adicionar ID único
      };

      addDebugLog(`📤 [${requestId}] Enviando para API - Valor: ${payload.valor_pedido}`);
      addDebugLog(`🚀 [${requestId}] CHAMANDO API NEXT.JS /api/antecipacao/gravar`);
      console.log(`📤 [${requestId}] Enviando para API:`, {
        matricula: payload.matricula,
        valor: payload.valor_pedido,
        pass: payload.pass ? '[PRESENTE]' : '[AUSENTE]',
        request_id: requestId
      });

      const response = await fetch('/api/antecipacao/gravar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Request-ID': requestId, // Header com ID único
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      addDebugLog(`📥 [${requestId}] Resposta da API - Status: ${response.status} Success: ${data.success}`);
      addDebugLog(`✅ [${requestId}] API NEXT.JS EXECUTADA - Status: ${response.status}`);
      
      // Mostrar detalhes do erro 400 se houver debug_info
      if (response.status === 400 && data.debug_info) {
        addDebugLog(`🔍 [${requestId}] DETALHES DO ERRO 400:`);
        addDebugLog(`📋 Campo ausente: ${data.campo_ausente || 'N/A'}`);
        addDebugLog(`📊 Campos recebidos: ${data.dados_recebidos?.join(', ') || 'N/A'}`);
        if (data.debug_info.valores_recebidos) {
          Object.entries(data.debug_info.valores_recebidos).forEach(([campo, valor]) => {
            addDebugLog(`   ${campo}: ${valor}`);
          });
        }
      }
      
      // Mostrar debug_info se disponível (sucesso ou erro)
      if (data.debug_info && data.debug_info !== 'N/A') {
        addDebugLog(`🔍 [${requestId}] DEBUG INFO DISPONÍVEL:`);
        addDebugLog(`📋 Etapas: ${data.debug_info.etapas_executadas?.join(' → ') || 'N/A'}`);
        addDebugLog(`📋 PHP Request ID: ${data.debug_info.php_request_id || 'N/A'}`);
        addDebugLog(`📋 Status PHP: ${data.debug_info.php_response_status || 'N/A'}`);
      }
      
      console.log(`📥 [${requestId}] Resposta da API:`, {
        success: data.success,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        debug_info: data.debug_info || 'N/A'
      });

      if (data.success) {
        addDebugLog(`✅ [${requestId}] Sucesso confirmado`);
        console.log(`✅ [${requestId}] Sucesso confirmado`);
        // Sucesso - mostrar dados da solicitação
        setSolicitado(true);
        setValorConfirmado(formatarValor(valorNumerico));
        setTaxaConfirmada(taxa);
        setTotalConfirmado(valorTotal);
        setSolicitacaoData(new Date().toLocaleDateString('pt-BR'));
        
        // Limpar formulário
        setValorSolicitado("");
        setValorFormatado("");
        setTaxa(0);
        setValorTotal(0);
        setChavePix("");
        setSenha("");
        
        // Atualizar histórico
        fetchHistoricoSolicitacoes();
        
        // Atualizar saldo
        loadSaldoData();
      } else {
        addDebugLog(`❌ [${requestId}] Erro na API: ${data.error || 'Erro desconhecido'}`);
        addDebugLog(`🔴 [${requestId}] API RETORNOU ERRO - Status: ${response.status}`);
        console.error(`❌ [${requestId}] Erro na API:`, data);
        setErro(data.error || 'Erro ao processar solicitação');
      }
    } catch (error) {
      addDebugLog(`💥 [${requestId}] Erro de conexão: ${error}`);
      console.error('Erro na solicitação:', error);
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
      lastSubmissionRef.current = 0;
      // Liberar proteção após processamento
      submissoesEmAndamento.delete(chaveProtecao);
      execucoesPorRequestId.delete(requestId);
      addDebugLog(`🏁 [${requestId}] Submissão finalizada`);
      console.log(`🏁 Submissão finalizada - Chave: ${chaveProtecao}`);
    }
  };
  // Função para obter classes CSS baseadas no status
  const getStatusClass = (status: string | boolean | null | undefined): string => {
    try {
      // Se for booleano
      if (typeof status === 'boolean') {
        return status 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200';
      }
      
      // Se for nulo ou indefinido, retornar pendente
      if (status === null || status === undefined) {
        return 'bg-yellow-50 border-yellow-200';
      }
      
      // Se for string, verificar os valores
      if (typeof status === 'string') {
        const statusLower = status.toLowerCase();
        if (['aprovado', 'aprovada', 's', 'sim'].includes(statusLower)) {
          return 'bg-green-50 border-green-200';
        }
        
        if (['recusado', 'recusada', 'n', 'nao', 'não'].includes(statusLower)) {
          return 'bg-red-50 border-red-200';
        }
        
        if (['pendente', 'analise', 'análise'].includes(statusLower)) {
          return 'bg-yellow-50 border-yellow-200';
        }
      }
      
      // Padrão para qualquer outro valor
      return 'bg-yellow-50 border-yellow-200';
    } catch (error) {
      console.error('⚠️ Erro em getStatusClass:', error, { status });
      return 'bg-gray-50 border-gray-200';
    }
  };

  // Formatar status para exibição amigável
  const formatarStatus = (status: string | boolean | null | undefined) => {
    try {
      // Se for booleano, converter para string
      if (typeof status === 'boolean') {
        return status 
          ? <span className="text-green-600 font-medium">Aprovada</span>
          : <span className="text-red-600 font-medium">Recusada</span>;
      }
      
      // Se for nulo ou indefinido, retornar pendente
      if (status === null || status === undefined) {
        return <span className="text-yellow-600 font-medium">Pendente</span>;
      }
      
      // Se for string, verificar os valores
      if (typeof status === 'string') {
        const statusLower = status.toLowerCase();
        if (['aprovado', 'aprovada', 's', 'sim'].includes(statusLower)) {
          return <span className="text-green-600 font-medium">Aprovada</span>;
        }
        
        if (['recusado', 'recusada', 'n', 'nao', 'não'].includes(statusLower)) {
          return <span className="text-red-600 font-medium">Recusada</span>;
        }
        
        if (['pendente', 'analise', 'análise'].includes(statusLower)) {
          return <span className="text-yellow-600 font-medium">Em análise</span>;
        }
      }
      
      // Padrão para qualquer outro valor
      return <span className="text-yellow-600 font-medium">Pendente</span>;
    } catch (error) {
      console.error('⚠️ Erro em formatarStatus:', error, { status });
      return <span className="text-yellow-600 font-medium">Pendente</span>;
    }
  };

  if (isInitialLoading && !associadoData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-6 text-gray-800">Solicitação de Antecipação</h2>
        
        {/* Saldo Disponível */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-medium text-gray-600">Saldo Disponível:</h3>
            <button 
              onClick={() => atualizarSaldo()}
              className="bg-blue-600 hover:bg-blue-700 p-2 rounded text-white transition-colors"
              title="Atualizar saldo e verificar mês corrente"
              disabled={loading}
              type="button"
            >
              {loading ? <FaSpinner className="animate-spin" /> : <FaArrowRotateLeft />}
            </button>
          </div>
          {erro && !valorSolicitado ? (
            <div className="text-red-500 mt-2">{erro}</div>
          ) : (
            <p className="text-2xl font-bold text-green-600">
              {saldoData ? formatarValor(saldoData.saldo) : 'Carregando...'}
            </p>
          )}
          {saldoData?.mesCorrente && (
            <p className="text-sm text-gray-500 mt-1">
              Referente ao mês: {saldoData.mesCorrente}
            </p>
          )}
        </div>
        
        {/* Status de Solicitações */}
        {ultimasSolicitacoes.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-md font-medium text-gray-700 flex items-center">
                <FaClockRotateLeft className="mr-1" /> Status de Solicitações
              </h3>
              <button 
                onClick={() => fetchHistoricoSolicitacoes()}
                className="text-blue-600 p-1 rounded hover:bg-blue-50"
                title="Atualizar histórico"
                disabled={loadingHistorico}
                type="button"
              >
                {loadingHistorico ? <FaSpinner className="animate-spin" /> : <FaArrowRotateLeft />}
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              {loadingHistorico ? (
                <div className="flex justify-center py-4">
                  <FaSpinner className="animate-spin text-blue-600" />
                </div>
              ) : ultimasSolicitacoes.length === 0 ? (
                <p className="text-gray-500 text-center py-2">Nenhuma solicitação encontrada</p>
              ) : (
                <div className="space-y-3">
                  {/* Solicitações Mais Recentes */}
                  {(mostrarTodasSolicitacoes ? ultimasSolicitacoes : ultimasSolicitacoes.slice(0, 3)).map((solicitacao) => (
                    <div 
                      key={solicitacao.id} 
                      className={`p-3 rounded-lg border ${getStatusClass(solicitacao.status)}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">
                            {Number(solicitacao.valor_solicitado).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </div>
                          <div className="text-xs text-gray-600">
                            {format(new Date(solicitacao.data_solicitacao), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        </div>
                        <div className="font-medium">
                          {formatarStatus(solicitacao.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {ultimasSolicitacoes.length > 3 && (
                    <button
                      onClick={() => setMostrarTodasSolicitacoes(!mostrarTodasSolicitacoes)}
                      className="text-blue-600 text-sm hover:underline w-full text-center py-1"
                      type="button"
                    >
                      {mostrarTodasSolicitacoes ? 'Ver menos solicitações' : 'Ver mais solicitações'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}



        {solicitado ? (
          /* Resumo da Solicitação */
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Solicitação Enviada</h3>
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-medium">Valor: </span>
                {valorConfirmado}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Taxa: </span>
                {formatarValor(taxaConfirmada)}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Total a Descontar: </span>
                {formatarValor(totalConfirmado)}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Solicitado em: </span>
                {solicitacaoData}
              </p>
            </div>
            <div className="mt-4 flex flex-col space-y-2">
              <p className="text-blue-600 text-sm">
                Sua solicitação está em análise. Em breve você receberá o resultado.
              </p>
              <button
                onClick={() => setSolicitado(false)}
                className="mt-2 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                type="button"
              >
                Nova Solicitação
              </button>
            </div>
          </div>
        ) : !isInitialLoading && !temSaldoDisponivel() ? (
          /* Mensagem quando não há saldo disponível */
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
            <div className="flex items-center justify-center mb-4">
              <FaTimesCircle className="text-red-500 text-2xl mr-2" />
              <h3 className="text-lg font-semibold text-red-800">
                Saldo Insuficiente
              </h3>
            </div>
            <p className="text-red-700 mb-4">
              Você não possui saldo disponível para antecipação no mês <strong>{saldoData?.mesCorrente}</strong>.
            </p>
            <p className="text-sm text-red-600">
              💰 <strong>Saldo atual:</strong> {saldoData ? formatarValor(saldoData.saldo) : 'R$ 0,00'}<br/>
              📊 Para solicitar antecipação, é necessário ter saldo positivo disponível.
            </p>
            
            <div className="mt-4 p-4 bg-white border border-red-200 rounded-lg">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Limite:</span>
                  <span className="font-medium">
                    {saldoData ? formatarValor(saldoData.limite) : 'R$ 0,00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Utilizado:</span>
                  <span className="font-medium">
                    {saldoData ? formatarValor(saldoData.total) : 'R$ 0,00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Disponível:</span>
                  <span className="font-medium">
                    {saldoData ? formatarValor(saldoData.saldo) : 'R$ 0,00'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Formulário de Solicitação */
          <form onSubmit={(e) => e.preventDefault()}>
            {/* Campo de Valor */}
            <div className="mb-4">
              <label htmlFor="valor" className="block text-sm font-medium text-gray-700 mb-1">
                Valor Desejado
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]+([,.][0-9]{1,2})?"
                id="valor"
                placeholder="R$ 0,00"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                onChange={handleValorChange}
                value={valorSolicitado ? (parseFloat(valorSolicitado) / 100).toFixed(2).replace('.', ',') : ''}
                disabled={loading}
              />
              {valorFormatado && (
                <div className="mt-2 text-sm text-gray-600">
                  Valor: {valorFormatado}
                </div>
              )}
            </div>
            
            {/* Simulação de Taxa e Valor Total */}
            {valorFormatado && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">Simulação:</h4>
                <div className="grid grid-cols-2 gap-2">
                  <p className="text-sm text-gray-600">Taxas :</p>
                  <p className="text-sm text-gray-800 font-medium">{formatarValor(taxa)}</p>
                  <p className="text-sm text-gray-600">Total a Descontar:</p>
                  <p className="text-sm text-gray-800 font-medium">{formatarValor(valorTotal)}</p>
                </div>
              </div>
            )}
            
            {/* Chave PIX */}
            <div className="mb-4">
              <label htmlFor="chave-pix" className="block text-sm font-medium text-gray-700 mb-1">
                Chave PIX para Recebimento
              </label>
              <input
                type="text"
                id="chave-pix"
                placeholder="CPF, E-mail, Celular ou Chave Aleatória"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                value={chavePix}
                onChange={(e) => setChavePix(e.target.value)}
                disabled={loading}
              />
            </div>
            
            {/* Seção senha com informação adicional */}
            <div className="mb-6">
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
                Senha (para confirmar)
              </label>
              <input
                type="password"
                id="senha"
                placeholder="Digite sua senha de acesso ao app"
                className={`w-full p-3 border ${
                  erro.toLowerCase().includes("senha") ? "border-red-500" : "border-gray-300"
                } rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs mt-1 font-medium flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-blue-600">Importante: Use a mesma senha do seu login no aplicativo</span>
              </p>
            </div>
            
            {/* Mensagem de Erro */}
            {erro && (
              <div className={`mb-4 p-3 rounded-lg flex items-start ${
                erro.toLowerCase().includes("senha") 
                  ? "bg-red-100 text-red-800 border border-red-300" 
                  : "bg-red-50 text-red-700"
              }`}>
                {erro.toLowerCase().includes("senha") && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                <span>{erro}</span>
              </div>
            )}
            

            {/* Botão de Envio */}
            <button
              type="button"
              className={`w-full py-3 px-4 ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              } text-white rounded-lg transition-colors font-medium`}
              disabled={loading}
              onClick={handleSubmit}
              style={{ touchAction: 'manipulation' }}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <FaSpinner className="animate-spin mr-2" />
                  Processando...
                </span>
              ) : (
                "Solicitar Antecipação"
              )}
            </button>
          </form>
        )}
        
        {/* Tela de logs visível para mobile */}
        {typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium text-blue-800">📱 Logs de Debug - Mobile</div>
              <button 
                onClick={() => setDebugLogs([])}
                className="text-xs bg-red-500 text-white px-2 py-1 rounded"
              >
                Limpar
              </button>
            </div>
            
            <div className="space-y-1 text-blue-700 text-xs">
              <div>Loading: {loading ? '🔄 SIM' : '✅ NÃO'}</div>
              <div>Submissões ativas: {submissoesEmAndamento.size}</div>
              <div>Última submissão: {ultimaSubmissao.size > 0 ? 'Registrada' : 'Nenhuma'}</div>
              <div className="text-red-600 font-bold">⚠️ DUPLICAÇÃO COM 1 CLIQUE!</div>
              <div className="text-green-600 font-bold">🔍 API LOGS VISÍVEIS ABAIXO</div>
            </div>
            
            {/* Área de logs em tempo real */}
            <div className="mt-3 bg-black text-green-400 p-2 rounded text-xs font-mono max-h-64 overflow-y-auto">
              <div className="text-white mb-1">📋 LOGS EM TEMPO REAL:</div>
              {debugLogs.length === 0 ? (
                <div className="text-gray-400">Aguardando logs...</div>
              ) : (
                debugLogs.map((log, index) => (
                  <div key={index} className="mb-1 break-words">
                    {log}
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-2 text-xs text-blue-600">
              💡 Faça uma solicitação e observe os logs acima para identificar duplicação
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 