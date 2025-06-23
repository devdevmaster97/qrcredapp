'use client';

import { useState, useEffect } from 'react';
import { FaSearch, FaUserMd, FaHospital, FaStethoscope } from 'react-icons/fa';
import axios from 'axios';

interface ConvenioProfissional {
  convenio_nome: string;
  especialidade: string;
  profissional: string;
  tipo_estabelecimento: string;
}

type OrdenacaoTipo = 'alfabetica' | 'convenio' | 'especialidade';

export default function ConveniosContent() {
  const [profissionais, setProfissionais] = useState<ConvenioProfissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [ordenacao, setOrdenacao] = useState<OrdenacaoTipo>('convenio');

  // Buscar profissionais dos convênios
  const fetchProfissionais = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/convenios');

      if (Array.isArray(response.data)) {
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

  // Função para lidar com agendamento (temporária)
  const handleAgendar = (profissional: ConvenioProfissional) => {
    const nomeProfissional = getStringValue(profissional.profissional) || 'Profissional não informado';
    const especialidade = getStringValue(profissional.especialidade) || 'Especialidade não informada';
    const convenio = getStringValue(profissional.convenio_nome) || 'Convênio não informado';
    
    alert(`Solicitação de agendamento para:\n\nProfissional: ${nomeProfissional}\nEspecialidade: ${especialidade}\nConvênio: ${convenio}\n\nFuncionalidade em desenvolvimento...`);
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
                    {profissionaisList.map((prof, index) => (
                      <div key={`${getStringValue(prof.profissional) || 'profissional'}-${index}`} className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start flex-1">
                            <FaUserMd className="text-blue-500 mt-1 mr-3 flex-shrink-0" />
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{getStringValue(prof.profissional) || 'Nome não informado'}</h4>
                              <p className="text-sm text-gray-600 mt-1">{getStringValue(prof.especialidade) || 'Especialidade não informada'}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAgendar(prof)}
                            className="ml-3 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                          >
                            Agendar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 