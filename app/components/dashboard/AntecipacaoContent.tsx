'use client';

import { useState, useEffect, ChangeEvent, FormEvent, useCallback } from 'react';
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

// Adicione essa variável fora do componente para compartilhar entre renderizações
let isSubmitting = false;

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
  
  // Valores para exibição após a solicitação ser enviada
  const [valorConfirmado, setValorConfirmado] = useState("");
  const [taxaConfirmada, setTaxaConfirmada] = useState(0);
  const [totalConfirmado, setTotalConfirmado] = useState(0);

  // Função segura para verificar se uma string está em um array
  const isStringInArray = (str: any, arr: string[]): boolean => {
    if (typeof str !== 'string') return false;
    return arr.includes(str.toLowerCase());
  };

  // Função para buscar o mês corrente
  const fetchMesCorrente = useCallback(async (cartaoParam: string) => {
    try {
      if (!cartaoParam) {
        console.error('Cartão não fornecido para buscar mês corrente');
        return null;
      }

      const formData = new FormData();
      formData.append('cartao', cartaoParam.trim());
      
      console.log('Buscando mês corrente para cartão:', cartaoParam);
      
      const response = await axios.post('/api/mes-corrente', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('Resposta da API de mês corrente:', response.data);
      
      // A API agora sempre retorna um array com pelo menos um item
      if (Array.isArray(response.data) && response.data.length > 0 && response.data[0].abreviacao) {
        const mesAtual = response.data[0].abreviacao;
        const porcentagem = parseFloat(response.data[0].porcentagem || '0');
        console.log('Mês corrente obtido:', mesAtual, 'porcentagem:', porcentagem);
        return { mesAtual, porcentagem };
      } else {
        // Em caso de problemas, usamos o mês atual
        const dataAtual = new Date();
        const mes = dataAtual.getMonth();
        const ano = dataAtual.getFullYear();
        const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
        const mesAtual = `${meses[mes]}/${ano}`;
        console.log('Usando mês atual como fallback:', mesAtual);
        return { mesAtual, porcentagem: 0 };
      }
    } catch (err) {
      console.error('Erro ao buscar mês corrente:', err);
      // Em caso de erro, retornar o mês atual
      const dataAtual = new Date();
      const mes = dataAtual.getMonth();
      const ano = dataAtual.getFullYear();
      const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      const mesAtual = `${meses[mes]}/${ano}`;
      console.log('Usando mês atual como fallback após erro:', mesAtual);
      return { mesAtual, porcentagem: 0 };
    }
  }, []);

  // Função para buscar os dados da conta e calcular o saldo
  const fetchConta = useCallback(async (matricula: string, empregador: string, mes: string) => {
    try {
      // Não buscar dados do associado novamente, usar os que já temos
      if (!matricula || !empregador) {
        throw new Error('Matrícula ou empregador não fornecidos');
      }

      // Agora buscar os dados da conta com os dados do associado
      const formDataConta = new FormData();
      formDataConta.append('matricula', matricula);
      formDataConta.append('empregador', empregador.toString());
      formDataConta.append('mes', mes);
      
      const response = await axios.post('/api/conta', formDataConta, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (Array.isArray(response.data)) {
        // Calcular o total das contas
        let total = 0;
        for (const item of response.data) {
          total += parseFloat(item.valor || '0');
        }
        
        return total;
      } else {
        throw new Error('Formato de resposta inválido');
      }
    } catch (error) {
      console.error('Erro ao buscar dados da conta:', error);
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
      setLoading(true);
      setErro("");
      
      // 1. Buscar mês corrente
      const { mesAtual, porcentagem } = await fetchMesCorrente(cartao) || { mesAtual: null, porcentagem: 0 };
      
      if (!mesAtual) {
        throw new Error('Mês corrente não disponível');
      }
      
      // 2. Buscar dados da conta com os dados do associado que já temos
      const total = await fetchConta(
        associadoData.matricula, 
        associadoData.empregador, 
        mesAtual
      );
      
      // 3. Calcular saldo
      const limite = parseFloat(associadoData.limite || '0');
      const saldo = limite - total;
      
      // 4. Atualizar o estado
      setSaldoData({
        saldo,
        limite,
        total,
        mesCorrente: mesAtual,
        porcentagem
      });
      
    } catch (error) {
      console.error('Erro ao carregar dados de saldo:', error);
      if (error instanceof Error) {
        setErro(`Não foi possível carregar seus dados: ${error.message}`);
      } else {
        setErro('Não foi possível carregar seus dados. Tente novamente.');
      }
    } finally {
      setLoading(false);
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

  // Manipular envio do formulário
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Gerar ID único para esta solicitação
    const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🚀 [${requestId}] Iniciando nova solicitação de antecipação`);
    
    // Prevenir duplo clique/envio
    if (isSubmitting) {
      console.log(`⚠️ [${requestId}] Solicitação já está sendo processada, ignorando nova tentativa`);
      return;
    }
    
    if (!valorSolicitado || parseFloat(valorSolicitado) / 100 <= 0) {
      setErro("Digite o valor desejado");
      return;
    }
    
    if (!chavePix) {
      setErro("Digite a chave PIX para receber o valor");
      return;
    }

    if (!senha) {
      setErro("Digite sua senha para confirmar");
      return;
    }

    // Marcar como enviando
    isSubmitting = true;
    setLoading(true);
    
    console.log(`📤 [${requestId}] Preparando dados para envio:`, {
      matricula: associadoData?.matricula,
      empregador: associadoData?.empregador,
      valor_pedido: parseFloat(valorSolicitado) / 100,
      taxa: taxa,
      valor_total: valorTotal,
      mes_corrente: saldoData?.mesCorrente
    });
    
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
        request_id: requestId // Adicionar ID único
      };
      
      console.log(`🌐 [${requestId}] Enviando DIRETAMENTE para PHP:`, payload);
      
      // Converter para FormData para PHP
      const formData = new URLSearchParams();
      formData.append('matricula', payload.matricula || '');
      formData.append('pass', payload.pass);
      formData.append('empregador', (payload.empregador || 0).toString());
      formData.append('valor_pedido', payload.valor_pedido);
      formData.append('taxa', payload.taxa);
      formData.append('valor_descontar', payload.valor_descontar);
      formData.append('mes_corrente', payload.mes_corrente || '');
      formData.append('chave_pix', payload.chave_pix);
      
      const response = await axios.post(
        'https://sas.makecard.com.br/grava_antecipacao_app.php',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000
        }
      );
      
      console.log(`📥 [${requestId}] Resposta recebida:`, {
        success: response.data.success,
        message: response.data.message,
        duplicate_prevented: response.data.duplicate_prevented,
        id: response.data.id
      });

      if (response.data.success === false) {
        // Verificar especificamente se é um erro de senha
        if (response.data.message && 
            (response.data.message.toLowerCase().includes("senha") || 
             response.data.message.toLowerCase().includes("password"))) {
          setErro("Senha incorreta! Use a mesma senha que você utiliza para acessar o aplicativo.");
          
          // Destacar visualmente o campo de senha
          const senhaInput = document.getElementById('senha');
          if (senhaInput) {
            senhaInput.classList.add('border-red-500', 'bg-red-50');
            setTimeout(() => {
              senhaInput.classList.remove('border-red-500', 'bg-red-50');
            }, 3000);
          }
          
          // Limpar apenas o campo de senha para nova tentativa
          setSenha("");
        } else {
          console.log(`❌ [${requestId}] Erro na solicitação:`, response.data.message);
          setErro(response.data.message);
        }
      } else {
        console.log(`✅ [${requestId}] Solicitação processada com sucesso!`, {
          duplicate_prevented: response.data.duplicate_prevented,
          id: response.data.id
        });
        
        // Salvar os valores confirmados antes de limpar o formulário
        setValorConfirmado(valorFormatado);
        setTaxaConfirmada(taxa);
        setTotalConfirmado(valorTotal);
        
        // Sucesso na solicitação
        setSolicitado(true);
        setSolicitacaoData(format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }));
        toast.success("Solicitação enviada para análise!");
        
        // Limpar apenas o formulário para novas entradas
        setValorSolicitado("");
        setChavePix("");
        setSenha("");
        setErro("");
        
        // Atualizar o histórico de solicitações
        await fetchHistoricoSolicitacoes();
      }
    } catch (error) {
      console.error(`💥 [${requestId}] Erro ao enviar solicitação:`, error);
      
      // Verificar se o erro está relacionado à senha
      if (axios.isAxiosError(error) && error.response?.data) {
        const errorData = error.response.data;
        if (errorData.message && 
            (errorData.message.toLowerCase().includes("senha") || 
             errorData.message.toLowerCase().includes("password"))) {
          setErro("Senha incorreta! Use a mesma senha que você utiliza para acessar o aplicativo.");
          
          // Limpar apenas o campo de senha para nova tentativa
          setSenha("");
          
          // Destacar visualmente o campo de senha
          const senhaInput = document.getElementById('senha');
          if (senhaInput) {
            senhaInput.classList.add('border-red-500', 'bg-red-50');
            setTimeout(() => {
              senhaInput.classList.remove('border-red-500', 'bg-red-50');
            }, 3000);
          }
          
          setLoading(false);
          return;
        }
      }
      
      setErro('Não foi possível processar sua solicitação. Tente novamente.');
    } finally {
      console.log(`🏁 [${requestId}] Finalizando solicitação - liberando flags`);
      setLoading(false);
      // Liberar flag de submissão
      isSubmitting = false;
    }
  };

  // Formatar status para exibição amigável
  const formatarStatus = (status: string | boolean | null | undefined) => {
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
      
      if (isStringInArray(status, ['aprovado', 'aprovada', 's', 'sim'])) {
        return <span className="text-green-600 font-medium">Aprovada</span>;
      }
      
      if (isStringInArray(status, ['recusado', 'recusada', 'n', 'nao', 'não'])) {
        return <span className="text-red-600 font-medium">Recusada</span>;
      }
      
      if (isStringInArray(status, ['pendente', 'analise', 'análise'])) {
        return <span className="text-yellow-600 font-medium">Em análise</span>;
      }
    }
    
    // Padrão para qualquer outro valor
    return <span className="text-yellow-600 font-medium">Pendente</span>;
  };

  // Função para verificar se a solicitação está pendente
  const isPendente = (solicitacao: SolicitacaoAntecipacao) => {
    // Verificar se a solicitação existe
    if (!solicitacao) return true;
    
    // Verificar se o status não existe ou é nulo
    if (solicitacao.status === null || solicitacao.status === undefined) {
      return true;
    }
    
    // Se for booleano, não está pendente se for true (aprovado)
    if (typeof solicitacao.status === 'boolean') {
      return !solicitacao.status;
    }
    
    // Se for string, verificar se é um status pendente
    if (typeof solicitacao.status === 'string') {
      return !isStringInArray(
        solicitacao.status, 
        ['aprovado', 'aprovada', 's', 'sim', 'recusado', 'recusada', 'n', 'nao', 'não']
      );
    }
    
    // Por padrão, considerar pendente
    return true;
  };
  
  // Função para obter classe CSS com base no status
  const getStatusClass = (status: string | boolean | null | undefined) => {
    // Se for booleano
    if (typeof status === 'boolean') {
      return status 
        ? 'bg-green-50 border-green-200' 
        : 'bg-red-50 border-red-200';
    }
    
    // Se for string
    if (typeof status === 'string') {
      if (isStringInArray(status, ['aprovado', 'aprovada', 's', 'sim'])) {
        return 'bg-green-50 border-green-200';
      }
      
      if (isStringInArray(status, ['recusado', 'recusada', 'n', 'nao', 'não'])) {
        return 'bg-red-50 border-red-200';
      }
    }
    
    // Padrão para pendente ou qualquer outro caso
    return 'bg-yellow-50 border-yellow-200';
  };
  
  // Filtrar apenas solicitações pendentes
  const solicitacoesPendentes = ultimasSolicitacoes.filter(isPendente);

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
              onClick={() => loadSaldoData()}
              className="bg-blue-600 hover:bg-blue-700 p-2 rounded text-white transition-colors"
              title="Atualizar saldo"
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
                  {/* Solicitações Mais Recentes (limitando a 3) */}
                  {ultimasSolicitacoes.slice(0, 3).map((solicitacao) => (
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
                      onClick={() => fetchHistoricoSolicitacoes()}
                      className="text-blue-600 text-sm hover:underline w-full text-center py-1"
                      type="button"
                    >
                      Ver mais solicitações
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Últimas Solicitações Pendentes */}
        {solicitacoesPendentes.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-md font-medium text-gray-700 flex items-center">
                <FaClockRotateLeft className="mr-1" /> Solicitações Pendentes
              </h3>
              {loadingHistorico && (
                <FaSpinner className="animate-spin text-blue-600" />
              )}
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-3 py-2">
                {solicitacoesPendentes.map((solicitacao) => (
                  <div 
                    key={solicitacao.id} 
                    className="bg-gray-50 rounded-lg border border-gray-200 p-3 flex-shrink-0 w-48"
                  >
                    <div className="text-sm text-gray-500">
                      {format(new Date(solicitacao.data_solicitacao), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                    <div className="font-semibold">
                      {Number(solicitacao.valor_solicitado).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </div>
                    <div className="text-xs text-gray-600">
                      Mês: {solicitacao.mes_corrente}
                    </div>
                    <div className="mt-1 text-xs">
                      Status: {formatarStatus(solicitacao.status)}
                    </div>
                  </div>
                ))}
              </div>
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
        ) : (
          /* Formulário de Solicitação */
          <form onSubmit={handleSubmit}>
            {/* Campo de Valor */}
            <div className="mb-4">
              <label htmlFor="valor" className="block text-sm font-medium text-gray-700 mb-1">
                Valor Desejado
              </label>
              <input
                type="text"
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
              type="submit"
              className={`w-full p-3 ${
                loading || isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              } text-white rounded-lg transition-colors font-medium`}
              disabled={loading || isSubmitting}
              onClick={(e) => {
                // Verificação extra para prevenir múltiplos cliques
                if (loading || isSubmitting) {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('⚠️ Botão bloqueado - já processando solicitação');
                  return false;
                }
              }}
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
      </div>
    </div>
  );
} 