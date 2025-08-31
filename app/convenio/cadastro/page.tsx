'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaSpinner, FaArrowLeft } from 'react-icons/fa6';
import toast from 'react-hot-toast';
import Header from '@/app/components/Header';

interface Categoria {
  codigo: string;
  nome: string;
}

interface Estado {
  sigla: string;
  nome: string;
}

interface Cidade {
  id: string;
  nome: string;
}

export default function CadastroConvenio() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [tipoEmpresa, setTipoEmpresa] = useState<'1' | '2'>('1');
  const [formData, setFormData] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    telefone: '',
    celular: '',
    email: '',
    responsavel: '',
    categoria: '',
    cpf: '',
    cnpj: ''
  });

  // Funções de máscara e validação
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.slice(0, 11);
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.slice(0, 8);
  };

  const formatCelular = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 3) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatTelefone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleVoltar = () => {
    router.push('/convenio/login');
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoadingData(true);
        
        // Buscar categorias e estados em paralelo
        const [categoriasResponse, estadosResponse] = await Promise.all([
          fetch('/api/convenio/categorias'),
          fetch('/api/convenio/estados')
        ]);

        const [categoriasData, estadosData] = await Promise.all([
          categoriasResponse.json(),
          estadosResponse.json()
        ]);

        if (categoriasData.success) {
          setCategorias(categoriasData.data);
        } else {
          console.error('Erro ao buscar categorias:', categoriasData.message);
          toast.error('Erro ao carregar categorias. Algumas funcionalidades podem não funcionar corretamente.');
        }

        if (estadosData.success) {
          setEstados(estadosData.data);
        } else {
          console.error('Erro ao buscar estados:', estadosData.message);
          toast.error('Erro ao carregar estados. Algumas funcionalidades podem não funcionar corretamente.');
        }

      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        toast.error('Erro ao carregar dados do formulário. Verifique sua conexão e recarregue a página.');
      } finally {
        setLoadingData(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchCidades = async () => {
      if (formData.uf) {
        try {
          const response = await fetch(`/api/convenio/cidades?uf=${formData.uf}`);
          const data = await response.json();
          if (data.success) {
            setCidades(data.data);
          } else {
            console.error('Erro ao buscar cidades:', data.message);
            toast.error('Erro ao carregar cidades. Tente selecionar o estado novamente.');
          }
        } catch (error) {
          console.error('Erro ao buscar cidades:', error);
          toast.error('Erro ao carregar cidades. Verifique sua conexão.');
        }
      }
    };

    fetchCidades();
  }, [formData.uf]);

  const handleBuscarCep = async () => {
    if (formData.cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${formData.cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            endereco: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            uf: data.uf
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  const validateForm = () => {
    const camposObrigatorios = [
      'razaoSocial',
      'nomeFantasia',
      'cep',
      'endereco',
      'numero',
      'bairro',
      'cidade',
      'uf',
      'celular',
      'email',
      'responsavel',
      'categoria'
    ];

    for (const campo of camposObrigatorios) {
      if (!formData[campo as keyof typeof formData]) {
        toast.error(`O campo ${campo} é obrigatório`);
        return false;
      }
    }

    if (tipoEmpresa === '2' && !formData.cnpj) {
      toast.error('CNPJ é obrigatório para Pessoa Jurídica');
      return false;
    }

    if (tipoEmpresa === '1' && !formData.cpf) {
      toast.error('CPF é obrigatório para Pessoa Física');
      return false;
    }

    // Validar formato do email
    if (formData.email && !validateEmail(formData.email)) {
      toast.error('Por favor, digite um email válido');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission with multiple checks
    if (loading || isSubmitting) {
      console.log('Submission blocked - already processing');
      return;
    }
    
    if (!validateForm()) {
      return;
    }

    console.log('Starting form submission...');
    setLoading(true);
    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });
      formDataToSend.append('tipoEmpresa', tipoEmpresa);
      // Add required prolabore fields
      formDataToSend.append('prolabore', '4');
      formDataToSend.append('prolabore2', '0');

      console.log('Sending request to API...');
      const response = await fetch('/api/convenio/cadastro', {
        method: 'POST',
        body: formDataToSend
      });

      console.log('API response received:', response.status);
      const data = await response.json();
      console.log('API response data:', data);

      if (data.success) {
        console.log('Cadastro successful, showing success messages');
        // Show success message with more details
        toast.success('🎉 Cadastro realizado com sucesso!', {
          duration: 5000,
          position: 'top-center'
        });
        
        // Show additional info message
        setTimeout(() => {
          toast.success('📧 Verifique seu e-mail para obter as credenciais de acesso.', {
            duration: 6000,
            position: 'top-center'
          });
        }, 1000);
        
        // Redirect after showing messages
        setTimeout(() => {
          console.log('Redirecting to login...');
          router.push('/convenio/login');
        }, 3000);
      } else {
        console.log('Cadastro failed:', data.message);
        toast.error(data.message || 'Erro ao realizar cadastro');
      }
    } catch (error) {
      console.error('Error during cadastro:', error);
      toast.error('Erro ao realizar cadastro. Tente novamente.');
    } finally {
      console.log('Resetting submission states');
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  // Mostrar loading enquanto carrega dados iniciais
  if (loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header title="Cadastro de Novo Convênio" showBackButton onBackClick={handleVoltar} />
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FaSpinner className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Carregando formulário de cadastro...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header title="Cadastro de Novo Convênio" showBackButton onBackClick={handleVoltar} />
      
      <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                Cadastro de Novo Convênio
              </h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tipo de Empresa */}
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="1"
                      checked={tipoEmpresa === '1'}
                      onChange={(e) => setTipoEmpresa(e.target.value as '1' | '2')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Pessoa Física</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="2"
                      checked={tipoEmpresa === '2'}
                      onChange={(e) => setTipoEmpresa(e.target.value as '1' | '2')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Pessoa Jurídica</span>
                  </label>
                </div>

                {/* Dados Principais */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="razaoSocial" className="block text-sm font-medium text-gray-700">
                      Razão Social
                    </label>
                    <input
                      type="text"
                      id="razaoSocial"
                      value={formData.razaoSocial}
                      onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="nomeFantasia" className="block text-sm font-medium text-gray-700">
                      Nome Fantasia
                    </label>
                    <input
                      type="text"
                      id="nomeFantasia"
                      value={formData.nomeFantasia}
                      onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor={tipoEmpresa === '1' ? 'cpf' : 'cnpj'} className="block text-sm font-medium text-gray-700">
                      {tipoEmpresa === '1' ? 'CPF' : 'CNPJ'}
                    </label>
                    <input
                      type="text"
                      id={tipoEmpresa === '1' ? 'cpf' : 'cnpj'}
                      value={tipoEmpresa === '1' ? formData.cpf : formData.cnpj}
                      onChange={(e) => {
                        const field = tipoEmpresa === '1' ? 'cpf' : 'cnpj';
                        const value = field === 'cpf' ? formatCPF(e.target.value) : e.target.value;
                        setFormData({ ...formData, [field]: value });
                      }}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="categoria" className="block text-sm font-medium text-gray-700">
                      Categoria
                    </label>
                    <select
                      id="categoria"
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Selecione uma categoria</option>
                      {categorias.map((categoria) => (
                        <option key={categoria.codigo} value={categoria.codigo}>
                          {categoria.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Endereço */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="cep" className="block text-sm font-medium text-gray-700">
                      CEP
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="text"
                        id="cep"
                        value={formData.cep}
                        onChange={(e) => setFormData({ ...formData, cep: formatCEP(e.target.value) })}
                        onBlur={handleBuscarCep}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleBuscarCep}
                        className="ml-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Buscar
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="endereco" className="block text-sm font-medium text-gray-700">
                      Endereço
                    </label>
                    <input
                      type="text"
                      id="endereco"
                      value={formData.endereco}
                      onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="numero" className="block text-sm font-medium text-gray-700">
                      Número
                    </label>
                    <input
                      type="text"
                      id="numero"
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="complemento" className="block text-sm font-medium text-gray-700">
                      Complemento
                    </label>
                    <input
                      type="text"
                      id="complemento"
                      value={formData.complemento}
                      onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="bairro" className="block text-sm font-medium text-gray-700">
                      Bairro
                    </label>
                    <input
                      type="text"
                      id="bairro"
                      value={formData.bairro}
                      onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="uf" className="block text-sm font-medium text-gray-700">
                      Estado
                    </label>
                    <select
                      id="uf"
                      value={formData.uf}
                      onChange={(e) => setFormData({ ...formData, uf: e.target.value, cidade: '' })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Selecione um estado</option>
                      {estados.map((estado) => (
                        <option key={estado.sigla} value={estado.sigla}>
                          {estado.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="cidade" className="block text-sm font-medium text-gray-700">
                      Cidade
                    </label>
                    <select
                      id="cidade"
                      value={formData.cidade}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      disabled={!formData.uf}
                    >
                      <option value="">Selecione uma cidade</option>
                      {cidades.map((cidade) => (
                        <option key={cidade.id} value={cidade.nome}>
                          {cidade.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Contato */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="telefone" className="block text-sm font-medium text-gray-700">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: formatTelefone(e.target.value) })}
                      placeholder="(35) 3200-0032"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="celular" className="block text-sm font-medium text-gray-700">
                      Celular
                    </label>
                    <input
                      type="tel"
                      id="celular"
                      value={formData.celular}
                      onChange={(e) => setFormData({ ...formData, celular: formatCelular(e.target.value) })}
                      placeholder="(35) 9 9812-0032"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      E-mail
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="exemplo@email.com"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="responsavel" className="block text-sm font-medium text-gray-700">
                      Responsável
                    </label>
                    <input
                      type="text"
                      id="responsavel"
                      value={formData.responsavel}
                      onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="pt-5">
                  <button
                    type="submit"
                    disabled={loading || isSubmitting}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(loading || isSubmitting) ? (
                      <FaSpinner className="animate-spin h-5 w-5" />
                    ) : (
                      'Cadastrar Convênio'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 