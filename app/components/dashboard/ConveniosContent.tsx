'use client';

import { useState, useEffect, useRef } from 'react';
import { FaSearch, FaUserMd, FaHospital, FaStethoscope, FaSpinner, FaCalendarAlt, FaClock, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface ConvenioProfissional {
  convenio_nome: string;
  especialidade: string;
  profissional: string;
  tipo_estabelecimento: string;
  cod_convenio?: string | number;
  id_convenio?: string | number;
  codigo_convenio?: string | number;
}

type OrdenacaoTipo = 'alfabetica' | 'convenio' | 'especialidade';

export default function ConveniosContent() {
  const router = useRouter();
  const [profissionais, setProfissionais] = useState<ConvenioProfissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [ordenacao, setOrdenacao] = useState<OrdenacaoTipo>('convenio');
  const [agendandoIds, setAgendandoIds] = useState<Set<string>>(new Set());
  const processingRef = useRef<Set<string>>(new Set());
  const lastRequestTime = useRef<Map<string, number>>(new Map());

  // Estados para o modal de agendamento
  const [modalAberto, setModalAberto] = useState(false);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<ConvenioProfissional | null>(null);
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [horaAgendamento, setHoraAgendamento] = useState('');

  // Função para limpar estados órfãos após timeout
  const clearProcessingState = (profissionalId: string) => {
    setTimeout(() => {
      processingRef.current.delete(profissionalId);
      lastRequestTime.current.delete(profissionalId);
      setAgendandoIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(profissionalId);
        return newSet;
      });
      console.log('🧹 Limpeza automática completa:', profissionalId);
    }, 30000); // 30 segundos timeout
  };

  // Buscar profissionais dos convênios
  const fetchProfissionais = async () => {
    try {
      setLoading(true);
      console.log('🔍 BUSCANDO PROFISSIONAIS...');
      const response = await axios.post('/api/convenios');

      console.log('📥 RESPOSTA DA API CONVENIOS:', {
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        length: Array.isArray(response.data) ? response.data.length : 'N/A'
      });

      if (Array.isArray(response.data)) {
        console.log('📋 DADOS RECEBIDOS DA API CONVENIOS:', response.data.slice(0, 3)); // primeiros 3 itens
        setProfissionais(response.data);
      } else {
        throw new Error('Formato de resposta inválido');
      }
    } catch (error) {
      console.error('Erro ao buscar profissionais:', error);
      if (axios.isAxiosError(error) && error.response) {
        setError(`Não foi possível carregar os profissionais: ${error.response.data.error || error.message}`);
      } else {
        setError('Não foi possível carregar os profissionais. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfissionais();
  }, []);

  // Função auxiliar para garantir que temos uma string válida
  const getStringValue = (value: any): string => {
    if (value === null || value === undefined || typeof value !== 'string') {
      return '';
    }
    return value.toString();
  };

  // Ordenar profissionais
  const ordenarProfissionais = (profissionais: ConvenioProfissional[]) => {
    switch (ordenacao) {
      case 'alfabetica':
        return [...profissionais].sort((a, b) => {
          const nomeA = getStringValue(a.profissional);
          const nomeB = getStringValue(b.profissional);
          return nomeA.localeCompare(nomeB);
        });
      case 'convenio':
        return [...profissionais].sort((a, b) => {
          const convenioA = getStringValue(a.convenio_nome);
          const convenioB = getStringValue(b.convenio_nome);
          const convenioCompare = convenioA.localeCompare(convenioB);
          if (convenioCompare !== 0) return convenioCompare;

          const especialidadeA = getStringValue(a.especialidade);
          const especialidadeB = getStringValue(b.especialidade);
          const especialidadeCompare = especialidadeA.localeCompare(especialidadeB);
          if (especialidadeCompare !== 0) return especialidadeCompare;

          const profissionalA = getStringValue(a.profissional);
          const profissionalB = getStringValue(b.profissional);
          return profissionalA.localeCompare(profissionalB);
        });
      case 'especialidade':
        return [...profissionais].sort((a, b) => {
          const especialidadeA = getStringValue(a.especialidade);
          const especialidadeB = getStringValue(b.especialidade);
          const especialidadeCompare = especialidadeA.localeCompare(especialidadeB);
          if (especialidadeCompare !== 0) return especialidadeCompare;

          const profissionalA = getStringValue(a.profissional);
          const profissionalB = getStringValue(b.profissional);
          return profissionalA.localeCompare(profissionalB);
        });
      default:
        return profissionais;
    }
  };

  // Função para abrir modal de agendamento
  const abrirModalAgendamento = (profissional: ConvenioProfissional) => {
    setProfissionalSelecionado(profissional);
    setDataAgendamento('');
    setHoraAgendamento('');
    setModalAberto(true);
  };

  // Função para fechar modal
  const fecharModal = () => {
    setModalAberto(false);
    setProfissionalSelecionado(null);
    setDataAgendamento('');
    setHoraAgendamento('');
  };

  // Função para confirmar agendamento com data e hora
  const confirmarAgendamento = async () => {
    if (!profissionalSelecionado) return;

    // Validar data e hora
    if (!dataAgendamento || !horaAgendamento) {
      toast.error('Por favor, informe a data e hora desejadas para o agendamento.');
      return;
    }

    // Validar se a data não é no passado
    const dataHoraAgendamento = new Date(`${dataAgendamento}T${horaAgendamento}`);
    const agora = new Date();

    if (dataHoraAgendamento < agora) {
      toast.error('A data e hora do agendamento não podem ser no passado.');
      return;
    }

    // Fechar modal e processar agendamento
    fecharModal();
    await handleAgendar(profissionalSelecionado, dataHoraAgendamento);
  };

  // Função para lidar com agendamento
  const handleAgendar = async (profissional: ConvenioProfissional, dataHoraAgendamento?: Date) => {
    const nomeProfissional = getStringValue(profissional.profissional);
    const especialidade = getStringValue(profissional.especialidade);
    const convenio = getStringValue(profissional.convenio_nome);

    // Detectar código do convênio automaticamente dos campos disponíveis
    let codigoConvenio = '1'; // valor padrão

    if (profissional.cod_convenio) {
      codigoConvenio = profissional.cod_convenio.toString();
    } else if (profissional.id_convenio) {
      codigoConvenio = profissional.id_convenio.toString();
    } else if (profissional.codigo_convenio) {
      codigoConvenio = profissional.codigo_convenio.toString();
    } else {
      // Como o backend não retorna código, vamos usar hash do nome do convênio
      const hashConvenio = convenio.replace(/\s+/g, '').toLowerCase().split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      codigoConvenio = Math.abs(hashConvenio % 1000).toString(); // número entre 0-999
    }

    // Criar ID único para este profissional baseado nos dados
    const profissionalId = `${nomeProfissional}-${especialidade}-${convenio}`.replace(/\s+/g, '-');
    const now = Date.now();

    // PROTEÇÃO TRIPLA CONTRA DUPLICAÇÃO
    // 1. Verificar se já está processando
    if (processingRef.current.has(profissionalId) || agendandoIds.has(profissionalId)) {
      console.log('🚫 DUPLICAÇÃO BLOQUEADA - Agendamento já em processamento:', profissionalId);
      toast.error('Aguarde! Este agendamento já está sendo processado.');
      return;
    }

    // 2. Verificar se houve uma requisição muito recente (menos de 3 segundos)
    const lastTime = lastRequestTime.current.get(profissionalId);
    if (lastTime && (now - lastTime) < 3000) {
      console.log('🚫 DUPLICAÇÃO BLOQUEADA - Requisição muito recente:', profissionalId);
      toast.error('Aguarde alguns segundos antes de tentar novamente.');
      return;
    }

    // 3. Registrar tempo da requisição e marcar como processando IMEDIATAMENTE
    lastRequestTime.current.set(profissionalId, now);
    processingRef.current.add(profissionalId);
    setAgendandoIds(prev => new Set(prev).add(profissionalId));

    console.log(`🔒 BLOQUEIO ATIVADO para ${profissionalId} às ${new Date().toISOString()}`);

    // Configurar limpeza automática como fallback
    clearProcessingState(profissionalId);

    // Gerar ID único para esta requisição
    const requestId = Math.random().toString(36).substr(2, 9);
    console.log(`🚀 [${requestId}] Iniciando agendamento:`, profissionalId);

    try {
      console.log(`🔍 [${requestId}] STEP 1: Buscando dados do usuário logado...`);

      // Buscar dados do usuário logado
      const storedUser = localStorage.getItem('qrcred_user');
      if (!storedUser) {
        console.log(`❌ [${requestId}] Usuário não encontrado no localStorage`);
        toast.error('Usuário não encontrado. Faça login novamente.');
        return;
      }

      const userData = JSON.parse(storedUser);
      console.log(`✅ [${requestId}] Dados do usuário obtidos:`, userData);

      console.log(`🔍 [${requestId}] STEP 2: Buscando dados do associado...`);

      // Buscar dados completos do associado
      const localizaResponse = await axios.post('/api/localiza-associado', {
        cartao: userData.cartao
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`📥 [${requestId}] Resposta do localiza-associado:`, localizaResponse.data);

      if (!localizaResponse.data || !localizaResponse.data.matricula) {
        console.log(`❌ [${requestId}] Dados do associado inválidos:`, localizaResponse.data);
        toast.error('Não foi possível obter dados do associado.');
        return;
      }

      const associadoData = localizaResponse.data;
      console.log(`✅ [${requestId}] Dados do associado válidos:`, associadoData);

      // Preparar dados para o agendamento com código correto do convênio
      const agendamentoData: any = {
        cod_associado: associadoData.matricula,
        id_empregador: associadoData.empregador,
        cod_convenio: codigoConvenio,
        profissional: nomeProfissional,
        especialidade: especialidade,
        convenio_nome: convenio
      };
      
      // Adicionar data pretendida se foi informada
      if (dataHoraAgendamento) {
        agendamentoData.data_pretendida = dataHoraAgendamento.toISOString();
      }

      console.log('📤 DADOS FINAIS PARA ENVIO:', JSON.stringify(agendamentoData, null, 2));
      console.log('📤 VERIFICAÇÃO DOS CAMPOS:', {
        profissional_length: nomeProfissional?.length || 0,
        profissional_value: `"${nomeProfissional}"`,
        especialidade_length: especialidade?.length || 0,
        especialidade_value: `"${especialidade}"`,
        convenio_nome_length: convenio?.length || 0,
        convenio_nome_value: `"${convenio}"`,
        cod_convenio_value: `"${codigoConvenio}"`
      });

      // Enviar solicitação de agendamento
      console.log(`🔍 [${requestId}] STEP 3: Enviando para /api/agendamento...`);
      console.log(`📤 [${requestId}] Dados sendo enviados:`, agendamentoData);

      const response = await axios.post('/api/agendamento', agendamentoData, {
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId
        }
      });

      console.log(`📥 [${requestId}] Resposta da API agendamento:`, response.data);
      console.log(`📥 [${requestId}] Status da resposta:`, response.status);

      if (response.data.success) {
        console.log(`✅ [${requestId}] Agendamento bem-sucedido!`);
        const isDuplicatePrevented = response.data.data?.duplicate_prevented;
        console.log(`✅ [${requestId}] Resposta recebida:`, {
          duplicate_prevented: isDuplicatePrevented,
          new_record: response.data.data?.new_record,
          id: response.data.data?.id
        });

        if (isDuplicatePrevented) {
          toast.success(`Agendamento já existia!\n\nProfissional: ${nomeProfissional}\nEspecialidade: ${especialidade}\n\n(Duplicação evitada automaticamente)`, {
            duration: 4000
          });
        } else {
          toast.success(`Agendamento solicitado com sucesso!\n\nProfissional: ${nomeProfissional}\nEspecialidade: ${especialidade}\nConvênio: ${convenio}`);
        }

        // Redirecionar para a página de agendamentos
        setTimeout(() => {
          router.push('/dashboard/agendamentos');
        }, 1500);
      } else {
        console.log(`❌ [${requestId}] Agendamento falhou - Resposta completa:`, response.data);
        console.log(`❌ [${requestId}] Erro na resposta:`, response.data.message);
        toast.error(response.data.message || 'Erro ao solicitar agendamento');
      }

    } catch (error) {
      console.error(`❌ [${requestId}] ERRO CAPTURADO:`, error);
      console.error(`❌ [${requestId}] Stack trace:`, error instanceof Error ? error.stack : 'N/A');
      console.error(`❌ [${requestId}] Tipo do erro:`, typeof error);

      if (axios.isAxiosError(error)) {
        console.error(`❌ [${requestId}] Axios Error Details:`, {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          config: error.config
        });

        if (error.response?.data?.message) {
          toast.error(error.response.data.message);
        } else {
          toast.error(`Erro de conexão: ${error.message}`);
        }
      } else {
        console.error(`❌ [${requestId}] Erro genérico:`, error);
        toast.error('Erro ao processar agendamento. Tente novamente.');
      }
    } finally {
      console.log(`🔄 [${requestId}] FINALLY: Limpando estados...`);

      // Limpar TODOS os estados de processamento
      processingRef.current.delete(profissionalId);
      setAgendandoIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(profissionalId);
        return newSet;
      });

      // Timeout extra para garantir limpeza (fallback)
      setTimeout(() => {
        processingRef.current.delete(profissionalId);
        setAgendandoIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(profissionalId);
          return newSet;
        });
        console.log(`🧹 [${requestId}] Limpeza extra concluída para:`, profissionalId);
      }, 1000);

      console.log(`✅ [${requestId}] Estados liberados para:`, profissionalId);
    }
  };

  // Filtrar e agrupar profissionais
  const profissionaisFiltradosEAgrupados = () => {
    let filtrados = profissionais;

    // Aplicar busca
    if (searchTerm) {
      filtrados = filtrados.filter(prof => {
        const profissionalNome = getStringValue(prof.profissional).toLowerCase();
        const convenioNome = getStringValue(prof.convenio_nome).toLowerCase();
        const especialidadeNome = getStringValue(prof.especialidade).toLowerCase();
        const tipoEstabelecimento = getStringValue(prof.tipo_estabelecimento).toLowerCase();
        const termoBusca = searchTerm.toLowerCase();

        return profissionalNome.includes(termoBusca) ||
               convenioNome.includes(termoBusca) ||
               especialidadeNome.includes(termoBusca) ||
               tipoEstabelecimento.includes(termoBusca);
      });
    }

    // Ordenar
    filtrados = ordenarProfissionais(filtrados);

    // Agrupar por convênio e depois por tipo de estabelecimento
    return filtrados.reduce((acc, prof) => {
      const convenio = getStringValue(prof.convenio_nome) || 'Sem Convênio';
      const tipo = getStringValue(prof.tipo_estabelecimento) || 'Não informado';

      if (!acc[convenio]) {
        acc[convenio] = {};
      }
      if (!acc[convenio][tipo]) {
        acc[convenio][tipo] = [];
      }
      acc[convenio][tipo].push(prof);
      return acc;
    }, {} as Record<string, Record<string, ConvenioProfissional[]>>);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchProfissionais}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const profissionaisAgrupados = profissionaisFiltradosEAgrupados();

  return (
    <div className="space-y-6">
      {/* Barra de Pesquisa e Ordenação */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar profissionais, convênios ou especialidades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={ordenacao}
          onChange={(e) => setOrdenacao(e.target.value as OrdenacaoTipo)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="convenio">Por Convênio</option>
          <option value="alfabetica">Ordem Alfabética (Profissional)</option>
          <option value="especialidade">Por Especialidade</option>
        </select>
      </div>

      {/* Lista de Profissionais Agrupados por Convênio */}
      <div className="space-y-8">
        {Object.entries(profissionaisAgrupados).map(([convenio, tiposEstabelecimento]) => (
          <div key={convenio} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-blue-600 p-4">
              <h2 className="text-xl font-bold text-white flex items-center">
                <FaHospital className="mr-2" />
                {convenio}
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {Object.entries(tiposEstabelecimento).map(([tipo, profissionaisList]) => (
                <div key={tipo} className="p-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                    <FaStethoscope className="mr-2 text-blue-500" />
                    {tipo}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profissionaisList.map((prof, index) => {
                      const nomeProfissional = getStringValue(prof.profissional) || 'Profissional não informado';
                      const especialidade = getStringValue(prof.especialidade) || 'Especialidade não informada';
                      const convenio = getStringValue(prof.convenio_nome) || 'Convênio não informado';
                      const profissionalId = `${nomeProfissional}-${especialidade}-${convenio}`.replace(/\s+/g, '-');
                      const isAgendando = agendandoIds.has(profissionalId);

                      return (
                        <div key={`${nomeProfissional}-${index}`} className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start flex-1">
                              <FaUserMd className="text-blue-500 mt-1 mr-3 flex-shrink-0" />
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{nomeProfissional}</h4>
                                <p className="text-sm text-gray-600 mt-1">{especialidade}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => abrirModalAgendamento(prof)}
                              disabled={isAgendando}
                              className={`ml-3 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                                isAgendando
                                  ? 'bg-gray-400 cursor-not-allowed'
                                  : 'bg-green-600 hover:bg-green-700'
                              }`}
                            >
                              {isAgendando ? (
                                <div className="flex items-center">
                                  <FaSpinner className="animate-spin mr-2" />
                                  Agendando...
                                </div>
                              ) : (
                                'Agendar'
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Agendamento */}
      {modalAberto && profissionalSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <FaCalendarAlt className="mr-2 text-blue-500" />
                Agendar Consulta
              </h3>
              <button
                onClick={fecharModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Informações do Profissional */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Profissional:</p>
              <p className="font-medium text-gray-900">
                {getStringValue(profissionalSelecionado.profissional)}
              </p>
              <p className="text-sm text-gray-600 mt-1">Especialidade:</p>
              <p className="font-medium text-gray-900">
                {getStringValue(profissionalSelecionado.especialidade)}
              </p>
            </div>

            {/* Campos de Data e Hora */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <FaCalendarAlt className="mr-2 text-blue-500" />
                  Data do Agendamento
                </label>
                <input
                  type="date"
                  value={dataAgendamento}
                  onChange={(e) => setDataAgendamento(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <FaClock className="mr-2 text-blue-500" />
                  Hora do Agendamento
                </label>
                <input
                  type="time"
                  value={horaAgendamento}
                  onChange={(e) => setHoraAgendamento(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-3">
              <button
                onClick={fecharModal}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAgendamento}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}