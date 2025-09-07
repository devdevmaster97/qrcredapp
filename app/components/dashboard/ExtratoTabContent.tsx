'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FiSearch, FiDownload, FiEye, FiChevronDown, FiCalendar } from 'react-icons/fi';
import { FaCalendarAlt } from 'react-icons/fa';

interface ExtratoItem {
  data: string;
  valor: string;
  descricao: string;
  tipo: 'debito' | 'credito';
  codigo: string;
  nome: string;
  mes: string;
  ano: string;
  uri_cupom?: string;
  parcela?: string;
  lancamento?: string;
}

interface ExtratoTabContentProps {
  cartao: string;
}

interface MesExtrato {
  abreviacao: string;
  data: string;
  completo: string;
  periodo: string;
}

interface AssociadoResponse {
  id?: number;
  matricula: string;
  empregador: number;
  nome: string;
  cod_cart: string;
  parcelas_permitidas: number;
  limite: string;
  email: string;
  cpf: string;
  cel: string;
  endereco: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  uf: string;
  celwatzap: boolean;
  cod_situacao2: number;
  cod_situacaocartao: number;
  nome_divisao: string;
  situacao: number;
  senha: string;
  id_divisao?: number;
}

interface ContaResponse {
  dia: string;
  hora: string;
  valor: string;
  nomefantasia: string;
  razaosocial: string;
  associado: string;
  nome: string;
  mes: string;
  uri_cupom: string;
  parcela?: string;
  lancamento?: string;
  // Campos numéricos vindos da API
  '0'?: string; // associado/ID lançamento
  '1'?: string; // nome do associado
  '2'?: string; // razão social
  '3'?: string; // nome fantasia
  '4'?: string; // valor
  '5'?: string; // mês
  '6'?: string; // parcela
  '7'?: string; // dia
  '8'?: string; // hora
  '9'?: string; // CNPJ
  '10'?: string; // ID empregador
  '11'?: string; // nome empregador
  '12'?: string; // ID divisão
  '13'?: string; // nome divisão
  '14'?: string; // URI cupom
  [key: string]: any; // Para outros campos numéricos que possam existir
}

