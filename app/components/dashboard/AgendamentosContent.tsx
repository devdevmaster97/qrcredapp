'use client';

import { useState, useEffect } from 'react';
import { FaCalendarCheck, FaClock, FaUserMd, FaStethoscope, FaSpinner, FaExclamationTriangle, FaBuilding, FaInfoCircle } from 'react-icons/fa';
import axios from 'axios';

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
}

export default function AgendamentosContent() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            profissional: agendamento.profissional || 'NÃO INFORMADO',
            especialidade: agendamento.especialidade || 'NÃO INFORMADO',
            convenio_nome: agendamento.convenio_nome || 'NÃO INFORMADO',
            status: agendamento.status
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
        <p className="text-gray-600">
          Para fazer um agendamento, vá no menu <strong>Convênios</strong>, escolha o convênio que deseja agendar e clique no botão <strong>Agendar</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          {agendamentos.length} agendamento{agendamentos.length !== 1 ? 's' : ''} encontrado{agendamentos.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-4">
        {agendamentos.map((agendamento) => {
          const statusInfo = getStatusInfo(agendamento.status);
          
          return (
            <div key={agendamento.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                      {statusInfo.icon}
                      <span className="ml-1">{statusInfo.text}</span>
                    </span>
                    <span className="text-sm text-gray-500">
                      #{agendamento.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Campo Profissional */}
                    <div className="flex items-center space-x-2">
                      <FaUserMd className="text-blue-500 w-4 h-4" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {hasValidValue(agendamento.profissional) 
                            ? agendamento.profissional 
                            : 'Profissional não informado'
                          }
                        </p>
                        <p className="text-xs text-gray-500">Profissional</p>
                      </div>
                      {!hasValidValue(agendamento.profissional) && (
                        <FaInfoCircle className="text-amber-400 w-3 h-3" title="Dado não disponível" />
                      )}
                    </div>

                    {/* Campo Especialidade */}
                    <div className="flex items-center space-x-2">
                      <FaStethoscope className="text-green-500 w-4 h-4" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {hasValidValue(agendamento.especialidade) 
                            ? agendamento.especialidade 
                            : 'Especialidade não informada'
                          }
                        </p>
                        <p className="text-xs text-gray-500">Especialidade</p>
                      </div>
                      {!hasValidValue(agendamento.especialidade) && (
                        <FaInfoCircle className="text-amber-400 w-3 h-3" title="Dado não disponível" />
                      )}
                    </div>

                    {/* Campo Convênio */}
                    <div className="flex items-center space-x-2">
                      <FaBuilding className="text-purple-500 w-4 h-4" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {hasValidValue(agendamento.convenio_nome) 
                            ? agendamento.convenio_nome 
                            : 'Convênio não informado'
                          }
                        </p>
                        <p className="text-xs text-gray-500">Convênio</p>
                      </div>
                      {!hasValidValue(agendamento.convenio_nome) && (
                        <FaInfoCircle className="text-amber-400 w-3 h-3" title="Dado não disponível" />
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
                  </div>

                  {/* Informação sobre campos em branco */}
                  {(!hasValidValue(agendamento.profissional) || 
                    !hasValidValue(agendamento.especialidade) || 
                    !hasValidValue(agendamento.convenio_nome)) && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FaInfoCircle className="text-amber-600 w-4 h-4" />
                        <p className="text-sm text-amber-700">
                          Alguns dados deste agendamento não foram informados no momento da solicitação.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 