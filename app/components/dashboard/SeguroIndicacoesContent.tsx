'use client';

import { useState, useEffect } from 'react';
import { FaShieldAlt, FaTrash, FaExternalLinkAlt, FaCheckCircle, FaClock } from 'react-icons/fa';
import toast from 'react-hot-toast';

interface Beneficiario {
  id_beneficiario: number;
  id_associado: number;
  id_divisao: number;
  cpf_zap?: string;
  nome_zap?: string;
  nome_beneficiario?: string;
  data_nascimento?: string;
  parentesco?: string;
  percentual?: number;
  status: 'pendente' | 'assinado';
  doc_token?: string;
  data_criacao: string;
  data_assinatura?: string;
}

interface AssociadoData {
  id: number;
  id_divisao: number;
  matricula: string;
  nome: string;
}

export default function SeguroIndicacoesContent() {
  const [quantidade, setQuantidade] = useState<number>(0);
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingExcluir, setLoadingExcluir] = useState<number | null>(null);
  const [associadoData, setAssociadoData] = useState<AssociadoData | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [beneficiarioToDelete, setBeneficiarioToDelete] = useState<{id: number, status: string} | null>(null);

  // Debug: Monitorar mudanças no estado beneficiarios
  useEffect(() => {
    console.log('🔔 Estado beneficiarios atualizado:', beneficiarios.length, 'beneficiários', beneficiarios);
  }, [beneficiarios]);

  // Função para gerar link do ZapSign por beneficiário
  const getZapSignLink = (beneficiario: Beneficiario): string => {
    if (beneficiario.doc_token) {
      return `https://app.zapsign.com.br/verificar/doc/${beneficiario.doc_token}`;
    }
    // Link padrão caso não tenha token (fallback)
    return 'https://app.zapsign.com.br/verificar/doc/a468e28f-77c0-4634-86da-1b84f4454593';
  };

  // Buscar dados do associado logado
  useEffect(() => {
    const fetchAssociado = async () => {
      try {
        const storedUser = localStorage.getItem('qrcred_user');
        if (!storedUser) {
          toast.error('Usuário não encontrado. Faça login novamente.');
          return;
        }

        const userData = JSON.parse(storedUser);
        const cartao = userData.cartao;

        if (!cartao) {
          toast.error('Cartão não encontrado.');
          return;
        }

        const formData = new FormData();
        formData.append('cartao', cartao);

        const response = await fetch('/api/localiza-associado', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Erro ao buscar dados do associado');
        }

        const data = await response.json();
        
        if (!data.id || !data.id_divisao) {
          throw new Error('Dados do associado incompletos');
        }

        setAssociadoData({
          id: data.id,
          id_divisao: data.id_divisao,
          matricula: data.matricula || '',
          nome: data.nome || ''
        });

      } catch (error) {
        console.error('Erro ao buscar associado:', error);
        toast.error('Erro ao carregar seus dados');
      }
    };

    fetchAssociado();
  }, []);

  // Buscar beneficiários quando associado estiver disponível
  useEffect(() => {
    if (associadoData) {
      fetchBeneficiarios();
    }
  }, [associadoData]);

  // Polling: atualizar lista a cada 30 segundos
  useEffect(() => {
    if (!associadoData) return;

    const interval = setInterval(() => {
      fetchBeneficiarios();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [associadoData]);

  const fetchBeneficiarios = async () => {
    if (!associadoData) return;

    console.log('🔄 Buscando beneficiários...', { id_associado: associadoData.id, id_divisao: associadoData.id_divisao });

    try {
      // Adicionar timestamp para forçar bypass de cache
      const timestamp = new Date().getTime();
      const response = await fetch(
        `/api/seguro-beneficiarios/listar?id_associado=${associadoData.id}&id_divisao=${associadoData.id_divisao}&_t=${timestamp}`,
        {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );

      console.log('📥 Resposta da API listar:', { status: response.status, ok: response.ok });

      if (!response.ok) {
        throw new Error('Erro ao buscar beneficiários');
      }

      const data = await response.json();
      console.log('📊 Dados recebidos da API:', data);
      
      if (data.success && Array.isArray(data.beneficiarios)) {
        console.log('✅ Atualizando lista de beneficiários:', data.beneficiarios.length, 'beneficiários');
        setBeneficiarios(data.beneficiarios);
      } else {
        console.warn('⚠️ Resposta inesperada da API:', data);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar beneficiários:', error);
    }
  };

  const handleConfirmarQuantidade = async () => {
    if (quantidade < 1 || quantidade > 4) {
      toast.error('Selecione uma quantidade entre 1 e 4');
      return;
    }

    if (!associadoData) {
      toast.error('Dados do associado não disponíveis');
      return;
    }

    // Verificar se já tem 4 beneficiários ativos
    const beneficiariosAtivos = beneficiarios.length;
    if (beneficiariosAtivos >= 4) {
      toast.error('Você já possui 4 beneficiários cadastrados. Exclua algum para adicionar novos.');
      return;
    }

    // Verificar se a quantidade solicitada + ativos ultrapassa 4
    if (beneficiariosAtivos + quantidade > 4) {
      toast.error(`Você só pode ter até 4 beneficiários. Você já tem ${beneficiariosAtivos}.`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/seguro-beneficiarios/criar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id_associado: associadoData.id,
          id_divisao: associadoData.id_divisao,
          quantidade
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar beneficiários');
      }

      const data = await response.json();
      console.log('📊 Resposta da API criar:', data);

      if (data.success) {
        toast.success(`${quantidade} beneficiário(s) criado(s) com sucesso!`);
        console.log('✅ Beneficiários criados, chamando fetchBeneficiarios...');
        setQuantidade(0);
        await fetchBeneficiarios();
        console.log('✅ fetchBeneficiarios concluído');
      } else {
        throw new Error(data.error || 'Erro ao criar beneficiários');
      }
    } catch (error) {
      console.error('Erro ao criar beneficiários:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar beneficiários');
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = (id_beneficiario: number, status: string) => {
    console.log('🗑️ handleExcluir chamado:', { id_beneficiario, status, associadoData });

    if (status === 'assinado') {
      toast.error('Não é possível excluir beneficiário já assinado');
      return;
    }

    if (!associadoData) {
      toast.error('Dados do associado não disponíveis');
      return;
    }

    // Abrir modal de confirmação
    setBeneficiarioToDelete({ id: id_beneficiario, status });
    setShowConfirmModal(true);
  };

  const confirmarExclusao = async () => {
    if (!beneficiarioToDelete || !associadoData) return;

    const { id: id_beneficiario } = beneficiarioToDelete;
    setShowConfirmModal(false);
    setLoadingExcluir(id_beneficiario);

    const payload = {
      id_beneficiario,
      id_associado: associadoData.id
    };
    console.log('📤 Enviando payload para API excluir:', payload);

    try {
      const response = await fetch('/api/seguro-beneficiarios/excluir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('📥 Resposta da API excluir:', { status: response.status, ok: response.ok });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn('⚠️ Erro ao excluir no backend, mas removendo da tela:', errorData.error);
        
        // Remove da lista local mesmo que o backend retorne erro
        setBeneficiarios(prev => prev.filter(b => b.id_beneficiario !== id_beneficiario));
        toast.success('Beneficiário removido da tela');
        setLoadingExcluir(null);
        return;
      }

      const data = await response.json();

      if (data.success) {
        toast.success('Beneficiário excluído com sucesso!');
        await fetchBeneficiarios();
      } else {
        // Remove da lista local mesmo que o backend retorne erro
        console.warn('⚠️ Backend retornou erro, mas removendo da tela:', data.error);
        setBeneficiarios(prev => prev.filter(b => b.id_beneficiario !== id_beneficiario));
        toast.success('Beneficiário removido da tela');
      }
    } catch (error) {
      console.error('Erro ao excluir beneficiário:', error);
      // Remove da lista local mesmo em caso de erro
      setBeneficiarios(prev => prev.filter(b => b.id_beneficiario !== id_beneficiario));
      toast.success('Beneficiário removido da tela');
    } finally {
      setLoadingExcluir(null);
    }
  };

  return (
    <>
      {/* Modal de Confirmação de Exclusão */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mr-4">
                <FaTrash className="text-red-600" size={20} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Confirmar Exclusão</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir este beneficiário? Esta ação não pode ser desfeita.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setBeneficiarioToDelete(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium flex items-center"
              >
                <FaTrash className="mr-2" size={14} />
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Cabeçalho */}
        <div className="mb-6">
        <div className="flex items-center mb-4">
          <FaShieldAlt className="text-purple-600 mr-3" size={32} />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Seguro Indicações</h2>
            <p className="text-gray-600">Indique até 4 beneficiários para o seguro</p>
          </div>
        </div>
      </div>

      {/* Seleção de Quantidade */}
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quantidade de Beneficiários a Indicar:
        </label>
        <div className="flex items-center gap-4">
          <select
            value={quantidade}
            onChange={(e) => setQuantidade(Number(e.target.value))}
            className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            disabled={loading || beneficiarios.length >= 4}
          >
            <option value={0}>Selecione</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
          <button
            onClick={handleConfirmarQuantidade}
            disabled={loading || quantidade === 0 || beneficiarios.length >= 4}
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Criando...' : 'Confirmar'}
          </button>
        </div>
        <p className="text-sm text-orange-600 mt-3">
          * Para mais de 4, entre em contato com a SAS pelo WhatsApp.
        </p>
        {beneficiarios.length >= 4 && (
          <p className="text-sm text-red-600 mt-2 font-medium">
            Você já possui 4 beneficiários cadastrados (limite máximo).
          </p>
        )}
      </div>

      {/* Lista de Beneficiários */}
      {beneficiarios.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Beneficiários Cadastrados ({beneficiarios.length}/4)
          </h3>
          <div className="space-y-4">
            {beneficiarios.map((beneficiario, index) => (
              <div
                key={beneficiario.id_beneficiario}
                className={`border rounded-lg p-4 ${
                  beneficiario.status === 'assinado'
                    ? 'bg-green-50 border-green-300'
                    : 'bg-white border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      {beneficiario.status === 'assinado' ? (
                        <FaCheckCircle className="text-green-600 mr-2" size={20} />
                      ) : (
                        <FaClock className="text-yellow-600 mr-2" size={20} />
                      )}
                      <h4 className="text-lg font-semibold text-gray-900">
                        Beneficiário {index + 1}
                      </h4>
                    </div>

                    {beneficiario.status === 'assinado' ? (
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-700">
                          <span className="font-medium">Nome:</span> {beneficiario.nome_beneficiario}
                        </p>
                        <p className="text-gray-700">
                          <span className="font-medium">Parentesco:</span> {beneficiario.parentesco}
                        </p>
                        <p className="text-gray-700">
                          <span className="font-medium">Data Nasc:</span> {beneficiario.data_nascimento}
                        </p>
                        <p className="text-gray-700">
                          <span className="font-medium">Percentual:</span> {beneficiario.percentual}%
                        </p>
                        <p className="text-green-700 font-medium mt-2">
                          ✅ Assinado em {new Date(beneficiario.data_assinatura!).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-yellow-700 font-medium">
                          🟡 Pendente - Aguardando assinatura
                        </p>
                        <a
                          href={getZapSignLink(beneficiario)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          <FaExternalLinkAlt className="mr-2" size={14} />
                          Preencher Dados no ZapSign
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Botão Excluir */}
                  {beneficiario.status === 'pendente' && (
                    <button
                      onClick={() => handleExcluir(beneficiario.id_beneficiario, beneficiario.status)}
                      disabled={loadingExcluir === beneficiario.id_beneficiario}
                      className="ml-4 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center text-sm"
                    >
                      <FaTrash className="mr-1" size={12} />
                      {loadingExcluir === beneficiario.id_beneficiario ? 'Excluindo...' : 'Excluir'}
                    </button>
                  )}
                  {beneficiario.status === 'assinado' && (
                    <div className="ml-4 px-3 py-2 bg-gray-200 text-gray-500 rounded-md text-sm cursor-not-allowed">
                      Não pode excluir
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensagem quando não há beneficiários */}
      {beneficiarios.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <FaShieldAlt className="mx-auto mb-4 text-gray-300" size={48} />
          <p className="text-lg">Nenhum beneficiário cadastrado ainda.</p>
          <p className="text-sm mt-2">Selecione a quantidade acima para começar.</p>
        </div>
      )}
    </div>
    </>
  );
}
