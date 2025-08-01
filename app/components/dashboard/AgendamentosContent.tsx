'use client';

import { useState, useEffect, useRef } from 'react';
import { FaCalendarCheck, FaClock, FaUserMd, FaStethoscope, FaSpinner, FaExclamationTriangle, FaBuilding, FaInfoCircle, FaTrash, FaSyncAlt, FaMapMarkerAlt, FaTimes, FaPhone } from 'react-icons/fa';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Agendamento {
  id: number;
  cod_associado: string;
  id_empregador: number;
  data_solicitacao: string;
  cod_convenio: string;
  status: number;
  profissional?: string;
  especialidade?: string;
  convenio_nome?: string;
  data_agendada?: string;
}

interface ConvenioEndereco {
  convenio_nome: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  celular: string;
  latitude: number | null;
  longitude: number | null;
}

export default function AgendamentosContent() {
  const router = useRouter();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelandoIds, setCancelandoIds] = useState<Set<number>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [enderecoModal, setEnderecoModal] = useState<{ isOpen: boolean; agendamento: Agendamento | null; endereco: ConvenioEndereco | null; loading: boolean }>({
    isOpen: false,
    agendamento: null,
    endereco: null,
    loading: false
  });
  const toastControlRef = useRef({ isShowing: false, timeoutId: null as NodeJS.Timeout | null });

  // Buscar agendamentos do associado
  const fetchAgendamentos = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Iniciando busca de agendamentos...');

      // Buscar dados do usuário logado
      const storedUser = localStorage.getItem('qrcred_user');
      if (!storedUser) {
        throw new Error('Usuário não encontrado. Faça login novamente.');
      }

      const userData = JSON.parse(storedUser);
      console.log('👤 Dados do usuário:', { cartao: userData.cartao });
      
      // Buscar dados completos do associado
      const localizaResponse = await axios.post('/api/localiza-associado', {
        cartao: userData.cartao
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!localizaResponse.data || !localizaResponse.data.matricula) {
        throw new Error('Não foi possível obter dados do associado.');
      }

      const associadoData = localizaResponse.data;
      console.log('👤 Dados do associado:', { 
        matricula: associadoData.matricula, 
        empregador: associadoData.empregador 
      });

      // Buscar agendamentos do associado
      const response = await axios.post('/api/agendamentos-lista', {
        cod_associado: associadoData.matricula,
        id_empregador: associadoData.empregador
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📋 Resposta da API de agendamentos:', response.data);

      if (response.data.success && Array.isArray(response.data.data)) {
        const agendamentosRecebidos = response.data.data;
        console.log(`✅ ${agendamentosRecebidos.length} agendamentos recebidos`);
        
        // Log dos novos campos em cada agendamento
        agendamentosRecebidos.forEach((agendamento: Agendamento, index: number) => {
          console.log(`📋 Agendamento ${index + 1}:`, {
            id: agendamento.id,
            cod_associado: agendamento.cod_associado || 'NÃO INFORMADO',
            id_empregador: agendamento.id_empregador || 'NÃO INFORMADO',
            profissional: agendamento.profissional || 'NÃO INFORMADO',
            especialidade: agendamento.especialidade || 'NÃO INFORMADO',
            convenio_nome: agendamento.convenio_nome || 'NÃO INFORMADO',
            data_agendada: agendamento.data_agendada || 'NÃO INFORMADO',
            status: agendamento.status,
            allFields: Object.keys(agendamento)
          });
        });
        
        setAgendamentos(agendamentosRecebidos);
      } else {
        console.log('ℹ️ Nenhum agendamento encontrado ou resposta inválida');
        setAgendamentos([]);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar agendamentos:', error);
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Erro ao carregar agendamentos. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Função para cancelar agendamento
  const handleCancelar = async (agendamento: Agendamento) => {
    // Confirmação antes de cancelar
    const confirmar = window.confirm(
      `🚨 CONFIRMAÇÃO DE CANCELAMENTO\n\n` +
      `Tem certeza que deseja CANCELAR este agendamento?\n` +
      `Esta ação NÃO PODE ser desfeita!\n\n` +
      `📋 DETALHES DO AGENDAMENTO:\n` +
      `👨‍⚕️ Profissional: ${agendamento.profissional || 'Não informado'}\n` +
      `🩺 Especialidade: ${agendamento.especialidade || 'Não informado'}\n` +
      `🏥 Convênio: ${agendamento.convenio_nome || 'Não informado'}\n` +
      `📅 Data: ${formatarData(agendamento.data_solicitacao)}\n\n` +
      `Clique em OK para CANCELAR ou Cancelar para manter o agendamento.`
    );

    if (!confirmar) {
      return;
    }

    // Verificar se já está cancelando
    if (cancelandoIds.has(agendamento.id)) {
      return;
    }

    // Marcar como cancelando
    setCancelandoIds(prev => new Set(prev).add(agendamento.id));

    try {
      console.log('🗑️ Iniciando cancelamento do agendamento:', agendamento.id);

      // Buscar dados do usuário logado
      const storedUser = localStorage.getItem('qrcred_user');
      if (!storedUser) {
        throw new Error('Usuário não encontrado. Faça login novamente.');
      }

      const userData = JSON.parse(storedUser);
      
      // Buscar dados completos do associado
      const localizaResponse = await axios.post('/api/localiza-associado', {
        cartao: userData.cartao
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!localizaResponse.data || !localizaResponse.data.matricula) {
        throw new Error('Não foi possível obter dados do associado.');
      }

      const associadoData = localizaResponse.data;

      // Log detalhado para debug
      console.log('🔍 DADOS DO AGENDAMENTO PARA CANCELAR:', {
        agendamento_id: agendamento.id,
        agendamento_cod_associado: agendamento.cod_associado,
        agendamento_id_empregador: agendamento.id_empregador,
        associado_matricula: associadoData.matricula,
        associado_empregador: associadoData.empregador
      });

      // Usar dados do agendamento quando disponíveis, senão usar dados do associado atual
      const dadosParaCancelar = {
        id_agendamento: agendamento.id,
        cod_associado: agendamento.cod_associado || associadoData.matricula,
        id_empregador: agendamento.id_empregador || associadoData.empregador
      };

      console.log('📤 DADOS SENDO ENVIADOS PARA CANCELAMENTO:', dadosParaCancelar);

      // Verificar se temos todos os dados necessários
      if (!dadosParaCancelar.cod_associado || !dadosParaCancelar.id_empregador) {
        throw new Error('Dados insuficientes para cancelar o agendamento');
      }

      // Cancelar agendamento
      const response = await axios.post('/api/cancelar-agendamento', dadosParaCancelar, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Verificar se o cancelamento foi bem-sucedido (mais flexível)
      const cancelamentoSucesso = response.data.success || response.status === 200;
      const mensagemResposta = response.data.message || '';
      
      console.log('📝 Resposta do cancelamento:', {
        success: response.data.success,
        status: response.status,
        message: mensagemResposta,
        data: response.data
      });
      
      if (cancelamentoSucesso) {
        console.log('✅ Agendamento cancelado com sucesso no servidor');
        
        // Mostrar mensagem de sucesso
        toast.success(
          `Agendamento cancelado com sucesso!\n\n` +
          `Profissional: ${agendamento.profissional || 'Não informado'}\n` +
          `Especialidade: ${agendamento.especialidade || 'Não informado'}`,
          { duration: 4000 }
        );
        
        // CORREÇÃO: Remover IMEDIATAMENTE da lista local (sem setTimeout)
        console.log('🔄 Removendo agendamento da lista local (ID:', agendamento.id, ')');
        setAgendamentos(prev => {
          const novaLista = prev.filter(item => item.id !== agendamento.id);
          console.log('📝 Lista atualizada. Antes:', prev.length, 'Depois:', novaLista.length);
          return novaLista;
        });
        
        // CORREÇÃO EXTRA: Forçar re-busca dos agendamentos após 2 segundos para garantir sincronização
        setTimeout(() => {
          console.log('🔄 Re-buscando agendamentos para garantir sincronização (especialmente importante no mobile)...');
          // Buscar sem toast para evitar mensagem duplicada
          fetchAgendamentos();
        }, 2000);
      } else {
        // Tratar mensagens específicas do backend
        if (mensagemResposta.toLowerCase().includes('nenhum agendamento')) {
          console.log('⚠️ Backend retornou "nenhum agendamento", mas pode ter sido cancelado. Verificando...');
          
          // Ainda assim remover da lista local pois pode ter sido cancelado
          setAgendamentos(prev => prev.filter(item => item.id !== agendamento.id));
          
          toast.success('Agendamento removido da lista!');
          
          // Re-buscar para confirmar estado
          setTimeout(() => fetchAgendamentos(), 1000);
        } else {
          throw new Error(mensagemResposta || 'Erro ao cancelar agendamento');
        }
      }

    } catch (error) {
      console.error('❌ Erro ao cancelar agendamento:', error);
      
      let errorMessage = 'Erro ao cancelar agendamento. Tente novamente.';
      
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        const backendMessage = error.response.data.message;
        
        // Verificar se é erro de "não encontrado"
        if (backendMessage.includes('não encontrado') || backendMessage.includes('não pertence')) {
          errorMessage = 'Este agendamento não pode ser cancelado. Pode ter sido criado com dados diferentes ou já foi removido.';
          console.error('❌ Problema de identificação do agendamento. Verifique os logs acima para mais detalhes.');
        } else {
          errorMessage = backendMessage;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      // Remover do estado de cancelando
      console.log('🧹 Limpando estado de cancelamento para ID:', agendamento.id);
      setCancelandoIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(agendamento.id);
        console.log('🧹 IDs ainda cancelando:', Array.from(newSet));
        return newSet;
      });
      
      // CORREÇÃO MOBILE: Verificação adicional do estado da lista
      setTimeout(() => {
        setAgendamentos(current => {
          const temAgendamento = current.find(item => item.id === agendamento.id);
          if (temAgendamento) {
            console.log('⚠️ MOBILE FIX: Agendamento ainda na lista, removendo novamente...', agendamento.id);
            return current.filter(item => item.id !== agendamento.id);
          }
          console.log('✅ MOBILE CHECK: Agendamento removido corretamente da lista');
          return current;
        });
      }, 500);
    }
  };

  useEffect(() => {
    fetchAgendamentos();
  }, []);

  // Função para formatar data
  const formatarData = (dataISO: string) => {
    try {
      const data = new Date(dataISO);
      return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dataISO;
    }
  };

  // Função para obter status formatado
  const getStatusInfo = (status: number) => {
    switch (status) {
      case 1:
        return {
          text: 'Pendente',
          color: 'text-yellow-600 bg-yellow-100',
          icon: <FaClock className="w-4 h-4" />
        };
      case 2:
        return {
          text: 'Agendado',
          color: 'text-green-600 bg-green-100',
          icon: <FaCalendarCheck className="w-4 h-4" />
        };
      default:
        return {
          text: 'Desconhecido',
          color: 'text-gray-600 bg-gray-100',
          icon: <FaExclamationTriangle className="w-4 h-4" />
        };
    }
  };

  // Função auxiliar para verificar se um campo tem valor válido
  const hasValidValue = (value: string | undefined | null): boolean => {
    return value !== undefined && value !== null && value.trim() !== '';
  };

  // Função para buscar endereço do convênio
  const buscarEnderecoConvenio = async (agendamento: Agendamento) => {
    if (!agendamento.cod_convenio) {
      toast.error('Código do convênio não disponível');
      return;
    }

    setEnderecoModal({
      isOpen: true,
      agendamento,
      endereco: null,
      loading: true
    });

    try {
      console.log(`🏥 Buscando endereço do convênio ${agendamento.cod_convenio}...`);
      
      const response = await axios.get(`/api/convenio-endereco?cod_convenio=${agendamento.cod_convenio}`);
      
      if (response.data && response.data.success) {
        console.log('✅ Endereço do convênio carregado:', response.data.data);
        setEnderecoModal(prev => ({
          ...prev,
          endereco: response.data.data,
          loading: false
        }));
      } else {
        throw new Error('Endereço não encontrado');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar endereço do convênio:', error);
      toast.error('Erro ao carregar endereço do convênio');
      setEnderecoModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Função para fechar modal de endereço
  const fecharEnderecoModal = () => {
    setEnderecoModal({
      isOpen: false,
      agendamento: null,
      endereco: null,
      loading: false
    });
  };

  // Função para forçar atualização da lista (especialmente útil para mobile)
  const forcarAtualizacaoLista = async () => {
    // Verificar se já está processando ou se toast já foi mostrado recentemente
    if (refreshing || toastControlRef.current.isShowing) {
      console.log('🚫 Bloqueando chamada duplicada de forcarAtualizacaoLista');
      return;
    }
    
    console.log('🔄 Forçando atualização completa da lista de agendamentos...');
    setRefreshing(true);
    toastControlRef.current.isShowing = true;
    
    // Limpar timeout anterior se existir
    if (toastControlRef.current.timeoutId) {
      clearTimeout(toastControlRef.current.timeoutId);
    }
    
    try {
      await fetchAgendamentos();
      console.log('✅ Lista de agendamentos atualizada com sucesso');
      
      // Remover todos os toasts antes de mostrar o novo
      toast.dismiss();
      
      // Toast único com ID baseado em timestamp
      const toastId = 'lista-atualizada-' + Date.now();
      toast.success('Lista atualizada!', { 
        duration: 2000,
        id: toastId
      });
      
    } catch (error) {
      console.error('❌ Erro ao atualizar lista de agendamentos:', error);
      toast.error('Erro ao atualizar lista');
    } finally {
      setRefreshing(false);
      
      // Reset do controle de toast após 1 segundo
      toastControlRef.current.timeoutId = setTimeout(() => {
        toastControlRef.current.isShowing = false;
        console.log('🔓 Liberando controle de toast');
      }, 1000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex items-center space-x-2">
          <FaSpinner className="animate-spin h-6 w-6 text-blue-600" />
          <span className="text-gray-600">Carregando agendamentos...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <FaExclamationTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchAgendamentos}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (agendamentos.length === 0) {
    return (
      <div className="text-center p-8">
        <FaCalendarCheck className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum agendamento encontrado</h3>
        <p className="text-gray-600 mb-4">Você ainda não fez nenhuma solicitação de agendamento.</p>
        <p className="text-gray-600 mb-4">
          Para fazer um agendamento, vá no menu <strong>Convênios</strong>, escolha o convênio que deseja agendar e clique no botão <strong>Agendar</strong>.
        </p>
        <button
          onClick={() => router.push('/dashboard/convenios')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FaCalendarCheck className="mr-2" />
          Ir para Convênios
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-gray-600 flex-shrink-0">
          {agendamentos.length} agendamento{agendamentos.length !== 1 ? 's' : ''} encontrado{agendamentos.length !== 1 ? 's' : ''}
        </p>
        <div className="flex flex-col min-[480px]:flex-row gap-2 sm:gap-2">
          <button
            onClick={forcarAtualizacaoLista}
            disabled={refreshing}
            className={`inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              refreshing 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Atualizar lista de agendamentos"
          >
            <FaSyncAlt className={`mr-1 w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="whitespace-nowrap">{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
          </button>
          <button
            onClick={() => router.push('/dashboard/convenios')}
            className="inline-flex items-center justify-center px-3 py-2 text-sm bg-blue-100 text-blue-700 font-medium rounded-lg hover:bg-blue-200 transition-colors"
          >
            <FaCalendarCheck className="mr-1 w-4 h-4" />
            <span className="whitespace-nowrap">Novo Agendamento</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {agendamentos.map((agendamento) => {
          const statusInfo = getStatusInfo(agendamento.status);
          const isCancelando = cancelandoIds.has(agendamento.id);
          
          return (
            <div key={agendamento.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                      {statusInfo.icon}
                      <span className="ml-1">{statusInfo.text}</span>
                    </span>
                    <span className="text-sm text-gray-500 font-medium">
                      #{agendamento.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Campo Profissional */}
                    <div className="flex items-start space-x-2">
                      <FaUserMd className="text-blue-500 w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm font-medium text-gray-900 break-words overflow-wrap-anywhere hyphens-auto leading-5" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>
                          {hasValidValue(agendamento.profissional) 
                            ? agendamento.profissional 
                            : 'Profissional não informado'
                          }
                        </p>
                        <p className="text-xs text-gray-500">Profissional</p>
                      </div>
                      {!hasValidValue(agendamento.profissional) && (
                        <FaInfoCircle className="text-amber-400 w-3 h-3 mt-0.5 flex-shrink-0" title="Dado não disponível" />
                      )}
                    </div>

                    {/* Campo Especialidade */}
                    <div className="flex items-start space-x-2">
                      <FaStethoscope className="text-green-500 w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm font-medium text-gray-900 break-words overflow-wrap-anywhere hyphens-auto leading-5" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>
                          {hasValidValue(agendamento.especialidade) 
                            ? agendamento.especialidade 
                            : 'Especialidade não informada'
                          }
                        </p>
                        <p className="text-xs text-gray-500">Especialidade</p>
                      </div>
                      {!hasValidValue(agendamento.especialidade) && (
                        <FaInfoCircle className="text-amber-400 w-3 h-3 mt-0.5 flex-shrink-0" title="Dado não disponível" />
                      )}
                    </div>

                    {/* Campo Convênio */}
                    <div className="flex items-start space-x-2">
                      <FaBuilding className="text-purple-500 w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm font-medium text-gray-900 break-words overflow-wrap-anywhere hyphens-auto leading-5" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>
                          {hasValidValue(agendamento.convenio_nome) 
                            ? agendamento.convenio_nome 
                            : 'Convênio não informado'
                          }
                        </p>
                        <p className="text-xs text-gray-500">Convênio</p>
                      </div>
                      {!hasValidValue(agendamento.convenio_nome) && (
                        <FaInfoCircle className="text-amber-400 w-3 h-3 mt-0.5 flex-shrink-0" title="Dado não disponível" />
                      )}
                    </div>

                    {/* Data da Solicitação */}
                    <div className="flex items-center space-x-2">
                      <FaClock className="text-gray-400 w-4 h-4" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{formatarData(agendamento.data_solicitacao)}</p>
                        <p className="text-xs text-gray-500">Data da solicitação</p>
                      </div>
                    </div>

                                         {/* Data Agendada */}
                     <div className="flex items-center space-x-2">
                       <FaCalendarCheck className="text-blue-500 w-4 h-4" />
                       <div className="flex-1">
                         <p className="text-sm font-medium text-gray-900">
                           {hasValidValue(agendamento.data_agendada) 
                             ? formatarData(agendamento.data_agendada!) 
                             : 'Data agendada não disponível'
                           }
                         </p>
                         <p className="text-xs text-gray-500">Data Agendada</p>
                         {hasValidValue(agendamento.data_agendada) && (
                           <button
                             onClick={() => buscarEnderecoConvenio(agendamento)}
                             className="mt-1 text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                           >
                             Ver endereço do convênio
                           </button>
                         )}
                       </div>
                     </div>
                  </div>



                  {/* Botão Cancelar - Posicionado no final */}
                  <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => handleCancelar(agendamento)}
                      disabled={isCancelando}
                      className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isCancelando 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 border border-red-200 hover:border-red-300'
                      }`}
                      title="Cancelar agendamento"
                    >
                      {isCancelando ? (
                        <>
                          <FaSpinner className="animate-spin w-4 h-4 mr-2" />
                          Cancelando...
                        </>
                      ) : (
                        <>
                          <FaTrash className="w-4 h-4 mr-2" />
                          Cancelar Agendamento
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Endereço do Convênio */}
      {enderecoModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Cabeçalho do Modal */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FaMapMarkerAlt className="mr-2 text-red-500" />
                  Endereço do Convênio
                </h3>
                <button
                  onClick={fecharEnderecoModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>

              {/* Conteúdo do Modal */}
              {enderecoModal.loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="flex items-center space-x-2">
                    <FaSpinner className="animate-spin h-5 w-5 text-blue-600" />
                    <span className="text-gray-600">Carregando endereço...</span>
                  </div>
                </div>
              ) : enderecoModal.endereco ? (
                <div className="space-y-4">
                  {/* Nome do Convênio */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">{enderecoModal.endereco.convenio_nome}</h4>
                    <p className="text-sm text-gray-500">Convênio</p>
                  </div>

                  {/* Endereço Completo */}
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">📍 Endereço:</h5>
                    <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                      <p className="text-sm text-gray-900">
                        {enderecoModal.endereco.endereco}
                        {enderecoModal.endereco.numero && `, ${enderecoModal.endereco.numero}`}
                        {enderecoModal.endereco.complemento && ` - ${enderecoModal.endereco.complemento}`}
                      </p>
                      <p className="text-sm text-gray-700">
                        {enderecoModal.endereco.bairro}
                        {enderecoModal.endereco.cidade && ` - ${enderecoModal.endereco.cidade}`}
                        {enderecoModal.endereco.estado && `/${enderecoModal.endereco.estado}`}
                      </p>
                      {enderecoModal.endereco.cep && (
                        <p className="text-sm text-gray-700">CEP: {enderecoModal.endereco.cep}</p>
                      )}
                    </div>
                  </div>

                  {/* Contatos */}
                  {(enderecoModal.endereco.telefone || enderecoModal.endereco.celular) && (
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">📞 Contatos:</h5>
                      <div className="space-y-1">
                        {enderecoModal.endereco.telefone && (
                          <p className="text-sm text-gray-900 flex items-center">
                            <FaPhone className="mr-2 text-gray-400 w-3 h-3" />
                            Telefone: {enderecoModal.endereco.telefone}
                          </p>
                        )}
                        {enderecoModal.endereco.celular && (
                          <p className="text-sm text-gray-900 flex items-center">
                            <FaPhone className="mr-2 text-gray-400 w-3 h-3" />
                            Celular: {enderecoModal.endereco.celular}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Botões de Ação */}
                  <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row gap-2">
                    {enderecoModal.endereco.latitude && enderecoModal.endereco.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${enderecoModal.endereco.latitude},${enderecoModal.endereco.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <FaMapMarkerAlt className="mr-2 w-4 h-4" />
                        Abrir no Google Maps
                      </a>
                    )}
                    <button
                      onClick={fecharEnderecoModal}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FaExclamationTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                  <p className="text-gray-600">Não foi possível carregar o endereço do convênio.</p>
                  <button
                    onClick={fecharEnderecoModal}
                    className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 