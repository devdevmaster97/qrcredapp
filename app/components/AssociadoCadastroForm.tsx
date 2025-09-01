'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaSpinner, FaCheckCircle, FaExclamationTriangle, FaUser, FaIdCard, FaCalendarAlt, FaPhone, FaEnvelope, FaMapMarkerAlt, FaHome, FaBarcode, FaBuilding } from 'react-icons/fa';
import axios from 'axios';

interface AssociadoCadastroFormProps {
  cartao: string;
  matricula: string;
  userInfo: any;
}

interface Empregador {
  id: number;
  nome: string;
}

export default function AssociadoCadastroForm({ cartao, matricula, userInfo }: AssociadoCadastroFormProps) {
  const router = useRouter();
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    nome: userInfo?.nome || '',
    cpf: userInfo?.cpf || '',
    rg: '',
    nascimento: '',
    email: userInfo?.email || '',
    celular: userInfo?.cel || '',
    telefone_residencial: userInfo?.telres || '',
    telefone_comercial: userInfo?.telcom || '',
    cep: userInfo?.cep || '',
    endereco: userInfo?.endereco || '',
    numero: userInfo?.numero || '',
    complemento: userInfo?.complemento || '',
    bairro: userInfo?.bairro || '',
    cidade: userInfo?.cidade || '',
    uf: userInfo?.uf || '',
    whatsapp: userInfo?.celwatzap === true || userInfo?.celwatzap === 'S' || userInfo?.celwatzap === '1',
    local: userInfo?.local || '',
    secretaria: userInfo?.secretaria || '0',
    C_codigo_assoc: userInfo?.codigo || '',
    C_empregador_assoc: userInfo?.empregador || '',
  });
  
  // Estado de carregamento e mensagens
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');
  const [cepLoading, setCepLoading] = useState(false);
  const [empregadores, setEmpregadores] = useState<Empregador[]>([]);
  const [carregandoEmpregadores, setCarregandoEmpregadores] = useState(false);
  
  // Buscar lista de empregadores ao carregar o componente
  useEffect(() => {
    buscarEmpregadores();
  }, []);
  
  // Função para buscar a lista de empregadores
  const buscarEmpregadores = async () => {
    setCarregandoEmpregadores(true);
    try {
      const response = await axios.get('/api/empregadores');
      if (response.data && Array.isArray(response.data)) {
        setEmpregadores(response.data);
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        setEmpregadores(response.data.data);
      } else {
        console.error('Formato de resposta inválido para empregadores:', response.data);
      }
    } catch (error) {
      console.error('Erro ao buscar empregadores:', error);
    } finally {
      setCarregandoEmpregadores(false);
    }
  };
  
  // Atualizar o estado do formulário quando as userInfo forem alteradas
  useEffect(() => {
    if (userInfo) {
      setFormData(prev => ({
        ...prev,
        nome: userInfo.nome || prev.nome,
        cpf: userInfo.cpf || prev.cpf,
        email: userInfo.email || prev.email,
        celular: userInfo.cel || prev.celular,
        telefone_residencial: userInfo.telres || prev.telefone_residencial,
        telefone_comercial: userInfo.telcom || prev.telefone_comercial,
        cep: userInfo.cep || prev.cep,
        endereco: userInfo.endereco || prev.endereco,
        numero: userInfo.numero || prev.numero,
        complemento: userInfo.complemento || prev.complemento,
        bairro: userInfo.bairro || prev.bairro,
        cidade: userInfo.cidade || prev.cidade,
        uf: userInfo.uf || prev.uf,
        whatsapp: userInfo.celwatzap === true || userInfo.celwatzap === 'S' || userInfo.celwatzap === '1',
        local: userInfo.local || prev.local,
        secretaria: userInfo.secretaria || prev.secretaria,
        C_codigo_assoc: userInfo.codigo || prev.C_codigo_assoc,
        C_empregador_assoc: userInfo.empregador || prev.C_empregador_assoc
      }));
    }
  }, [userInfo]);
  
  // Função para validar CPF
  const validarCPF = (cpf: string): boolean => {
    if (!cpf || cpf.length !== 11) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    // Validar primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    let digito1 = resto < 2 ? 0 : resto;
    
    if (parseInt(cpf.charAt(9)) !== digito1) return false;
    
    // Validar segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    let digito2 = resto < 2 ? 0 : resto;
    
    return parseInt(cpf.charAt(10)) === digito2;
  };

  // Formatar CPF para exibição
  const formatCPF = (cpf: string) => {
    if (!cpf) return '';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Formatar telefone para exibição
  const formatTelefone = (telefone: string) => {
    if (!telefone) return '';
    if (telefone.length === 11) {
      return telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return telefone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  };

  // Formatar CEP para exibição
  const formatCEP = (cep: string) => {
    if (!cep) return '';
    return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  // Formatar data para exibição
  const formatData = (data: string) => {
    if (!data) return '';
    return data.replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
  };

  // Validar email
  const validarEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Manipular mudanças nos campos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    let finalValue = value;
    
    // Formatação para campos específicos
    if (name === 'cpf') {
      finalValue = value.replace(/\D/g, '').slice(0, 11);
    } else if (name === 'cep') {
      const cepFormatado = value.replace(/\D/g, '').slice(0, 8);
      finalValue = cepFormatado;
      
      // Buscar CEP automaticamente quando tiver 8 dígitos
      if (cepFormatado.length === 8 && cepFormatado !== formData.cep) {
        buscarCep(cepFormatado);
      }
    } else if (name === 'celular') {
      finalValue = value.replace(/\D/g, '').slice(0, 11);
    } else if (name === 'telefone_residencial' || name === 'telefone_comercial') {
      finalValue = value.replace(/\D/g, '').slice(0, 10);
    } else if (name === 'nascimento') {
      finalValue = value.replace(/\D/g, '').slice(0, 8);
    }
    
    // Atualizar estado
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : finalValue
    }));
  };
  
  // Função para buscar informações do CEP
  const buscarCep = async (cep: string) => {
    if (cep.length !== 8) return;
    
    setCepLoading(true);
    try {
      const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
      
      if (!response.data.erro) {
        setFormData(prev => ({
          ...prev,
          endereco: response.data.logradouro || prev.endereco,
          bairro: response.data.bairro || prev.bairro,
          cidade: response.data.localidade || prev.cidade,
          uf: response.data.uf || prev.uf
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setCepLoading(false);
    }
  };
  
  // Função para enviar o formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    setStatusMessage('');
    setStatusType('');
    
    try {
      // Validar campos obrigatórios
      if (!formData.nome || !formData.cpf || !formData.email || !formData.celular || !formData.C_codigo_assoc) {
        setStatusMessage('Por favor, preencha todos os campos obrigatórios.');
        setStatusType('error');
        setIsLoading(false);
        return;
      }
      
      // Criar FormData para envio
      const submitData = new FormData();
      
      // Adicionar dados do cartão
      submitData.append('cartao', cartao);
      submitData.append('matricula', matricula);
      
      // Adicionar campos específicos com nomes esperados pela API
      submitData.append('C_nome_assoc', formData.nome);
      submitData.append('C_cpf_assoc', formData.cpf);
      submitData.append('C_Email_assoc', formData.email);
      submitData.append('C_cel_assoc', formData.celular);
      submitData.append('C_codigo_assoc', formData.C_codigo_assoc);
      submitData.append('C_empregador_assoc', formData.C_empregador_assoc);
      
      // Mapeamento de outros campos do formulário
      if (formData.rg) submitData.append('C_rg_assoc', formData.rg);
      if (formData.nascimento) submitData.append('C_nascimento', formData.nascimento);
      if (formData.telefone_residencial) submitData.append('C_telres', formData.telefone_residencial);
      if (formData.telefone_comercial) submitData.append('C_telcom', formData.telefone_comercial);
      if (formData.cep) submitData.append('C_cep_assoc', formData.cep);
      if (formData.endereco) submitData.append('C_endereco_assoc', formData.endereco);
      if (formData.numero) submitData.append('C_numero_assoc', formData.numero);
      if (formData.complemento) submitData.append('C_complemento_assoc', formData.complemento);
      if (formData.bairro) submitData.append('C_bairro_assoc', formData.bairro);
      if (formData.cidade) submitData.append('C_cidade_assoc', formData.cidade);
      if (formData.uf) submitData.append('C_uf_assoc', formData.uf);
      if (formData.local) submitData.append('C_local_trabalho', formData.local);
      
      // Adicionar outros campos complementares
      submitData.append('whatsapp', formData.whatsapp ? 'S' : 'N');
      
      // Enviar para a API
      const response = await fetch('/api/associado-cadastro', {
        method: 'POST',
        body: submitData
      });
      
      const result = await response.json();
      
      if (result.success) {
        setStatusMessage('Cadastro realizado com sucesso!');
        setStatusType('success');
        
        // Redirecionar após 2 segundos
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setStatusMessage(result.message || 'Erro ao realizar cadastro. Tente novamente.');
        setStatusType('error');
      }
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      setStatusMessage('Erro ao enviar formulário. Tente novamente mais tarde.');
      setStatusType('error');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-blue-700 mb-6">Completar meu cadastro</h2>
      
      {statusMessage && (
        <div className={`mb-6 p-4 rounded-md ${
          statusType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <div className="flex items-center">
            {statusType === 'success' ? (
              <FaCheckCircle className="mr-2" />
            ) : (
              <FaExclamationTriangle className="mr-2" />
            )}
            <span>{statusMessage}</span>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações do cartão */}
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Informações do Cartão</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Número do Cartão</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                  <FaIdCard className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={cartao}
                  readOnly
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 bg-gray-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Matrícula</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                  <FaUser className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={matricula}
                  readOnly
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 bg-gray-100"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Informações pessoais */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Informações Pessoais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-2 border-blue-200 p-3 rounded">
              <label htmlFor="C_codigo_assoc" className="block text-sm font-bold text-blue-700 mb-1">Código *</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                  <FaBarcode className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  id="C_codigo_assoc"
                  name="C_codigo_assoc"
                  value={formData.C_codigo_assoc}
                  onChange={handleChange}
                  required
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
                />
              </div>
              <span className="text-xs text-red-600">Este campo é obrigatório</span>
            </div>
            
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700">Nome Completo *</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                  <FaUser className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  id="nome"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="cpf" className="block text-sm font-medium text-gray-700">CPF *</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                  <FaIdCard className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  id="cpf"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleChange}
                  required
                  maxLength={11}
                  placeholder="Apenas números"
                  className={`flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 ${
                    formData.cpf && !validarCPF(formData.cpf) ? 'border-red-500' : ''
                  }`}
                />
              </div>
              {formData.cpf && (
                <p className="text-xs text-gray-500 mt-1">
                  Formato: {formatCPF(formData.cpf)}
                </p>
              )}
              {formData.cpf && !validarCPF(formData.cpf) && (
                <p className="text-xs text-red-600 mt-1">
                  CPF inválido
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="rg" className="block text-sm font-medium text-gray-700">RG</label>
              <input
                type="text"
                id="rg"
                name="rg"
                value={formData.rg}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="nascimento" className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                  <FaCalendarAlt className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  id="nascimento"
                  name="nascimento"
                  value={formData.nascimento}
                  onChange={handleChange}
                  placeholder="DD/MM/AAAA"
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
                />
              </div>
              {formData.nascimento && (
                <p className="text-xs text-gray-500 mt-1">
                  Formato: {formatData(formData.nascimento)}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Informações de contato */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Informações de Contato</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">E-mail *</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                  <FaEnvelope className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="seu@email.com"
                  className={`flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 ${
                    formData.email && !validarEmail(formData.email) ? 'border-red-500' : ''
                  }`}
                />
              </div>
              {formData.email && !validarEmail(formData.email) && (
                <p className="text-xs text-red-600 mt-1">
                  E-mail inválido
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="celular" className="block text-sm font-medium text-gray-700">Celular *</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                  <FaPhone className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  id="celular"
                  name="celular"
                  value={formData.celular}
                  onChange={handleChange}
                  required
                  maxLength={11}
                  placeholder="Apenas números"
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
                />
              </div>
              {formData.celular && (
                <p className="text-xs text-gray-500 mt-1">
                  Formato: {formatTelefone(formData.celular)}
                </p>
              )}
              <div className="mt-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="whatsapp"
                    checked={formData.whatsapp}
                    onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-600">Este celular tem WhatsApp</span>
                </label>
              </div>
            </div>
            
            <div>
              <label htmlFor="telefone_residencial" className="block text-sm font-medium text-gray-700">Telefone Residencial</label>
              <input
                type="text"
                id="telefone_residencial"
                name="telefone_residencial"
                value={formData.telefone_residencial}
                onChange={handleChange}
                maxLength={10}
                placeholder="Apenas números"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {formData.telefone_residencial && (
                <p className="text-xs text-gray-500 mt-1">
                  Formato: {formatTelefone(formData.telefone_residencial)}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="telefone_comercial" className="block text-sm font-medium text-gray-700">Telefone Comercial</label>
              <input
                type="text"
                id="telefone_comercial"
                name="telefone_comercial"
                value={formData.telefone_comercial}
                onChange={handleChange}
                maxLength={10}
                placeholder="Apenas números"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {formData.telefone_comercial && (
                <p className="text-xs text-gray-500 mt-1">
                  Formato: {formatTelefone(formData.telefone_comercial)}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Endereço */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Endereço</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="cep" className="block text-sm font-medium text-gray-700">CEP</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                  <FaMapMarkerAlt className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  id="cep"
                  name="cep"
                  value={formData.cep}
                  onChange={handleChange}
                  maxLength={8}
                  placeholder="Apenas números"
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
                />
              </div>
              {formData.cep && (
                <p className="text-xs text-gray-500 mt-1">
                  Formato: {formatCEP(formData.cep)}
                </p>
              )}
              {cepLoading && <span className="text-xs text-blue-600 flex items-center mt-1"><FaSpinner className="animate-spin mr-1" /> Buscando CEP...</span>}
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="endereco" className="block text-sm font-medium text-gray-700">Endereço</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                  <FaHome className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  id="endereco"
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleChange}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="numero" className="block text-sm font-medium text-gray-700">Número</label>
              <input
                type="text"
                id="numero"
                name="numero"
                value={formData.numero}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="complemento" className="block text-sm font-medium text-gray-700">Complemento</label>
              <input
                type="text"
                id="complemento"
                name="complemento"
                value={formData.complemento}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="bairro" className="block text-sm font-medium text-gray-700">Bairro</label>
              <input
                type="text"
                id="bairro"
                name="bairro"
                value={formData.bairro}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label htmlFor="cidade" className="block text-sm font-medium text-gray-700">Cidade</label>
              <input
                type="text"
                id="cidade"
                name="cidade"
                value={formData.cidade}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="uf" className="block text-sm font-medium text-gray-700">Estado</label>
              <select
                id="uf"
                name="uf"
                value={formData.uf}
                onChange={handleChange}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Selecione</option>
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
        
        {/* Informações adicionais */}
        <div className="bg-gray-50 p-4 rounded-md border-2 border-blue-300">
          <h3 className="text-lg font-semibold text-blue-700 mb-4">Informações Adicionais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-2 border-blue-200 p-3 rounded">
              <label htmlFor="C_empregador_assoc" className="block text-sm font-bold text-blue-700">Empregador</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                  <FaBuilding className="h-4 w-4" />
                </span>
                <select
                  id="C_empregador_assoc"
                  name="C_empregador_assoc"
                  value={formData.C_empregador_assoc}
                  onChange={handleChange}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
                >
                  <option value="">Selecione um empregador</option>
                  {carregandoEmpregadores ? (
                    <option disabled>Carregando...</option>
                  ) : (
                    empregadores.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nome}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
            
            <div>
              <label htmlFor="local" className="block text-sm font-medium text-gray-700">Local de Trabalho</label>
              <input
                type="text"
                id="local"
                name="local"
                value={formData.local}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
        
        {/* Botões de ação */}
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="mr-4 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center">
                <FaSpinner className="animate-spin mr-2" />
                Enviando...
              </span>
            ) : (
              'Salvar Cadastro'
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 