export default function ExtratoTabContent({ cartao }: ExtratoTabContentProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [extractData, setExtractData] = useState<ExtratoItem[]>([]);
  const [mesesExtrato, setMesesExtrato] = useState<MesExtrato[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<number | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  // Detectar se é iOS
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    }
  }, []);

  // Função para buscar o mês corrente
  const fetchMesCorrente = async () => {
    try {
      console.log('API mes-corrente: Buscando mês corrente para cartão', cartao);
      const formData = new FormData();
      formData.append('cartao', cartao.trim());
      
      const response = await axios.post('/api/mes-corrente', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('Resposta do endpoint mês corrente:', response.data);
      
      if (response.data && response.data[0]?.abreviacao) {
        setMesSelecionado(response.data[0].abreviacao);
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (error) {
      console.error('Erro ao buscar mês corrente:', error);
      setError('Erro ao carregar o mês corrente');
    }
  };

  // Função para buscar os meses disponíveis
  const fetchMesesExtrato = async () => {
    try {
      // Primeiro, buscar dados do associado para obter id_divisao
      const associadoResponse = await axios.post<AssociadoResponse>('/api/localiza-associado', 
        { cartao: cartao.trim() },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!associadoResponse.data) {
        throw new Error('Dados do associado não encontrados');
      }

      console.log('Enviando requisição para buscar meses de extrato para cartão:', cartao);
      const formData = new FormData();
      formData.append('cartao', cartao.trim());
      
      // Adicionar divisao se disponível nos dados do associado
      if (associadoResponse.data.id_divisao) {
        formData.append('divisao', associadoResponse.data.id_divisao.toString());
        console.log('Incluindo divisao na requisição:', associadoResponse.data.id_divisao);
      }
      
      const response = await axios.post('/api/meses-extrato', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('Resposta da API de meses de extrato:', response.data);
      setMesesExtrato(response.data);
    } catch (error) {
      console.error('Erro ao buscar meses de extrato:', error);
      setError('Erro ao carregar os meses disponíveis');
    }
  };

  // Função para buscar o extrato
  const fetchExtractByMonth = async (mes: string) => {
    setLoading(true);
    setError(null);

    try {
      // Primeiro, buscar dados do associado
      const formDataAssociado = new FormData();
      formDataAssociado.append('cartao', cartao.trim());
      
      const associadoResponse = await axios.post<AssociadoResponse>('/api/localiza-associado', 
        { cartao: cartao.trim() },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!associadoResponse.data) {
        throw new Error('Dados do associado não encontrados');
      }

      const { matricula, empregador, id_divisao, id } = associadoResponse.data;

      // Agora buscar o extrato com os dados do associado
      const formDataConta = new FormData();
      formDataConta.append('matricula', matricula);
      formDataConta.append('empregador', empregador.toString());
      formDataConta.append('mes', mes);
      if (id_divisao) {
        formDataConta.append('divisao', id_divisao.toString());
      }
      if (id) {
        formDataConta.append('id', id.toString());
      }
      
      const extratoResponse = await axios.post<ContaResponse[]>('/api/conta', formDataConta, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('Resposta do endpoint conta:', extratoResponse.data);

      if (Array.isArray(extratoResponse.data)) {
        const formattedData = extratoResponse.data.map((item) => {
          return {
          data: `${item.dia} ${item.hora}`,
          valor: item.valor,
          descricao: item.nomefantasia || item.razaosocial || 'N/A',
          tipo: 'debito' as const,
          codigo: item.associado,
          nome: item.nome,
          mes: item.mes,
          ano: item.mes.split('/')[1],
            uri_cupom: item.uri_cupom,
            parcela: item.parcela,
            // Agora usando o campo lancamento que foi adicionado à API
            lancamento: item.lancamento || item.associado
          };
        });
        setExtractData(formattedData);
      } else {
        setExtractData([]);
      }
    } catch (error) {
      console.error('Erro ao buscar extrato:', error);
      setError('Erro ao carregar o extrato');
      setExtractData([]);
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        fetchMesCorrente(),
        fetchMesesExtrato()
      ]);
    };
    loadInitialData();
  }, [cartao]);

  // Carregar extrato quando o mês selecionado mudar
  useEffect(() => {
    if (mesSelecionado) {
      fetchExtractByMonth(mesSelecionado);
      
      // Centralizar o mês selecionado na visualização quando mudar
      setTimeout(() => {
        const botaoSelecionado = document.getElementById(`mes-${mesSelecionado}`);
        if (botaoSelecionado) {
          const container = document.getElementById('meses-container');
          if (container) {
            // Calcular a posição para centralizar
            const containerWidth = container.offsetWidth;
            const botaoWidth = botaoSelecionado.offsetWidth;
            const scrollLeft = botaoSelecionado.offsetLeft - (containerWidth / 2) + (botaoWidth / 2);
            
            // Aplicar scroll suave
            container.scrollTo({
              left: scrollLeft,
              behavior: 'smooth'
            });
          }
        }
      }, 300);
    }
  }, [mesSelecionado]);

  // Filtrar dados baseado no termo de busca
  const filteredExtract = extractData.filter(item =>
    item.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.valor.includes(searchTerm) ||
    item.data.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcular o valor total
  const valorTotal = filteredExtract.reduce((total, item) => {
    return total + parseFloat(item.valor);
  }, 0);

  // Função para formatar o valor
  const formatValue = (value: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(value));
  };

  // Função para formatar valor numérico
  const formatValueNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para formatar a data
  const formatDate = (dateStr: string) => {
    try {
      const [date, time] = dateStr.split(' ');
      return format(new Date(date + 'T' + time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (err) {
      console.error('Erro ao formatar data:', err);
      return dateStr;
    }
  };

  // Função para centralizar o mês selecionado na visualização
  const centralizarMesSelecionado = (mesAbreviacao: string) => {
    setMesSelecionado(mesAbreviacao);
    
    // Encontrar o botão do mês selecionado e centralizar na visualização
    setTimeout(() => {
      const botaoSelecionado = document.getElementById(`mes-${mesAbreviacao}`);
      if (botaoSelecionado) {
        const container = document.getElementById('meses-container');
        if (container) {
          // Calcular a posição para centralizar
          const containerWidth = container.offsetWidth;
          const botaoWidth = botaoSelecionado.offsetWidth;
          const scrollLeft = botaoSelecionado.offsetLeft - (containerWidth / 2) + (botaoWidth / 2);
          
          // Aplicar scroll suave
          container.scrollTo({
            left: scrollLeft,
            behavior: 'smooth'
          });
        }
      }
    }, 100);
  };

  // Função para navegar para a página de comprovante
  const navegarParaComprovante = (item: ExtratoItem) => {
    // Preparar os dados necessários para o comprovante
    const dadosLancamento = {
      descricao: item.descricao,
      valor: item.valor,
      data: item.data,
      parcela: item.parcela,
      codigo: item.codigo,
      lancamento: item.lancamento || item.codigo,
      mes: item.mes,
      nome: item.nome
    };
    
    // Codificar os dados como parâmetro de URL
    const dadosParam = encodeURIComponent(JSON.stringify(dadosLancamento));
    
    // Navegar para a página de comprovante com os dados
    window.location.href = `/dashboard/extrato/comprovante?lancamento=${dadosParam}`;
  };

  return (
    <div className="space-y-4">
      {/* Seletor de Meses - Versão Mobile Otimizada */}
      <div 
        id="meses-container" 
        className={`flex overflow-x-auto pb-2 gap-2 no-scrollbar relative ${
          isIOS ? 'ios-scrolling' : ''
        }`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
        <div className="flex mx-auto">
        {mesesExtrato.map((mes) => (
          <button
              id={`mes-${mes.abreviacao}`}
            key={mes.abreviacao}
              onClick={() => centralizarMesSelecionado(mes.abreviacao)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex flex-col items-center whitespace-nowrap mx-1 
                ${mesSelecionado === mes.abreviacao
                  ? isIOS 
                    ? 'bg-blue-500 text-white transform scale-110 shadow-md' 
                    : 'bg-blue-600 text-white transform scale-110 shadow-md'
                  : isIOS
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
                ${isIOS ? 'active:opacity-70' : 'active:opacity-80'}
              `}
          >
            <div className="flex items-center">
              <FaCalendarAlt className="mr-2" />
              <span>{mes.abreviacao}</span>
            </div>
            <div className="text-xs font-normal mt-1">{mes.periodo}</div>
          </button>
        ))}
        </div>
        <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
      </div>

      {/* Barra de Pesquisa Otimizada para Mobile */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Pesquisar no extrato..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 
            ${isIOS 
              ? 'focus:ring-blue-400 text-base' 
              : 'focus:ring-blue-500'
            } 
            ${isIOS ? 'appearance-none' : ''}
          `}
          style={{ 
            fontSize: isIOS ? '16px' : '', // Evita zoom em iOS ao focar
            WebkitAppearance: 'none' // Melhora a aparência em iOS
          }}
        />
        {searchTerm && (
          <button
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={() => setSearchTerm('')}
          >
            <span className="sr-only">Limpar</span>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Layout para dispositivos móveis */}
      <div className="md:hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${isIOS ? 'border-blue-500' : 'border-blue-600'}`}></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-600 mb-4">
            {error}
          </div>
        ) : filteredExtract.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center mb-4">
            <FiCalendar className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-gray-500">Nenhuma transação encontrada neste período</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExtract.map((item, index) => (
              <div 
                key={index} 
                className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden 
                  ${isIOS 
                    ? 'active:bg-gray-50' 
                    : 'active:bg-gray-100'
                  } transition-all cursor-pointer`}
                onClick={() => navegarParaComprovante(item)}
              >
                <div 
                  className="p-4"
                  onClick={() => setShowDetails(showDetails === index ? null : index)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 mr-4">
                      <h3 className="font-medium text-gray-900 line-clamp-2">{item.descricao}</h3>
                      <p className="text-sm text-gray-500 mt-1">{formatDate(item.data)}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="font-semibold text-gray-900">{formatValue(item.valor)}</div>
                      {item.parcela && (
                        <span className={`inline-block ${isIOS ? 'bg-blue-50 text-blue-600' : 'bg-blue-100 text-blue-800'} text-xs px-2 py-1 rounded-full mt-1`}>
                          Parcela: {item.parcela}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Indicador de expansão */}
                  <div className="flex justify-center mt-2">
                    <FiChevronDown 
                      className={`text-gray-400 transition-transform ${showDetails === index ? 'transform rotate-180' : ''}`} 
                    />
                  </div>
                  
                  {/* Detalhes expandidos */}
                  {showDetails === index && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500">Código:</p>
                          <p className="font-medium">{item.codigo}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Lançamento:</p>
                          <p className="font-medium font-mono">{item.lancamento || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Mês:</p>
                          <p className="font-medium">{item.mes}</p>
                        </div>
                        {item.uri_cupom && (
                          <div className="col-span-2 mt-2">
                            <a
                              href={item.uri_cupom}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center ${
                                isIOS ? 'text-blue-500' : 'text-blue-600'
                              } font-medium`}
                            >
                              <FiEye className="mr-1" />
                              Ver comprovante
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Total (Mobile) */}
            {filteredExtract.length > 0 && (
              <div className="mt-6 bg-white rounded-xl shadow border border-gray-200 p-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-800">Valor Total:</h3>
                  <span className="font-bold text-lg text-blue-600">{formatValueNumber(valorTotal)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabela de Extrato (visível apenas em desktop) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data/Hora
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estabelecimento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Parcela
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lançamento
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center">
                  Carregando...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-red-500">
                  {error}
                </td>
              </tr>
            ) : filteredExtract.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  Nenhum registro encontrado
                </td>
              </tr>
            ) : (
              filteredExtract.map((item, index) => (
                <tr 
                  key={index} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navegarParaComprovante(item)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(item.data)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.descricao}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatValue(item.valor)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.parcela || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {item.lancamento || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filteredExtract.length > 0 && (
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={2} className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                  Valor Total:
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                  {formatValueNumber(valorTotal)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
} 