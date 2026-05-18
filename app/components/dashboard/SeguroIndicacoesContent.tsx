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

  // Link único do ZapSign fornecido pelo usuário
  const LINK_ZAPSIGN = 'https://app.zapsign.com.br/verificar/doc/a468e28f-77c0-4634-86da-1b84f4454593';

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

  // Polling: atualizar lista a cada 10 segundos
  useEffect(() => {
    if (!associadoData) return;

    const interval = setInterval(() => {
      fetchBeneficiarios();
    }, 10000); // 10 segundos

    return () => clearInterval(interval);
  }, [associadoData]);

  const fetchBeneficiarios = async () => {
    if (!associadoData) return;

    try {
      const response = await fetch(
        `/api/seguro-beneficiarios/listar?id_associado=${associadoData.id}&id_divisao=${associadoData.id_divisao}`,
        {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar beneficiários');
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.beneficiarios)) {
        setBeneficiarios(data.beneficiarios);
      }
    } catch (error) {
      console.error('Erro ao buscar beneficiários:', error);
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

      if (data.success) {
        toast.success(`${quantidade} beneficiário(s) criado(s) com sucesso!`);
        setQuantidade(0);
        await fetchBeneficiarios();
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

  const handleExcluir = async (id_beneficiario: number, status: string) => {
    console.log('🗑️ handleExcluir chamado:', { id_beneficiario, status, associadoData });

    if (status === 'assinado') {
      toast.error('Não é possível excluir beneficiário já assinado');
      return;
    }

    if (!associadoData) {
      toast.error('Dados do associado não disponíveis');
      return;
    }

    const confirmacao = window.confirm('Tem certeza que deseja excluir este beneficiário?');
    if (!confirmacao) return;

    setLoadingExcluir(id_beneficiario);

    const payload = {
      id_beneficiario,
      id_associado: associadoData.id
    };
    console.log('📤 Enviando payload para API excluir:', payload);

    try {
      const response = await fetch('/api/seguro-beneficiarios/excluir', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('📥 Resposta da API excluir:', { status: response.status, ok: response.ok });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir beneficiário');
      }

      const data = await response.json();

      if (data.success) {
        toast.success('Beneficiário excluído com sucesso!');
        await fetchBeneficiarios();
      } else {
        throw new Error(data.error || 'Erro ao excluir beneficiário');
      }
    } catch (error) {
      console.error('Erro ao excluir beneficiário:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir beneficiário');
    } finally {
      setLoadingExcluir(null);
    }
  };

  return (
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
                          href={LINK_ZAPSIGN}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
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
  );
}
