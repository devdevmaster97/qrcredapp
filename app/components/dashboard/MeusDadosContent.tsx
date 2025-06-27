'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FaMapMarkerAlt, FaPhone, FaEnvelope, FaUser, FaIdCard, FaSave, FaCheck, FaWhatsapp, FaSignInAlt } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

interface DadosAssociado {
  matricula: string;
  nome: string;
  email: string;
  cel: string;
  cpf: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  celwatzap: string;
  empregador: string;
}

interface StoredUser {
  cartao: string;
  nome?: string;
  matricula?: string;
  empregador?: string;
}

export default function MeusDadosContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosAssociado | null>(null);
  const [editando, setEditando] = useState(false);
  const [formData, setFormData] = useState<Partial<DadosAssociado>>({});
  const [salvando, setSalvando] = useState(false);
  const [tentativas, setTentativas] = useState(0);
  const [storedUser, setStoredUser] = useState<StoredUser | null>(null);

  // Verificar localStorage e sessão
  useEffect(() => {
    // Verificar localStorage
    try {
      const storedUserString = localStorage.getItem('qrcred_user');
      if (storedUserString) {
        const user = JSON.parse(storedUserString);
        console.log('Usuário encontrado no localStorage:', user);
        setStoredUser(user);
      }
    } catch (e) {
      console.error('Erro ao ler localStorage:', e);
    }

    // Mostrar no console o estado atual da sessão para debugging
    console.log('Status da sessão:', status);
    console.log('Dados da sessão:', session);
  }, [session, status]);

  // Efeito para buscar dados depois que verificamos todas as fontes de autenticação
  useEffect(() => {
    const cartao = session?.user?.cartao || storedUser?.cartao;
    
    if (cartao && !dados && !loading) {
      console.log('Cartão encontrado, buscando dados:', cartao);
      buscarDados(cartao);
    }
  }, [session, storedUser, dados, loading]);

  const buscarDados = async (cartao: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Dados do usuário a partir da sessão ou localStorage - para debugging
      console.log('Buscando dados com cartão:', cartao);
      console.log('Matrícula na sessão:', session?.user?.matricula || storedUser?.matricula);
      console.log('Empregador na sessão:', session?.user?.empregador || storedUser?.empregador);
      
      // Se não estiver disponível na sessão, use a API direta de autenticação
      const params = new URLSearchParams();
      params.append('cartao', cartao);
      
      console.log('Enviando requisição para localiza_associado_app_2.php');
      
      // Chamada direta à API PHP
      const response = await axios.post(
        'https://sas.makecard.com.br/localiza_associado_app_2.php',
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        }
      );
      
      console.log('Resposta da API localiza_associado_app_2.php:', response.data);
      
      // Verificar resposta e formatar dados
      if (response.data && (response.data.matricula || response.data.codigo)) {
        // Compatibilidade com diferentes formatos de resposta
        const dadosFormatados = {
          matricula: response.data.matricula || response.data.codigo,
          nome: response.data.nome,
          email: response.data.email || '',
          cel: response.data.cel || response.data.celular || '',
          cpf: response.data.cpf || '',
          cep: response.data.cep || '',
          endereco: response.data.endereco || '',
          numero: response.data.numero || '',
          bairro: response.data.bairro || '',
          cidade: response.data.cidade || '',
          uf: response.data.uf || response.data.estado || '',
          celwatzap: (response.data.celwatzap === "true" || response.data.celwatzap === true) ? "true" : "false",
          empregador: response.data.empregador || session?.user?.empregador || storedUser?.empregador || '',
        };
        
        setDados(dadosFormatados);
        setFormData(dadosFormatados);
        console.log('Dados formatados e carregados:', dadosFormatados);
      } else {
        console.error('Dados incompletos na resposta:', response.data);
        throw new Error('Dados do associado incompletos ou não encontrados');
      }
    } catch (error) {
      console.error('Erro ao buscar dados do associado:', error);
      setError('Não foi possível carregar seus dados. Tente novamente.');
      
      // Incrementar tentativas para possível retry automático
      setTentativas(prev => prev + 1);
      
      // Tentar novamente após um breve delay (apenas uma vez)
      if (tentativas === 0) {
        setTimeout(() => {
          console.log('Tentando novamente...');
          const cartao = session?.user?.cartao || storedUser?.cartao;
          if (cartao) {
            buscarDados(cartao);
          }
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked ? "true" : "false" : value;
    
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSalvando(true);
      setError(null);
      
      // Dados para enviar conforme a API
      const dadosAtualizacao = {
        codigo: formData.matricula || session?.user?.matricula || storedUser?.matricula,
        empregador: formData.empregador || session?.user?.empregador || storedUser?.empregador,
        email: formData.email,
        cel: formData.cel,
        cpf: formData.cpf,
        cep: formData.cep,
        endereco: formData.endereco,
        numero: formData.numero,
        bairro: formData.bairro,
        cidade: formData.cidade,
        estado: formData.uf,
        celzap: formData.celwatzap
      };
      
      console.log('Enviando dados para atualização:', dadosAtualizacao);
      
      // Enviar diretamente para a API PHP
      const params = new URLSearchParams();
      Object.entries(dadosAtualizacao).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
      
      const response = await axios.post(
        'https://sas.makecard.com.br/atualiza_associado_app.php',
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        }
      );
      
      console.log('Resposta da atualização:', response.data);
      
      if (response.data === "gravou") {
        // Atualizar dados locais com os novos valores
        setDados({...dados!, ...formData});
        setEditando(false);
        toast.success('Dados atualizados com sucesso!');
      } else {
        throw new Error('Falha ao atualizar os dados');
      }
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      setError('Não foi possível atualizar seus dados. Tente novamente mais tarde.');
      toast.error('Erro ao atualizar dados');
    } finally {
      setSalvando(false);
    }
  };

  const redirecionarParaLogin = () => {
    router.push('/login');
  };

  if ((status === 'loading' || loading) && !dados) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Carregando seus dados...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4">
        <p className="text-red-600">{error}</p>
        <div className="text-sm text-gray-500 mt-2 mb-4">
          <p>Sessão: {status}</p>
          <p>Cartão na sessão: {session?.user?.cartao || 'Não disponível'}</p>
          <p>Cartão no localStorage: {storedUser?.cartao || 'Não disponível'}</p>
        </div>
        <div className="flex flex-col items-center space-y-4 mt-4">
          <button
            onClick={() => {
              setTentativas(0);
              const cartao = session?.user?.cartao || storedUser?.cartao;
              if (cartao) {
                buscarDados(cartao);
              }
            }}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Carregando...' : 'Tentar novamente'}
          </button>
          
          <button
            onClick={redirecionarParaLogin}
            className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 flex items-center gap-2"
          >
            <FaSignInAlt /> Fazer login novamente
          </button>
        </div>
      </div>
    );
  }

  if (!dados && status === 'authenticated') {
    return (
      <div className="text-center p-4">
        <p className="text-amber-600 font-medium">Carregando dados do associado...</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mt-4"></div>
      </div>
    );
  }

  // Se não estiver autenticado nem por sessão nem por localStorage
  if (!dados && (status === 'unauthenticated' && !storedUser)) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-600 font-medium">Nenhum dado encontrado. Faça login novamente.</p>
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-gray-700">
          <p>Status da sessão: {status}</p>
          <p>Não foi encontrada nenhuma informação de login.</p>
        </div>
        <button
          onClick={redirecionarParaLogin}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 mx-auto"
        >
          <FaSignInAlt /> Fazer login
        </button>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-600">Nenhum dado encontrado. Faça login novamente.</p>
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-gray-700">
          <p>Status da sessão: {status}</p>
          <p>Verifique se você está corretamente autenticado no sistema.</p>
        </div>
        <button
          onClick={redirecionarParaLogin}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 mx-auto"
        >
          <FaSignInAlt /> Fazer login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Meus Dados</h2>
          {!editando && (
            <button
              onClick={() => setEditando(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <FaUser /> Editar Dados
            </button>
          )}
        </div>

        {editando ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <div className="mt-1 flex items-center border border-gray-300 rounded-md px-3 py-2 bg-gray-100">
                  <FaUser className="text-gray-400 mr-2" />
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome || ''}
                    className="block w-full border-0 p-0 bg-transparent focus:ring-0"
                    disabled
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Nome não pode ser alterado</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">CPF</label>
                <div className="mt-1 flex items-center border border-gray-300 rounded-md px-3 py-2 bg-gray-100">
                  <FaIdCard className="text-gray-400 mr-2" />
                  <input
                    type="text"
                    name="cpf"
                    value={formData.cpf || ''}
                    className="block w-full border-0 p-0 bg-transparent focus:ring-0"
                    disabled
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">CPF não pode ser alterado</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <div className="mt-1 flex items-center border border-gray-300 rounded-md px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <FaEnvelope className="text-gray-400 mr-2" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleInputChange}
                    className="block w-full border-0 p-0 focus:ring-0"
                    placeholder="Seu email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Celular</label>
                <div className="mt-1 flex items-center border border-gray-300 rounded-md px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <FaPhone className="text-gray-400 mr-2" />
                  <input
                    type="tel"
                    name="cel"
                    value={formData.cel || ''}
                    onChange={handleInputChange}
                    className="block w-full border-0 p-0 focus:ring-0"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center space-x-3 mt-2">
                  <input
                    type="checkbox"
                    id="celwatzap"
                    name="celwatzap"
                    checked={formData.celwatzap === "true"}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex items-center">
                    <FaWhatsapp className="text-green-500 mr-2" />
                    <label htmlFor="celwatzap" className="text-sm text-gray-700">
                      Este número também é WhatsApp
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">CEP</label>
                <div className="mt-1 flex items-center border border-gray-300 rounded-md px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <FaMapMarkerAlt className="text-gray-400 mr-2" />
                  <input
                    type="text"
                    name="cep"
                    value={formData.cep || ''}
                    onChange={handleInputChange}
                    className="block w-full border-0 p-0 focus:ring-0"
                    placeholder="00000-000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Número</label>
                <div className="mt-1 flex items-center border border-gray-300 rounded-md px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <input
                    type="text"
                    name="numero"
                    value={formData.numero || ''}
                    onChange={handleInputChange}
                    className="block w-full border-0 p-0 focus:ring-0"
                    placeholder="Número"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Endereço</label>
                <div className="mt-1 flex items-center border border-gray-300 rounded-md px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <FaMapMarkerAlt className="text-gray-400 mr-2" />
                  <input
                    type="text"
                    name="endereco"
                    value={formData.endereco || ''}
                    onChange={handleInputChange}
                    className="block w-full border-0 p-0 focus:ring-0"
                    placeholder="Endereço completo"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Bairro</label>
                <div className="mt-1 flex items-center border border-gray-300 rounded-md px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <input
                    type="text"
                    name="bairro"
                    value={formData.bairro || ''}
                    onChange={handleInputChange}
                    className="block w-full border-0 p-0 focus:ring-0"
                    placeholder="Bairro"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Cidade</label>
                <div className="mt-1 flex items-center border border-gray-300 rounded-md px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <input
                    type="text"
                    name="cidade"
                    value={formData.cidade || ''}
                    onChange={handleInputChange}
                    className="block w-full border-0 p-0 focus:ring-0"
                    placeholder="Cidade"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Estado</label>
                <div className="mt-1">
                  <select
                    name="uf"
                    value={formData.uf || ''}
                    onChange={handleInputChange}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Selecione o estado</option>
                    <option value="AC">Acre</option>
                    <option value="AL">Alagoas</option>
                    <option value="AP">Amapá</option>
                    <option value="AM">Amazonas</option>
                    <option value="BA">Bahia</option>
                    <option value="CE">Ceará</option>
                    <option value="DF">Distrito Federal</option>
                    <option value="ES">Espírito Santo</option>
                    <option value="GO">Goiás</option>
                    <option value="MA">Maranhão</option>
                    <option value="MT">Mato Grosso</option>
                    <option value="MS">Mato Grosso do Sul</option>
                    <option value="MG">Minas Gerais</option>
                    <option value="PA">Pará</option>
                    <option value="PB">Paraíba</option>
                    <option value="PR">Paraná</option>
                    <option value="PE">Pernambuco</option>
                    <option value="PI">Piauí</option>
                    <option value="RJ">Rio de Janeiro</option>
                    <option value="RN">Rio Grande do Norte</option>
                    <option value="RS">Rio Grande do Sul</option>
                    <option value="RO">Rondônia</option>
                    <option value="RR">Roraima</option>
                    <option value="SC">Santa Catarina</option>
                    <option value="SP">São Paulo</option>
                    <option value="SE">Sergipe</option>
                    <option value="TO">Tocantins</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={() => {
                  setEditando(false);
                  setFormData(dados || {});
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                disabled={salvando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                disabled={salvando}
              >
                {salvando ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <FaSave />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-100">
              <div className="flex items-center space-x-3 text-blue-800">
                <FaUser className="text-blue-500 text-xl" />
                <div>
                  <p className="text-sm text-blue-600">Nome completo</p>
                  <p className="font-medium text-lg">{dados?.nome}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex items-center space-x-3">
                  <FaIdCard className="text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">CPF</p>
                    <p className="font-medium">{dados?.cpf || 'Não informado'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex items-center space-x-3">
                  <FaEnvelope className="text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{dados?.email || 'Não informado'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex items-center space-x-3">
                  <FaPhone className="text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Celular</p>
                    <p className="font-medium">
                      {dados?.cel || 'Não informado'}
                      {dados?.celwatzap === "true" && (
                        <span className="inline-flex items-center ml-2 text-green-600">
                          <FaWhatsapp className="mr-1" /> WhatsApp
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 md:col-span-2">
                <div className="flex items-start space-x-3">
                  <FaMapMarkerAlt className="text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Endereço completo</p>
                    <p className="font-medium">
                      {dados?.endereco ? (
                        <>
                          {dados.endereco}, {dados.numero || 'S/N'} - {dados.bairro}
                          <br />
                          {dados.cidade} - {dados.uf}, {dados.cep}
                        </>
                      ) : (
                        'Endereço não informado'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 mt-6">
              <p className="text-xs text-gray-500 text-center">
                Dados atualizados. Para modificar suas informações, clique em "Editar Dados".
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 