'use client';

import { useState, useEffect, ChangeEvent, FormEvent, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FaSpinner, FaClockRotateLeft, FaArrowRotateLeft, FaHourglassHalf } from 'react-icons/fa6';
import { FaCheckCircle, FaTimesCircle, FaEdit, FaSave, FaTimes } from 'react-icons/fa';

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
  pix?: string;
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
  valor_a_descontar?: string; // Campo alternativo que pode vir da API
  mes_corrente: string;
  chave_pix: string;
  status: string | boolean | null;
}

// Cache global para controlar submissões em andamento
const submissoesEmAndamento = new Map<string, boolean>();
const ultimaSubmissao = new Map<string, number>();

// Map global para rastrear execuções por requestId (proteção contra React StrictMode)
const execucoesPorRequestId = new Map<string, number>();

// Mutex global para controle de execução única (proteção contra React StrictMode)
let globalMutex = false;

// Contador global para rastrear execuções simultâneas
let executionCounter = 0;

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
  const [historicoApiDisponivel, setHistoricoApiDisponivel] = useState(true);
  
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
  
  // Estado para controlar se o valor digitado excede o saldo disponível
  const [valorExcedeSaldo, setValorExcedeSaldo] = useState(false);
  
  // Sistema de logs visível no celular
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [mostrarDebug, setMostrarDebug] = useState(true); // Sempre mostrar no mobile

  // Estados para controle das guias
  const [guiaAtiva, setGuiaAtiva] = useState<'solicitacao' | 'historico'>('solicitacao');
  const [mesFiltro, setMesFiltro] = useState<string>('');
  
  // Estados para meses da API
  const [mesesApi, setMesesApi] = useState<any[]>([]);
  const [loadingMeses, setLoadingMeses] = useState(false);

  // Estados para edição de chave PIX
  const [editandoChavePix, setEditandoChavePix] = useState<string | null>(null);
  const [novaChavePix, setNovaChavePix] = useState<string>('');
  const [salvandoChavePix, setSalvandoChavePix] = useState(false);
  
  // Estado para controlar se o campo PIX pode ser editado
  const [pixEditavel, setPixEditavel] = useState(false);

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

      // Buscar também os dados com PIX se tivermos os dados necessários
      if (associadoResponse.data.matricula && associadoResponse.data.empregador && 
          associadoResponse.data.id && associadoResponse.data.id_divisao) {
        try {
          console.log('🔍 Tentando buscar PIX do associado...');
          const formDataPix = new FormData();
          formDataPix.append('matricula', associadoResponse.data.matricula);
          formDataPix.append('id_empregador', associadoResponse.data.empregador.toString());
          formDataPix.append('id_associado', associadoResponse.data.id.toString());
          formDataPix.append('id_divisao', associadoResponse.data.id_divisao.toString());
          
          console.log('📤 Enviando dados para buscar PIX:', {
            matricula: associadoResponse.data.matricula,
            id_empregador: associadoResponse.data.empregador,
            id_associado: associadoResponse.data.id,
            id_divisao: associadoResponse.data.id_divisao
          });
          
          const pixResponse = await axios.post('/api/buscar-dados-associado-pix', formDataPix, {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            validateStatus: function (status) {
              // Aceitar qualquer status para não lançar erro
              return true;
            }
          });
          
          console.log('📥 Resposta da busca do PIX:', pixResponse.status, pixResponse.data);
          
          if (pixResponse.data && pixResponse.data.pix) {
            associadoResponse.data.pix = pixResponse.data.pix;
            console.log('✅ PIX encontrado:', pixResponse.data.pix);
          } else if (pixResponse.data && pixResponse.data.erro) {
            console.log('⚠️ Erro retornado pela API:', pixResponse.data.erro);
          } else {
            console.log('ℹ️ PIX não encontrado ou vazio');
          }
        } catch (pixError: any) {
          console.log('⚠️ Não foi possível buscar dados do PIX:', pixError.message);
          console.log('Detalhes do erro:', pixError.response?.data || pixError);
          // Continuar sem o PIX se houver erro
        }
      } else {
        console.log('⚠️ Dados insuficientes para buscar PIX:', {
          matricula: !!associadoResponse.data.matricula,
          empregador: !!associadoResponse.data.empregador,
          id: !!associadoResponse.data.id,
          id_divisao: !!associadoResponse.data.id_divisao
        });
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
    if (!associadoData?.matricula || !associadoData?.id || !associadoData?.id_divisao || !historicoApiDisponivel) return;
    
    try {
      setLoadingHistorico(true);
      
      // FormData não é mais necessário para GET, mas mantendo para referência
      
      // Usar GET diretamente na API PHP que funciona
      const params = new URLSearchParams({
        matricula: associadoData.matricula,
        empregador: associadoData.empregador.toString(),
        id_associado: associadoData.id.toString(),
        divisao: associadoData.id_divisao.toString()
      });
      
      const apiUrl = `https://sas.makecard.com.br/historico_antecipacao_app_get.php?${params.toString()}`;
      console.log('🔍 FRONTEND - Chamando API diretamente com GET:', apiUrl);
      
      const response = await axios.get(apiUrl, {
        timeout: 30000
      });
      
      if (Array.isArray(response.data)) {
        setUltimasSolicitacoes(response.data);
      } else {
        console.error('Formato de resposta inválido para histórico de solicitações');
        setUltimasSolicitacoes([]);
      }
    } catch (error) {
      console.error('Erro ao buscar histórico de solicitações:', error);
      // Se for erro 403, marcar API como indisponível
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        console.log('🚫 API de histórico retornou 403 - marcando como indisponível');
        console.log('📋 Detalhes do erro 403:', error.response.data);
        setHistoricoApiDisponivel(false);
        setUltimasSolicitacoes([]);
        return;
      }
      setUltimasSolicitacoes([]);
    } finally {
      setLoadingHistorico(false);
    }
  }, [associadoData, historicoApiDisponivel]);

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
          
          // Se o associado já tem PIX cadastrado, preencher o campo
          if (data.pix) {
            setChavePix(data.pix);
            setPixEditavel(false); // Campo desabilitado mas com opção de editar
          } else {
            setPixEditavel(true); // Campo habilitado para o usuário preencher
          }
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
  }, [associadoData, loadSaldoData, isInitialLoading]);

  // Função para forçar atualização do saldo (útil quando mês corrente muda)
  const atualizarSaldo = useCallback(async () => {
    console.log('🔄 Forçando atualização do saldo para verificar mudança de mês...');
    await loadSaldoData();
  }, [loadSaldoData]);

  // Função para buscar meses da API
  const fetchMesesApi = useCallback(async () => {
    if (!associadoData?.id_divisao) return;
    
    try {
      setLoadingMeses(true);
      console.log('🔍 Buscando meses da API para divisão:', associadoData.id_divisao);
      
      const response = await axios.get('https://sas.makecard.com.br/meses_conta_api.php', {
        params: {
          origem: 'convenio',
          divisao: associadoData.id_divisao
        },
        timeout: 10000
      });
      
      if (response.data && Array.isArray(response.data)) {
        setMesesApi(response.data);
        console.log('✅ Meses carregados da API:', response.data);
        
        // Definir o mês corrente como padrão se não há filtro selecionado
        if (!mesFiltro && response.data.length > 0) {
          // Primeiro tentar usar o mês corrente dos dados de saldo
          if (saldoData?.mesCorrente) {
            setMesFiltro(saldoData.mesCorrente);
            console.log('📅 Mês corrente definido como padrão:', saldoData.mesCorrente);
          } else if (response.data.length > 1) {
            // Fallback: usar o primeiro mês disponível se mês corrente não estiver disponível
            const primeiroMes = response.data[1]; // slice(1) para pular mes_corrente
            if (primeiroMes && primeiroMes.abreviacao) {
              setMesFiltro(primeiroMes.abreviacao);
              console.log('📅 Primeiro mês definido como fallback:', primeiroMes.abreviacao);
            }
          }
        }
      } else {
        console.warn('⚠️ Resposta inválida da API de meses:', response.data);
        setMesesApi([]);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar meses da API:', error);
      setMesesApi([]);
    } finally {
      setLoadingMeses(false);
    }
  }, [associadoData?.id_divisao, saldoData?.mesCorrente, mesFiltro]);

  // Carregar meses da API quando a guia histórico for ativada
  useEffect(() => {
    if (guiaAtiva === 'historico' && associadoData?.id_divisao && mesesApi.length === 0) {
      fetchMesesApi();
    }
  }, [guiaAtiva, associadoData?.id_divisao, mesesApi.length, fetchMesesApi]);

  // Definir mês corrente como padrão quando saldoData estiver disponível
  useEffect(() => {
    if (saldoData?.mesCorrente && !mesFiltro && guiaAtiva === 'historico') {
      setMesFiltro(saldoData.mesCorrente);
      console.log('📅 Mês corrente definido automaticamente:', saldoData.mesCorrente);
    }
  }, [saldoData?.mesCorrente, mesFiltro, guiaAtiva]);

  // Formatar o valor como moeda brasileira
  const formatarValor = (valor: number): string => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  // Função para iniciar edição da chave PIX
  const iniciarEdicaoChavePix = (solicitacaoId: string, chaveAtual: string) => {
    setEditandoChavePix(solicitacaoId);
    setNovaChavePix(chaveAtual || '');
  };

  // Função para cancelar edição da chave PIX
  const cancelarEdicaoChavePix = () => {
    setEditandoChavePix(null);
    setNovaChavePix('');
  };

  // Função para salvar nova chave PIX
  const salvarChavePix = async (solicitacaoId: string) => {
    if (!novaChavePix.trim()) {
      toast.error('Digite uma chave PIX válida');
      return;
    }

    try {
      setSalvandoChavePix(true);
      
      const response = await fetch('/api/atualizar-chave-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: solicitacaoId,
          chave_pix: novaChavePix.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Chave PIX atualizada com sucesso!');
        
        // Atualizar a lista local
        setUltimasSolicitacoes(prev => 
          prev.map(solicitacao => 
            solicitacao.id === solicitacaoId 
              ? { ...solicitacao, chave_pix: novaChavePix.trim() }
              : solicitacao
          )
        );
        
        // Limpar estados de edição
        setEditandoChavePix(null);
        setNovaChavePix('');
      } else {
        toast.error(data.error || 'Erro ao atualizar chave PIX');
      }
    } catch (error) {
      console.error('Erro ao salvar chave PIX:', error);
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setSalvandoChavePix(false);
    }
  };

  // Filtrar histórico por mês
  const historicoFiltrado = useMemo(() => {
    if (!mesFiltro) {
      return ultimasSolicitacoes;
    }
    
    return ultimasSolicitacoes.filter(solicitacao => {
      // Filtrar por mes_corrente da solicitação que corresponde à abreviação da API
      return solicitacao.mes_corrente === mesFiltro;
    });
  }, [ultimasSolicitacoes, mesFiltro]);

  // Obter lista de meses únicos do histórico
  const mesesDisponiveis = useMemo(() => {
    const meses = ultimasSolicitacoes.map(solicitacao => {
      const dataSolicitacao = new Date(solicitacao.data_solicitacao);
      return `${String(dataSolicitacao.getMonth() + 1).padStart(2, '0')}/${dataSolicitacao.getFullYear()}`;
    });
    
    const mesesUnicos = Array.from(new Set(meses)).sort().reverse(); // Mais recentes primeiro
    return mesesUnicos;
  }, [ultimasSolicitacoes]);

  // Manipular mudança no input de valor
  const handleValorChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Limpar qualquer formatação
    const valor = e.target.value.replace(/\D/g, '');
    
    // Converter para número
    const valorNumerico = parseFloat(valor) / 100;
    setValorSolicitado(valor);
    
    // Verificar se o valor excede o saldo disponível
    const saldoDisponivel = saldoData?.saldo || 0;
    
    // Arredondar ambos os valores para 2 casas decimais para evitar problemas de precisão
    const valorArredondado = Math.round(valorNumerico * 100) / 100;
    const saldoArredondado = Math.round(saldoDisponivel * 100) / 100;
    
    // Validação: valor só é inválido se for MAIOR que o saldo (igual é permitido)
    const excedeSaldo = valorArredondado > saldoArredondado;
    
    // Debug: Log da validação
    console.log('🔍 DEBUG VALIDAÇÃO SALDO:', {
      valorOriginal: valorNumerico,
      saldoOriginal: saldoDisponivel,
      valorArredondado,
      saldoArredondado,
      excedeSaldo,
      condicao: `${valorArredondado} > ${saldoArredondado} = ${excedeSaldo}`,
      permitido: !excedeSaldo
    });
    
    setValorExcedeSaldo(excedeSaldo);
    
    // Validar se o valor é válido
    if (excedeSaldo && valorNumerico > 0) {
      setErro(`Valor não pode ser maior que o saldo disponível: ${formatarValor(saldoDisponivel)}`);
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
      setValorExcedeSaldo(false);
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
    
    // PROTEÇÃO CRÍTICA 0: Atomic check-and-set para mutex global (primeira linha de defesa)
    const currentCounter = ++executionCounter;
    console.log(`🔢 Contador de execução: ${currentCounter}`);
    
    if (globalMutex) {
      console.log(`🚫 Mutex global ativo, ignorando execução ${currentCounter}`);
      console.trace(`🔍 Stack trace da execução ${currentCounter} bloqueada pelo mutex:`);
      return;
    }
    
    // MARCAR MUTEX GLOBAL IMEDIATAMENTE (ATOMIC)
    globalMutex = true;
    console.log(`🔒 Mutex global ativado pela execução ${currentCounter} - bloqueando execuções duplicadas`);
    
    // PROTEÇÃO CRÍTICA 1: Verificar se já está processando (segunda linha de defesa)
    if (loading || isSubmittingRef.current) {
      console.log(`🚫 Execução ${currentCounter} - já está processando, ignorando`);
      globalMutex = false;
      return;
    }
    
    // PROTEÇÃO CRÍTICA 2: Verificar se houve submissão muito recente (menos de 3 segundos)
    if (ultimaSubmissao.has(chaveProtecao)) {
      const ultimoTempo = ultimaSubmissao.get(chaveProtecao)!;
      if (agora - ultimoTempo < 3000) {
        console.log(`🚫 Execução ${currentCounter} - submissão muito recente, ignorando`);
        globalMutex = false;
        return;
      }
    }
    
    // PROTEÇÃO CRÍTICA 3: Verificar se já existe submissão em andamento para esta combinação
    if (submissoesEmAndamento.has(chaveProtecao)) {
      console.log(`🚫 Execução ${currentCounter} - submissão já em andamento para esta combinação`);
      globalMutex = false;
      return;
    }
    
    // PROTEÇÃO CRÍTICA 4: Verificar se a mesma submissão já foi iniciada recentemente (proteção contra React StrictMode)
    if (lastSubmissionRef.current > 0 && (agora - lastSubmissionRef.current) < 100) {
      console.log(`🚫 Execução ${currentCounter} - submissão duplicada detectada (React StrictMode), ignorando`);
      globalMutex = false;
      return;
    }
    
    // MARCAR TODAS AS OUTRAS PROTEÇÕES DE UMA VEZ (ATÔMICO)
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
      globalMutex = false;
      submissoesEmAndamento.delete(chaveProtecao);
      console.log(`❌ Execução ${currentCounter} - validação falhou: valor inválido`);
      return;
    }
    
    if (!chavePix) {
      setErro("Digite a chave PIX para receber o valor");
      setLoading(false);
      isSubmittingRef.current = false;
      lastSubmissionRef.current = 0;
      globalMutex = false;
      submissoesEmAndamento.delete(chaveProtecao);
      console.log(`❌ Execução ${currentCounter} - validação falhou: chave PIX ausente`);
      return;
    }

    if (!senha) {
      setErro("Digite sua senha para confirmar");
      setLoading(false);
      isSubmittingRef.current = false;
      lastSubmissionRef.current = 0;
      globalMutex = false;
      submissoesEmAndamento.delete(chaveProtecao);
      console.log(`❌ Execução ${currentCounter} - validação falhou: senha ausente`);
      return;
    }

    // Gerar ID único para esta requisição específica
    const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🆔 Execução ${currentCounter} - RequestId gerado: ${requestId}`);
    
    // PROTEÇÃO CRÍTICA 5: Verificar se este requestId já foi usado recentemente (proteção contra React StrictMode)
    if (execucoesPorRequestId.has(requestId)) {
      console.log(`🚫 Execução ${currentCounter} - RequestId duplicado detectado (React StrictMode), ignorando: ${requestId}`);
      globalMutex = false;
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
    
    addDebugLog(`🚀 [${requestId}] Execução ${currentCounter} - Iniciando submissão - Chave: ${chaveProtecao}`);
    console.log(`🚀 [${requestId}] Execução ${currentCounter} - Iniciando submissão - Chave: ${chaveProtecao}`);
    console.trace(`🔍 [${requestId}] Execução ${currentCounter} - Stack trace da submissão:`);
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
        
        // Atualizar o PIX no banco de dados se foi informado
        if (chavePix && associadoData) {
          try {
            addDebugLog(`🔄 [${requestId}] Iniciando atualização do PIX no banco de dados...`);
            addDebugLog(`📋 [${requestId}] Dados para atualização do PIX:`);
            addDebugLog(`   - Chave PIX: ${chavePix}`);
            addDebugLog(`   - Matrícula: ${associadoData.matricula}`);
            addDebugLog(`   - ID Empregador: ${associadoData.empregador}`);
            addDebugLog(`   - ID Associado: ${associadoData.id}`);
            addDebugLog(`   - ID Divisão: ${associadoData.id_divisao}`);
            
            const formDataPix = new FormData();
            formDataPix.append('matricula', associadoData.matricula);
            formDataPix.append('id_empregador', associadoData.empregador.toString());
            formDataPix.append('id_associado', associadoData.id?.toString() || '');
            formDataPix.append('id_divisao', associadoData.id_divisao?.toString() || '');
            formDataPix.append('pix', chavePix);
            
            // Log dos dados sendo enviados
            console.log(`🔍 [${requestId}] FormData para atualizar PIX:`, {
              matricula: associadoData.matricula,
              id_empregador: associadoData.empregador.toString(),
              id_associado: associadoData.id?.toString() || '',
              id_divisao: associadoData.id_divisao?.toString() || '',
              pix: chavePix
            });
            
            addDebugLog(`📤 [${requestId}] Enviando requisição para /api/atualizar-pix-associado`);
            
            const pixResponse = await axios.post('/api/atualizar-pix-associado', formDataPix, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            });
            
            addDebugLog(`📥 [${requestId}] Resposta da API de atualização PIX:`);
            addDebugLog(`   - Status: ${pixResponse.status}`);
            addDebugLog(`   - Success: ${pixResponse.data?.success}`);
            addDebugLog(`   - Message: ${pixResponse.data?.message || 'N/A'}`);
            addDebugLog(`   - Linhas afetadas: ${pixResponse.data?.linhas_afetadas || 'N/A'}`);
            
            console.log(`📥 [${requestId}] Resposta completa da atualização PIX:`, pixResponse.data);
            
            if (pixResponse.data && pixResponse.data.success) {
              addDebugLog(`✅ [${requestId}] PIX atualizado com sucesso no banco`);
              if (pixResponse.data.debug) {
                addDebugLog(`   - PIX anterior: ${pixResponse.data.debug.pix_anterior || 'vazio'}`);
                addDebugLog(`   - PIX novo: ${pixResponse.data.debug.pix_novo}`);
              }
              // Atualizar o estado local do PIX do associado
              setAssociadoData({...associadoData, pix: chavePix});
              setPixEditavel(false); // Desabilitar edição do campo PIX
            } else {
              addDebugLog(`⚠️ [${requestId}] Não foi possível atualizar o PIX:`);
              addDebugLog(`   - Mensagem: ${pixResponse.data?.message || 'Erro desconhecido'}`);
              addDebugLog(`   - Erro: ${pixResponse.data?.erro || 'N/A'}`);
              
              // Mostrar informações de debug se disponíveis
              if (pixResponse.data?.debug) {
                addDebugLog(`📋 Debug da API PHP:`);
                if (pixResponse.data.debug.parametros_busca) {
                  addDebugLog(`   - Parâmetros de busca:`);
                  Object.entries(pixResponse.data.debug.parametros_busca).forEach(([key, value]) => {
                    addDebugLog(`     * ${key}: ${value}`);
                  });
                }
                addDebugLog(`   - Registro encontrado: ${pixResponse.data.debug.registro_encontrado ? 'SIM' : 'NÃO'}`);
                if (pixResponse.data.debug.registro_detalhes) {
                  addDebugLog(`   - Detalhes do registro:`);
                  Object.entries(pixResponse.data.debug.registro_detalhes).forEach(([key, value]) => {
                    addDebugLog(`     * ${key}: ${value}`);
                  });
                }
              }
              
              console.error(`⚠️ [${requestId}] Erro na resposta da API PIX:`, pixResponse.data);
            }
          } catch (pixError: any) {
            addDebugLog(`💥 [${requestId}] Erro ao atualizar PIX:`);
            addDebugLog(`   - Tipo: ${pixError.name || 'Erro desconhecido'}`);
            addDebugLog(`   - Mensagem: ${pixError.message || 'Sem mensagem'}`);
            addDebugLog(`   - Response: ${pixError.response?.data?.erro || 'N/A'}`);
            console.error('Erro completo ao atualizar PIX:', pixError);
            console.error('Response do erro:', pixError.response);
            // Não interromper o fluxo por causa do erro de atualização do PIX
          }
        } else {
          addDebugLog(`⚠️ [${requestId}] Atualização do PIX ignorada:`);
          addDebugLog(`   - ChavePix presente: ${!!chavePix}`);
          addDebugLog(`   - AssociadoData presente: ${!!associadoData}`);
          if (!chavePix) addDebugLog(`   - Motivo: Chave PIX não informada`);
          if (!associadoData) addDebugLog(`   - Motivo: Dados do associado não disponíveis`);
        }
        
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
      globalMutex = false;
      console.log(`🔓 Mutex global liberado pela execução ${currentCounter} - permitindo novas execuções`);
      // Liberar proteção após processamento
      submissoesEmAndamento.delete(chaveProtecao);
      execucoesPorRequestId.delete(requestId);
      addDebugLog(`🏁 [${requestId}] Submissão finalizada`);
      console.log(`🏁 Execução ${currentCounter} finalizada - Chave: ${chaveProtecao}`);
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
    <div className="max-w-4xl mx-auto p-4 w-full">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-6 text-gray-800">Antecipação Salarial</h2>
        
        {/* Sistema de Guias */}
        <div className="mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setGuiaAtiva('solicitacao')}
              className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
                guiaAtiva === 'solicitacao'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Nova Solicitação
            </button>
            <button
              onClick={() => setGuiaAtiva('historico')}
              className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
                guiaAtiva === 'historico'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Histórico
            </button>
          </div>
        </div>
        
        {/* Conteúdo das Guias */}
        {guiaAtiva === 'solicitacao' ? (
          <>
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
            
            {/* Mensagem quando valor excede saldo disponível */}
            {(() => {
              const shouldShow = valorExcedeSaldo && valorSolicitado && parseFloat(valorSolicitado) > 0;
              const valorDigitado = parseFloat(valorSolicitado) / 100;
              const saldoAtual = saldoData?.saldo || 0;
              
              console.log('🔍 DEBUG EXIBIÇÃO MENSAGEM:', {
                valorExcedeSaldo,
                valorSolicitado,
                valorDigitado,
                valorDigitadoArredondado: Math.round(valorDigitado * 100) / 100,
                saldoAtual,
                saldoArredondado: Math.round(saldoAtual * 100) / 100,
                shouldShow,
                comparacao: `${Math.round(valorDigitado * 100) / 100} > ${Math.round(saldoAtual * 100) / 100}`
              });
              return shouldShow;
            })() ? (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <FaTimesCircle className="text-red-500 text-lg mr-2" />
                  <h4 className="font-medium text-red-800">Valor Indisponível</h4>
                </div>
                <p className="text-red-700 mb-2">
                  O valor digitado não pode ser maior que o saldo disponível.
                </p>
                <div className="text-sm text-red-600">
                  <p><strong>Valor digitado:</strong> {formatarValor(parseFloat(valorSolicitado) / 100)}</p>
                  <p><strong>Saldo disponível:</strong> {formatarValor(saldoData?.saldo || 0)}</p>
                </div>
                <p className="text-xs text-red-500 mt-2">
                  💡 Digite um valor menor ou igual ao saldo disponível para continuar.
                </p>
              </div>
            ) : (
              <>
                {/* Chave PIX */}
                <div className="mb-4">
                  <label htmlFor="chave-pix" className="block text-sm font-medium text-gray-700 mb-1">
                    Chave PIX para Recebimento
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="chave-pix"
                      placeholder="CPF, E-mail, Celular ou Chave Aleatória"
                      className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 ${
                        associadoData?.pix && !pixEditavel ? 'pr-12 bg-gray-50' : ''
                      }`}
                      value={chavePix}
                      onChange={(e) => setChavePix(e.target.value)}
                      disabled={loading || (!!associadoData?.pix && !pixEditavel)}
                    />
                    {associadoData?.pix && !pixEditavel && (
                      <button
                        type="button"
                        onClick={() => setPixEditavel(true)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800"
                        title="Editar chave PIX"
                      >
                        <FaEdit size={18} />
                      </button>
                    )}
                  </div>
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
              </>
            )}
            
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
            

            {/* Botão de Envio - só aparece se valor não exceder saldo */}
            {!valorExcedeSaldo && (
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
            )}
          </form>
        )}
          </>
        ) : (
          /* Guia de Histórico */
          <div>
            {/* Filtro por Mês */}
            <div className="mb-4">
              <label htmlFor="mes-filtro" className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Mês:
              </label>
              <select
                id="mes-filtro"
                value={mesFiltro}
                onChange={(e) => setMesFiltro(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                disabled={loadingMeses}
              >
                {loadingMeses ? (
                  <option disabled>Carregando meses...</option>
                ) : (
                  <>
                    <option value="">Todos os meses</option>
                    {mesesApi.slice(1).map((mes, index) => ( // slice(1) para pular o primeiro item que é mes_corrente
                      <option key={index} value={mes.abreviacao}>
                        {mes.abreviacao}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Lista do Histórico */}
            {loadingHistorico ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Carregando histórico...</span>
              </div>
            ) : historicoFiltrado.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-gray-800 mb-3">
                  Suas Solicitações {mesFiltro ? `- ${mesFiltro}` : ''}
                </h3>
                {historicoFiltrado.map((solicitacao, index) => {
                  // Debug: Log dos campos de valor para identificar o problema
                  console.log('🔍 DEBUG SOLICITAÇÃO:', {
                    index,
                    valor_solicitado: solicitacao.valor_solicitado,
                    taxa: solicitacao.taxa,
                    valor_descontar: solicitacao.valor_descontar,
                    valor_a_descontar: solicitacao.valor_a_descontar,
                    todos_campos: Object.keys(solicitacao)
                  });

                  return (
                  <div key={index} className={`p-4 rounded-lg border-2 w-full max-w-none ${
                    solicitacao.status === true || solicitacao.status === 'true' || solicitacao.status === '1'
                      ? 'bg-green-50 border-green-200'
                      : solicitacao.status === false || solicitacao.status === 'false' || solicitacao.status === '0'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-800">
                          {formatarValor(parseFloat(solicitacao.valor_solicitado))}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(solicitacao.data_solicitacao).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right">
                        {solicitacao.status === true || solicitacao.status === 'true' || solicitacao.status === '1' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <FaCheckCircle className="mr-1" />
                            Aprovado
                          </span>
                        ) : solicitacao.status === false || solicitacao.status === 'false' || solicitacao.status === '0' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <FaTimesCircle className="mr-1" />
                            Rejeitado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <FaHourglassHalf className="mr-1" />
                            Pendente
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Detalhes da solicitação */}
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Taxa:</strong> {formatarValor(parseFloat(solicitacao.taxa || '0'))}</p>
                      <p><strong>Total a Descontar:</strong> {formatarValor(parseFloat(solicitacao.valor_a_descontar || solicitacao.valor_descontar || '0'))}</p>
                      <p><strong>Mês:</strong> {solicitacao.mes_corrente}</p>
                      
                      {/* Chave PIX com opção de edição */}
                      {editandoChavePix === solicitacao.id ? (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Editar Chave PIX:</p>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                type="text"
                                value={novaChavePix}
                                onChange={(e) => setNovaChavePix(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Digite a nova chave PIX"
                                disabled={salvandoChavePix}
                              />
                              <div className="flex gap-2 justify-center sm:justify-start">
                                <button
                                  onClick={() => salvarChavePix(solicitacao.id)}
                                  disabled={salvandoChavePix}
                                  className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                                  title="Salvar chave PIX"
                                >
                                  {salvandoChavePix ? (
                                    <FaSpinner className="animate-spin" size={14} />
                                  ) : (
                                    <FaSave size={14} />
                                  )}
                                  Salvar
                                </button>
                                <button
                                  onClick={cancelarEdicaoChavePix}
                                  disabled={salvandoChavePix}
                                  className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                                  title="Cancelar edição"
                                >
                                  <FaTimes size={14} />
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p>
                            <strong>Chave PIX:</strong> {solicitacao.chave_pix || 'Não informada'}
                          </p>
                          <button
                            onClick={() => iniciarEdicaoChavePix(solicitacao.id, solicitacao.chave_pix || '')}
                            className="p-1 text-blue-600 hover:text-blue-800 ml-2"
                            title="Editar chave PIX"
                          >
                            <FaEdit size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <FaClockRotateLeft className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {mesFiltro ? `Nenhuma solicitação em ${mesFiltro}` : 'Nenhuma solicitação encontrada'}
                </h3>
                <p className="text-gray-500">
                  {mesFiltro 
                    ? 'Tente selecionar outro mês'
                    : 'Suas solicitações de antecipação aparecerão aqui'
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 