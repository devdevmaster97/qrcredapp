'use client';

import { useState, useEffect } from 'react';
import { FaSpinner, FaSave, FaEdit } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

interface ConvenioData {
  cod_convenio: string;
  razaosocial: string;
  nome_fantasia: string;
  cnpj: string;
  cpf: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  cel: string;
  tel: string;
  email: string;
  contato: string;
}

export default function MeusDadosPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [convenioData, setConvenioData] = useState<ConvenioData | null>(null);
  const [formData, setFormData] = useState<ConvenioData | null>(null);

  // Limpeza de cache ao montar o componente
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Limpeza de cache específica para dispositivos móveis
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      
      console.log('🧹 Cache limpo para dispositivo móvel - Meus Dados');
    }
  }, []);

  useEffect(() => {
    const fetchConvenioData = async () => {
      try {
        // Detectar se é dispositivo móvel
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Headers anti-cache para dispositivos móveis
        const headers: HeadersInit = {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        };
        
        // Timestamp para evitar cache
        const timestamp = Date.now();
        const response = await fetch(`/api/convenio/dados?t=${timestamp}`, {
          method: 'GET',
          headers,
          cache: 'no-store'
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            // Sessão expirada - redirecionar para login
            window.location.href = '/convenio/login';
            return;
          }
          throw new Error('Falha ao buscar dados do convênio');
        }
        
        const data = await response.json();
        
        if (data.success) {
          // Obter dados do token para validação cruzada
          const tokenData = localStorage.getItem('convenioToken');
          if (tokenData) {
            try {
              const decodedToken = JSON.parse(atob(tokenData));
              
              console.log('🔍 VALIDAÇÃO CRUZADA MEUS DADOS:', {
                usuario_token: decodedToken.user,
                cod_convenio_api: data.data.cod_convenio,
                razaosocial_api: data.data.razaosocial,
                timestamp: new Date().toISOString()
              });
              
            } catch (tokenError) {
              console.error('Erro ao decodificar token:', tokenError);
            }
          }
          
          setConvenioData(data.data);
          setFormData(data.data);
          
          console.log('✅ Dados carregados com sucesso:', {
            cod_convenio: data.data.cod_convenio,
            razaosocial: data.data.razaosocial,
            timestamp: new Date().toISOString()
          });
        } else {
          toast.error('Erro ao buscar dados do convênio');
        }
      } catch (error) {
        console.error('Erro ao buscar dados do convênio:', error);
        toast.error('Erro ao buscar dados do convênio');
      } finally {
        setLoading(false);
      }
    };

    fetchConvenioData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      if (!prev) return prev;
      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setSaving(true);
    try {
      // Aqui você faria a chamada real para a API
      // const response = await fetch('/api/convenio/atualizar-dados', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(formData),
      // });
      
      // Simular uma atualização bem-sucedida
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Atualizar os dados locais
      setConvenioData(formData);
      setEditMode(false);
      toast.success('Dados atualizados com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      toast.error('Erro ao atualizar dados');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center my-12">
        <FaSpinner className="animate-spin text-blue-500 text-4xl" />
      </div>
    );
  }

  if (!convenioData) {
    return (
      <div className="text-center py-12 bg-white shadow rounded-lg">
        <p className="text-gray-500">Não foi possível carregar os dados do convênio.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Dados</h1>
          <p className="mt-1 text-sm text-gray-600">Visualize e edite as informações do seu convênio</p>
        </div>
        
        {!editMode ? (
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
            onClick={() => setEditMode(true)}
          >
            <FaEdit className="mr-2" /> Editar
          </button>
        ) : (
          <button 
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
            onClick={() => {
              setFormData(convenioData);
              setEditMode(false);
            }}
          >
            Cancelar
          </button>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="razaosocial" className="block text-sm font-medium text-gray-700">
                Razão Social
              </label>
              <input
                type="text"
                name="razaosocial"
                id="razaosocial"
                value={formData?.razaosocial || ''}
                readOnly
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="nome_fantasia" className="block text-sm font-medium text-gray-700">
                Nome Fantasia
              </label>
              <input
                type="text"
                name="nome_fantasia"
                id="nome_fantasia"
                value={formData?.nome_fantasia || ''}
                readOnly
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700">
                CNPJ
              </label>
              <input
                type="text"
                name="cnpj"
                id="cnpj"
                value={formData?.cnpj || ''}
                readOnly
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="cpf" className="block text-sm font-medium text-gray-700">
                CPF
              </label>
              <input
                type="text"
                name="cpf"
                id="cpf"
                value={formData?.cpf || ''}
                readOnly
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="endereco" className="block text-sm font-medium text-gray-700">
                Endereço
              </label>
              <input
                type="text"
                name="endereco"
                id="endereco"
                value={formData?.endereco || ''}
                onChange={handleChange}
                disabled={!editMode}
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${!editMode ? 'bg-gray-100' : ''}`}
              />
            </div>

            <div>
              <label htmlFor="numero" className="block text-sm font-medium text-gray-700">
                Número
              </label>
              <input
                type="text"
                name="numero"
                id="numero"
                value={formData?.numero || ''}
                onChange={handleChange}
                disabled={!editMode}
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${!editMode ? 'bg-gray-100' : ''}`}
              />
            </div>

            <div>
              <label htmlFor="bairro" className="block text-sm font-medium text-gray-700">
                Bairro
              </label>
              <input
                type="text"
                name="bairro"
                id="bairro"
                value={formData?.bairro || ''}
                onChange={handleChange}
                disabled={!editMode}
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${!editMode ? 'bg-gray-100' : ''}`}
              />
            </div>

            <div>
              <label htmlFor="cidade" className="block text-sm font-medium text-gray-700">
                Cidade
              </label>
              <input
                type="text"
                name="cidade"
                id="cidade"
                value={formData?.cidade || ''}
                onChange={handleChange}
                disabled={!editMode}
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${!editMode ? 'bg-gray-100' : ''}`}
              />
            </div>

            <div>
              <label htmlFor="estado" className="block text-sm font-medium text-gray-700">
                Estado
              </label>
              <input
                type="text"
                name="estado"
                id="estado"
                value={formData?.estado || ''}
                onChange={handleChange}
                disabled={!editMode}
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${!editMode ? 'bg-gray-100' : ''}`}
              />
            </div>

            <div>
              <label htmlFor="cep" className="block text-sm font-medium text-gray-700">
                CEP
              </label>
              <input
                type="text"
                name="cep"
                id="cep"
                value={formData?.cep || ''}
                onChange={handleChange}
                disabled={!editMode}
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${!editMode ? 'bg-gray-100' : ''}`}
              />
            </div>

            <div>
              <label htmlFor="cel" className="block text-sm font-medium text-gray-700">
                Celular
              </label>
              <input
                type="text"
                name="cel"
                id="cel"
                value={formData?.cel || ''}
                onChange={handleChange}
                disabled={!editMode}
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${!editMode ? 'bg-gray-100' : ''}`}
              />
            </div>

            <div>
              <label htmlFor="tel" className="block text-sm font-medium text-gray-700">
                Telefone
              </label>
              <input
                type="text"
                name="tel"
                id="tel"
                value={formData?.tel || ''}
                onChange={handleChange}
                disabled={!editMode}
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${!editMode ? 'bg-gray-100' : ''}`}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={formData?.email || ''}
                onChange={handleChange}
                disabled={!editMode}
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${!editMode ? 'bg-gray-100' : ''}`}
              />
            </div>

            <div>
              <label htmlFor="contato" className="block text-sm font-medium text-gray-700">
                Contato
              </label>
              <input
                type="text"
                name="contato"
                id="contato"
                value={formData?.contato || ''}
                onChange={handleChange}
                disabled={!editMode}
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${!editMode ? 'bg-gray-100' : ''}`}
              />
            </div>
          </div>

          {editMode && (
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <FaSave className="mr-2" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
} 