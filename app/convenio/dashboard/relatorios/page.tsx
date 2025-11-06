'use client';

import { useState, useEffect } from 'react';
import { FaSpinner, FaFilter, FaUndo, FaExclamationTriangle, FaTimes, FaCheck, FaReceipt, FaFileAlt, FaShare, FaPrint, FaFilePdf, FaFileCsv, FaDownload } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import Image from 'next/image';

interface Lancamento {
  id: number;
  data: string;
  hora: string;
  valor: string;
  associado: string; // código do associado
  nome_associado?: string; // nome do associado (quando disponível)
  empregador: string;
  nome_empregador?: string; // nome do empregador
  razaosocial?: string; // razão social do convênio
  nome_fantasia?: string; // nome fantasia do convênio
  cnpj?: string; // CNPJ do convênio
  endereco?: string; // endereço completo do convênio
  mes: string;
  parcela: string;
  lancamento?: string; // campo lancamento da tabela conta
  descricao: string;
  data_fatura: string;
  hora_fatura?: string; // hora da fatura
  cpf?: string; // CPF do associado (campo antigo)
  cpf_associado?: string; // CPF do associado (novo campo da API)
  matricula?: string;
  codigoempregador?: number;
}

export default function RelatoriosPage() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState<string>('');
  const [mesesDisponiveis, setMesesDisponiveis] = useState<string[]>([]);
  const [mesCorrente, setMesCorrente] = useState<string>('');
  const [loadingLancamentos, setLoadingLancamentos] = useState(true);
  const [estornandoId, setEstornandoId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showComprovanteModal, setShowComprovanteModal] = useState(false);
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState<Lancamento | null>(null);
  const [termoBusca, setTermoBusca] = useState<string>('');

  // Função removida - usar apenas mês da API para evitar inconsistências

  // Buscar lançamentos do banco de dados
  useEffect(() => {
    const buscarLancamentos = async () => {
      try {
        // Detectar dispositivo móvel
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Adicionar headers anti-cache para dispositivos móveis
        const headers: HeadersInit = {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        };

        if (isMobile) {
          console.log('📱 RELATÓRIOS - Dispositivo móvel detectado, usando headers anti-cache');
        }

        const response = await fetch(`/api/convenio/lancamentos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: JSON.stringify({}),
          cache: 'no-store'
        });
        
        // Verificar se a resposta foi bem-sucedida
        if (!response.ok) {
          console.log('❌ RELATÓRIOS - Erro HTTP na busca de lançamentos:', response.status);
          
          // Se for erro 401 (não autorizado), redirecionar para login
          if (response.status === 401) {
            console.log('❌ RELATÓRIOS - Sessão expirada, redirecionando para login');
            toast.error('Sessão expirada. Redirecionando para login...');
            setTimeout(() => {
              window.location.href = '/convenio/login';
            }, 2000);
            return;
          }
          
          toast.error('Erro ao buscar lançamentos. Tente novamente.');
          return;
        }
        
        const data = await response.json();

        if (data.success) {
          // Debug: verificar estrutura dos dados recebidos
          console.log('🔍 RELATÓRIOS - Dados dos lançamentos recebidos:', {
            quantidade: data.data.length,
            debug_info: data.debug_info
          });
          
          if (data.debug_info) {
            console.log('🔍 RELATÓRIOS - Info de debug da API:', data.debug_info);
          }
          
          if (data.data.length > 0) {
            console.log('🔍 RELATÓRIOS - Exemplo de lançamento completo:', data.data[0]);
            
            // Debug específico da parcela
            data.data.slice(0, 3).forEach((lancamento: any, index: number) => {
              console.log(`🔍 PARCELA DEBUG ${index + 1}:`, {
                id: lancamento.id,
                parcela_original: lancamento.parcela,
                parcela_tipo: typeof lancamento.parcela,
                parcela_string: String(lancamento.parcela),
                parcela_json: JSON.stringify(lancamento.parcela)
              });
            });
            
            console.log('🔍 RELATÓRIOS - Campos do empregador:', {
              empregador: data.data[0].empregador,
              nome_empregador: data.data[0].nome_empregador,
              codigoempregador: data.data[0].codigoempregador
            });
            console.log('🔍 RELATÓRIOS - Campo CPF associado:', {
              cpf: data.data[0].cpf,
              cpf_associado: data.data[0].cpf_associado
            });
            console.log('🔍 RELATÓRIOS - Campo Parcela:', {
              parcela: data.data[0].parcela,
              tipo_parcela: typeof data.data[0].parcela
            });
            
            // Debug específico dos meses encontrados nos lançamentos
            const mesesEncontrados = data.data
              .filter((l: Lancamento) => l && l.mes) // Verificar se lançamento e mes existem
              .map((l: Lancamento) => l.mes);
            console.log('🗓️ RELATÓRIOS - Todos os meses encontrados nos lançamentos:', mesesEncontrados);
            console.log('🗓️ RELATÓRIOS - Meses únicos antes da ordenação:', Array.from(new Set(mesesEncontrados)));
          }
          
          setLancamentos(data.data);
          
          // Extrair meses únicos dos lançamentos com validação
          const mesesBrutos = data.data
            .filter((l: Lancamento) => l && l.mes) // Verificar se lançamento e mes existem
            .map((l: Lancamento) => l.mes)
            .filter((mes: string) => mes && mes.trim() !== '');
          const mesesUnicos = Array.from(new Set(mesesBrutos)) as string[];
          
          console.log('🗓️ RELATÓRIOS - Meses únicos extraídos:', mesesUnicos);
          
          // Ordenar meses corretamente (assumindo formato YYYY-MM ou similar)
          const mesesOrdenados = mesesUnicos.sort((a, b) => {
            // Se os meses estão no formato YYYY-MM, ordenar cronologicamente
            if (a.includes('-') && b.includes('-')) {
              return b.localeCompare(a); // Mais recente primeiro
            }
            // Se estão em outro formato, ordenar alfabeticamente reverso
            return b.localeCompare(a);
          });
          
          console.log('🗓️ RELATÓRIOS - Meses ordenados para o select:', mesesOrdenados);
          
          setMesesDisponiveis(mesesOrdenados);
          
          // Buscar mês corrente da API após ter os meses disponíveis
          await buscarMesCorrente(mesesOrdenados);
        } else {
          console.log('❌ RELATÓRIOS - Erro da API:', data.message);
          
          // Se for erro de sessão inválida, redirecionar para login
          if (data.message && data.message.includes('Sessão inválida')) {
            toast.error('Sessão expirada. Redirecionando para login...');
            setTimeout(() => {
              window.location.href = '/convenio/login';
            }, 2000);
            return;
          }
          
          toast.error(data.message || 'Erro ao buscar lançamentos');
        }
      } catch (error) {
        console.error('❌ RELATÓRIOS - Erro ao buscar lançamentos:', error);
        toast.error('Erro ao conectar com o servidor');
      } finally {
        setLoadingLancamentos(false);
      }
    };

    buscarLancamentos();
  }, []);

  // Função para buscar o mês corrente da API
  const buscarMesCorrente = async (mesesDisponiveis: string[]) => {
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isDesktop = !isMobile;
      
      // Headers anti-cache mais rigorosos para desktop Windows
      const headers: HeadersInit = {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...(isDesktop && {
          'If-None-Match': '*',
          'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT'
        })
      };
      
      console.log(`🔍 MÊS CORRENTE - Buscando da API (${isMobile ? 'Mobile' : 'Desktop'})`);
      console.log('🔍 MÊS CORRENTE - Meses disponíveis nos lançamentos:', mesesDisponiveis);
      
      // Primeiro, obter os dados do convênio para pegar o código da divisão
      console.log('🔍 MÊS CORRENTE - Obtendo dados do convênio para divisão...');
      const dadosResponse = await fetch(`/api/convenio/dados?t=${Date.now()}`, {
        method: 'GET',
        headers,
        cache: 'no-store'
      });
      
      if (!dadosResponse.ok) {
        console.log('❌ MÊS CORRENTE - Erro ao obter dados do convênio:', dadosResponse.status);
        
        // Se for erro 401 (não autorizado), redirecionar para login
        if (dadosResponse.status === 401) {
          console.log('❌ MÊS CORRENTE - Sessão expirada, redirecionando para login');
          toast.error('Sessão expirada. Redirecionando para login...');
          setTimeout(() => {
            window.location.href = '/convenio/login';
          }, 2000);
        }
        
        // Fallback: usar primeiro mês disponível se houver erro
        if (mesesDisponiveis.length > 0) {
          console.log('⚠️ MÊS CORRENTE - Usando primeiro mês disponível como fallback:', mesesDisponiveis[0]);
          setMesSelecionado(mesesDisponiveis[0]);
        }
        return;
      }
      
      const dadosConvenio = await dadosResponse.json();
      
      console.log('🔍 MÊS CORRENTE - Resposta completa da API dados:', dadosConvenio);
      console.log('🔍 MÊS CORRENTE - Campo divisao na resposta:', dadosConvenio.data?.divisao);
      console.log('🔍 MÊS CORRENTE - Todos os campos data:', Object.keys(dadosConvenio.data || {}));
      
      if (!dadosConvenio.success) {
        console.log('❌ MÊS CORRENTE - API dados retornou erro:', dadosConvenio.message);
        
        // Fallback: usar primeiro mês disponível
        if (mesesDisponiveis.length > 0) {
          console.log('⚠️ MÊS CORRENTE - Usando primeiro mês disponível como fallback:', mesesDisponiveis[0]);
          setMesSelecionado(mesesDisponiveis[0]);
        }
        return;
      }
      
      // Usar divisao se disponível, senão usar cod_convenio como fallback
      const divisao = dadosConvenio.data.divisao || dadosConvenio.data.cod_convenio;
      console.log('🔍 MÊS CORRENTE - Divisão obtida:', divisao);
      
      if (!divisao) {
        console.log('❌ MÊS CORRENTE - Nem divisao nem cod_convenio encontrados');
        
        // Fallback: usar primeiro mês disponível
        if (mesesDisponiveis.length > 0) {
          console.log('⚠️ MÊS CORRENTE - Usando primeiro mês disponível como fallback:', mesesDisponiveis[0]);
          setMesSelecionado(mesesDisponiveis[0]);
        }
        return;
      }
      
      // Agora chamar a API de mês corrente com o parâmetro divisao
      const response = await fetch(`/api/convenio/mes-corrente?t=${Date.now()}&platform=${isMobile ? 'mobile' : 'desktop'}&divisao=${divisao}`, {
        method: 'GET',
        headers,
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 MÊS CORRENTE - Resposta completa da API mes-corrente:', data);
        console.log('🔍 MÊS CORRENTE - Campo data na resposta:', data.data);
        console.log('🔍 MÊS CORRENTE - Campo abreviacao:', data.data?.abreviacao);
        console.log('🔍 MÊS CORRENTE - Campo mes_corrente:', data.data?.mes_corrente);
        
        if (data.success && data.data && data.data.abreviacao) {
          const mesCorrenteAPI = data.data.abreviacao;
          console.log('✅ MÊS CORRENTE - Recebido da API:', mesCorrenteAPI);
          setMesCorrente(mesCorrenteAPI);
          
          // VALIDAÇÃO CRÍTICA: Verificar se o mês corrente da API existe nos lançamentos
          if (mesesDisponiveis.includes(mesCorrenteAPI)) {
            console.log('✅ MÊS CORRENTE - Mês da API encontrado nos lançamentos, usando como selecionado:', mesCorrenteAPI);
            setMesSelecionado(mesCorrenteAPI);
          } else {
            console.log('⚠️ MÊS CORRENTE - Mês da API NÃO encontrado nos lançamentos!');
            console.log('⚠️ MÊS CORRENTE - Mês da API:', mesCorrenteAPI);
            console.log('⚠️ MÊS CORRENTE - Meses disponíveis:', mesesDisponiveis);
            
            // Usar primeiro mês disponível dos lançamentos
            if (mesesDisponiveis.length > 0) {
              console.log('⚠️ MÊS CORRENTE - Usando primeiro mês disponível dos lançamentos:', mesesDisponiveis[0]);
              setMesSelecionado(mesesDisponiveis[0]);
            }
          }
          return;
        } else {
          console.log('⚠️ MÊS CORRENTE - Campo abreviacao não encontrado na resposta');
        }
      } else {
        console.log('⚠️ MÊS CORRENTE - Erro HTTP:', response.status, response.statusText);
      }
      
      // Fallback final: usar primeiro mês disponível
      if (mesesDisponiveis.length > 0) {
        console.log('⚠️ MÊS CORRENTE - Usando primeiro mês disponível como fallback final:', mesesDisponiveis[0]);
        setMesSelecionado(mesesDisponiveis[0]);
      }
    } catch (error) {
      console.error('❌ MÊS CORRENTE - Erro ao buscar da API:', error);
      
      // Fallback em caso de erro: usar primeiro mês disponível
      if (mesesDisponiveis.length > 0) {
        console.log('⚠️ MÊS CORRENTE - Erro na API, usando primeiro mês disponível:', mesesDisponiveis[0]);
        setMesSelecionado(mesesDisponiveis[0]);
      }
    }
  };

  // Filtrar lançamentos pelo mês selecionado e termo de busca
  const lancamentosFiltrados = lancamentos.filter(lancamento => {
    // Verificar se o lançamento tem dados válidos
    if (!lancamento) return false;
    
    // Filtro por mês
    const filtroMes = mesSelecionado ? lancamento.mes === mesSelecionado : true;
    
    // Filtro por termo de busca
    const filtroBusca = termoBusca && termoBusca.trim() ? (
      (lancamento.nome_associado || lancamento.associado || '').toString().toLowerCase().includes(termoBusca.toLowerCase()) ||
      (lancamento.empregador || '').toString().toLowerCase().includes(termoBusca.toLowerCase()) ||
      (lancamento.nome_empregador || '').toString().toLowerCase().includes(termoBusca.toLowerCase()) ||
      (lancamento.lancamento || '').toString().toLowerCase().includes(termoBusca.toLowerCase()) ||
      (lancamento.valor || '').toString().toLowerCase().includes(termoBusca.toLowerCase()) ||
      (lancamento.data || '').toString().toLowerCase().includes(termoBusca.toLowerCase()) ||
      (lancamento.cpf_associado || lancamento.cpf || '').toString().toLowerCase().includes(termoBusca.toLowerCase())
    ) : true;
    
    return filtroMes && filtroBusca;
  });

  // Calcular total dos lançamentos do mês selecionado
  const calcularTotalMes = () => {
    return lancamentosFiltrados.reduce((total, lancamento) => {
      if (!lancamento || !lancamento.valor) return total;
      const valor = parseFloat(lancamento.valor.toString().replace(',', '.')) || 0;
      return total + valor;
    }, 0);
  };

  const totalDoMes = calcularTotalMes();



  // Abrir modal de confirmação antes de estornar
  const confirmarEstorno = (lancamento: Lancamento) => {
    setLancamentoSelecionado(lancamento);
    setShowModal(true);
  };

  // Função para estornar um lançamento
  const handleEstornar = async () => {
    if (!lancamentoSelecionado) return;
    
    const id = lancamentoSelecionado.id;
    setEstornandoId(id);
    setShowModal(false);
    
    try {
      // Log de debug para verificar a estrutura dos dados
      console.log('Lançamento selecionado:', lancamentoSelecionado);
      
      // Extrair código do empregador - verificar primeiro se codigoempregador existe
      let codigoEmpregador;
      if (lancamentoSelecionado.codigoempregador) {
        codigoEmpregador = lancamentoSelecionado.codigoempregador;
      } else {
        // Tentativa de extrair o código do texto (assumindo formato "CÓDIGO - Nome")
        const empregadorParts = lancamentoSelecionado.empregador.split(' - ');
        if (empregadorParts.length > 1 && !isNaN(Number(empregadorParts[0]))) {
          codigoEmpregador = parseInt(empregadorParts[0]);
        } else {
          // Fallback: usar 1 como código padrão ou perguntar ao usuário
          codigoEmpregador = 1; 
        }
      }
      
      // Formatação de data se necessário (DD/MM/YYYY -> YYYY-MM-DD)
      let dataFormatada = lancamentoSelecionado.data;
      if (dataFormatada.includes('/')) {
        const [dia, mes, ano] = dataFormatada.split('/');
        dataFormatada = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      }
      
      // Formatar o valor substituindo vírgula por ponto
      const valorFormatado = lancamentoSelecionado.valor.replace(',', '.');
      
      // Preparando os dados para enviar para a API
      const dadosEstorno = {
        lancamento: lancamentoSelecionado.lancamento || id.toString(),
        data: dataFormatada,
        hora: lancamentoSelecionado.hora, // Formato HH:MM:SS
        empregador: codigoEmpregador, // Enviando como número
        valor: valorFormatado, // Valor formatado com ponto
        mes: lancamentoSelecionado.mes
      };

      // Log de debug para verificar os parâmetros
      console.log('Parâmetros enviados para API:', dadosEstorno);

      // Chamada para a API Next.js
      const response = await fetch('/api/convenio/estorno', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosEstorno),
      });

      const resultData = await response.json();
      console.log('Resposta da API de estorno:', resultData);

      if (resultData.success) {
        toast.success('Lançamento estornado com sucesso');
        // Atualizar a lista removendo o item estornado
        setLancamentos(lancamentos.filter(l => l.id !== id));
      } else {
        toast.error(resultData.message || 'Erro ao estornar lançamento');
      }
    } catch (error) {
      console.error('Erro ao estornar lançamento:', error);
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setEstornandoId(null);
      setLancamentoSelecionado(null);
    }
  };

  // Função para abrir o modal do comprovante
  const abrirComprovante = (lancamento: Lancamento) => {
    setLancamentoSelecionado(lancamento);
    setShowComprovanteModal(true);
  };

  // Função para formatar data no padrão brasileiro
  const formatarData = (data: string) => {
    if (!data) return '';
    
    // Se a data já está no formato correto (dd/mm/yyyy), retorna como está
    if (data.includes('/')) {
      return data;
    }
    
    // Se está no formato yyyy-mm-dd, converte para dd/mm/yyyy
    if (data.includes('-')) {
      const [ano, mes, dia] = data.split('-');
      return `${dia}/${mes}/${ano}`;
    }
    
    return data;
  };

  // Função para formatar data da fatura no padrão dd/mm/yyyy
  const formatarDataFatura = (data: string) => {
    if (!data) return '';
    
    // Se a data já está no formato correto (dd/mm/yyyy), retorna como está
    if (data.includes('/') && data.length === 10) {
      return data;
    }
    
    // Se está no formato yyyy-mm-dd, converte para dd/mm/yyyy
    if (data.includes('-')) {
      const [ano, mes, dia] = data.split('-');
      return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`;
    }
    
    // Se está no formato yyyymmdd, converte para dd/mm/yyyy
    if (data.length === 8 && !data.includes('-') && !data.includes('/')) {
      const ano = data.substring(0, 4);
      const mes = data.substring(4, 6);
      const dia = data.substring(6, 8);
      return `${dia}/${mes}/${ano}`;
    }
    
    return data;
  };

  // Função para formatar valor monetário
  const formatarValor = (valor: string) => {
    if (!valor) return 'R$ 0,00';
    
    // Se já está formatado, retorna como está
    if (valor.includes('R$')) {
      return valor;
    }
    
    // Converte string para número e formata
    const numero = parseFloat(valor.replace(',', '.'));
    if (isNaN(numero)) return 'R$ 0,00';
    
    return `R$ ${numero.toFixed(2).replace('.', ',')}`;
  };

  // Função para formatar valor na lista (sem R$)
  const formatarValorLista = (valor: string) => {
    if (!valor) return '0,00';
    
    // Remove R$ se existir
    const valorLimpo = valor.replace('R$', '').trim();
    
    // Converte string para número e formata
    const numero = parseFloat(valorLimpo.replace(',', '.'));
    if (isNaN(numero)) return '0,00';
    
    return numero.toFixed(2).replace('.', ',');
  };

  // Função para compartilhar comprovante como imagem
  const compartilharComprovante = async () => {
    if (!lancamentoSelecionado) return;

    try {
      // Criar um canvas para gerar a imagem do comprovante
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Configurar dimensões do canvas
      canvas.width = 400;
      canvas.height = 600;

      // Fundo branco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Carregar e desenhar a logo
      const logo = document.createElement('img');
      logo.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve) => {
        logo.onload = () => {
          // Desenhar logo no topo centralizada
          const logoWidth = 60;
          const logoHeight = 60;
          const logoX = (canvas.width - logoWidth) / 2;
          const logoY = 10;
          
          ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
          resolve();
        };
        logo.onerror = () => {
          // Se não conseguir carregar a logo, continua sem ela
          resolve();
        };
        logo.src = '/icons/logo.png';
      });

      // Configurar fonte e cores
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';

      // Título (ajustado para ficar abaixo da logo)
      ctx.fillText('SASCRED - SISTEMA DE CRÉDITO', canvas.width / 2, 90);
      ctx.font = '12px Arial';
      ctx.fillText('Comprovante de Transação', canvas.width / 2, 110);

      // Linha separadora (ajustada para ficar abaixo da logo e título)
      ctx.strokeStyle = '#cccccc';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(20, 130);
      ctx.lineTo(canvas.width - 20, 130);
      ctx.stroke();
      ctx.setLineDash([]);

      // Dados da transação com layout tabulado
      let yPosition = 160;
      const lineHeight = 25;
      const fontSize = '10px'; // Fonte uniforme

      const dados = [
        ['Lançamento:', lancamentoSelecionado.lancamento || 'N/A'],
        ['Data/Hora:', `${formatarData(lancamentoSelecionado.data)} ${lancamentoSelecionado.hora}`],
        ...(lancamentoSelecionado.razaosocial || lancamentoSelecionado.nome_empregador || lancamentoSelecionado.empregador ? [
          ['Estabelecimento:', lancamentoSelecionado.razaosocial || lancamentoSelecionado.nome_empregador || lancamentoSelecionado.empregador, true]
        ] : []),
        ...(lancamentoSelecionado.nome_fantasia ? [['Nome Fantasia:', lancamentoSelecionado.nome_fantasia, true]] : []),
        ...(lancamentoSelecionado.cnpj ? [['CNPJ:', lancamentoSelecionado.cnpj, true]] : []),
        ...(lancamentoSelecionado.endereco ? [['Endereço:', lancamentoSelecionado.endereco, true]] : []),
        ['Associado:', lancamentoSelecionado.nome_associado || lancamentoSelecionado.associado],
        ...(lancamentoSelecionado.cpf_associado || lancamentoSelecionado.cpf ? [['CPF:', lancamentoSelecionado.cpf_associado || lancamentoSelecionado.cpf]] : []),
        ...(lancamentoSelecionado.nome_empregador ? [['Empregador:', lancamentoSelecionado.nome_empregador]] : []),
        ['Mês Referência:', lancamentoSelecionado.mes],
        ['Parcela:', lancamentoSelecionado.parcela || '01/01'],
        ['VALOR TOTAL:', formatarValor(lancamentoSelecionado.valor)]
      ];

      dados.forEach((item) => {
        const [label, value, isSmall] = item as [string, string, boolean?];
        
        ctx.fillStyle = '#666666';
        ctx.font = 'bold ' + fontSize + ' Arial';
        ctx.fillText(label, 30, yPosition);
        ctx.fillStyle = '#000000';
        ctx.font = fontSize + ' Arial';
        
        // Para endereço, quebrar texto se for muito longo
        if (label === 'Endereço:' && String(value).length > 30) {
          const maxWidth = canvas.width - 180;
          const words = String(value).split(' ');
          let line = '';
          let testLine = '';
          let lineY = yPosition;
          
          for (let n = 0; n < words.length; n++) {
            testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
              // Alinhar à direita
              const lineWidth = ctx.measureText(line).width;
              ctx.fillText(line, canvas.width - lineWidth - 30, lineY);
              line = words[n] + ' ';
              lineY += 15;
            } else {
              line = testLine;
            }
          }
          const lineWidth = ctx.measureText(line).width;
          ctx.fillText(line, canvas.width - lineWidth - 30, lineY);
          yPosition = lineY + lineHeight;
        } else {
          // Alinhar valor à direita
          const textWidth = ctx.measureText(String(value)).width;
          ctx.fillText(String(value), canvas.width - textWidth - 30, yPosition);
          yPosition += lineHeight;
        }
      });

      // Linha separadora inferior
      ctx.strokeStyle = '#cccccc';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(20, yPosition + 10);
      ctx.lineTo(canvas.width - 20, yPosition + 10);
      ctx.stroke();

      // Texto final
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#666666';
      ctx.fillText('TRANSAÇÃO AUTORIZADA - CRÉDITO NO CONVÊNIO', canvas.width / 2, yPosition + 35);
      ctx.fillText('DOCUMENTO DIGITAL VÁLIDO', canvas.width / 2, yPosition + 50);

      // Converter canvas para blob
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        // Verificar se o navegador suporta Web Share API
        if (navigator.share && navigator.canShare) {
          const file = new File([blob], `comprovante_${lancamentoSelecionado.lancamento || 'sem_numero'}.png`, {
            type: 'image/png'
          });

          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                title: 'Comprovante de Transação',
                text: `Comprovante da transação ${lancamentoSelecionado.lancamento || 'N/A'}`,
                files: [file]
              });
              toast.success('Comprovante compartilhado com sucesso!');
            } catch (error) {
              if ((error as Error).name !== 'AbortError') {
                console.error('Erro ao compartilhar:', error);
                toast.error('Erro ao compartilhar comprovante');
              }
            }
          } else {
            // Fallback: download da imagem
            baixarImagem(blob);
          }
        } else {
          // Fallback: download da imagem
          baixarImagem(blob);
        }
      }, 'image/png');

    } catch (error) {
      console.error('Erro ao gerar comprovante:', error);
      toast.error('Erro ao gerar comprovante');
    }
  };

  // Função fallback para baixar a imagem
  const baixarImagem = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comprovante_${lancamentoSelecionado?.lancamento || lancamentoSelecionado?.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Comprovante baixado com sucesso!');
  };

  // Função para exportar relatório em PDF (versão simplificada sem autoTable)
  const exportarPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Cabeçalho
      doc.setFontSize(16);
      doc.text('SASCRED - Relatório de Lançamentos', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Período: ${mesSelecionado || 'Todos os meses'}`, 20, 30);
      doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')}`, 20, 40);
      doc.text(`Total: ${totalDoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 20, 50);
      
      // Linha separadora
      doc.setLineWidth(0.5);
      doc.line(20, 60, 190, 60);
      
      // Cabeçalho da tabela manual
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      let yPos = 75;
      doc.text('Associado', 20, yPos);
      doc.text('Valor', 80, yPos);
      doc.text('Lançamento', 110, yPos);
      doc.text('Data', 140, yPos);
      doc.text('Hora', 165, yPos);
      doc.text('Parcela', 180, yPos);
      
      // Linha após cabeçalho
      doc.line(20, yPos + 3, 190, yPos + 3);
      
      // Dados da tabela
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      yPos += 10;
      
      lancamentosFiltrados.forEach((lancamento, index) => {
        if (yPos > 270) { // Nova página se necessário
          doc.addPage();
          yPos = 20;
        }
        
        const associado = (lancamento.nome_associado || lancamento.associado).substring(0, 15);
        const valor = `R$ ${formatarValorLista(lancamento.valor)}`;
        const numLancamento = (lancamento.lancamento || '#' + lancamento.id).toString().substring(0, 8);
        const data = formatarData(lancamento.data);
        const hora = lancamento.hora.substring(0, 5);
        const parcela = (lancamento.parcela || '01/01').substring(0, 5);
        
        doc.text(associado, 20, yPos);
        doc.text(valor, 80, yPos);
        doc.text(numLancamento, 110, yPos);
        doc.text(data, 140, yPos);
        doc.text(hora, 165, yPos);
        doc.text(parcela, 180, yPos);
        
        yPos += 8;
      });
      
      // Linha final
      doc.setLineWidth(0.5);
      doc.line(20, yPos + 5, 190, yPos + 5);
      
      // Total final
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL: ${totalDoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 20, yPos + 15);
      
      // Salvar PDF
      const nomeArquivo = `relatorio_lancamentos_${mesSelecionado || 'todos'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(nomeArquivo);
      
      toast.success('Relatório PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF.');
    }
  };

  // Função para exportar relatório em CSV
  const exportarCSV = () => {
    try {
      // Cabeçalho do CSV
      const cabecalho = 'Associado,Valor,Lançamento,Data,Hora,Parcela,Mês,Empregador\n';
      
      // Dados do CSV
      const dadosCSV = lancamentosFiltrados.map(lancamento => {
        const linha = [
          `"${(lancamento.nome_associado || lancamento.associado).replace(/"/g, '""')}"`,
          `"R$ ${formatarValorLista(lancamento.valor)}"`,
          `"${lancamento.lancamento || '#' + lancamento.id}"`,
          `"${formatarData(lancamento.data)}"`,
          `"${lancamento.hora}"`,
          `"${lancamento.parcela || '01/01'}"`,
          `"${lancamento.mes}"`,
          `"${(lancamento.nome_empregador || lancamento.empregador).replace(/"/g, '""')}"`
        ];
        return linha.join(',');
      }).join('\n');
      
      // Adicionar total no final
      const totalLinha = `\n\n"TOTAL","${totalDoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}","","","","","${mesSelecionado || 'Todos'}",""`;
      
      const csvContent = cabecalho + dadosCSV + totalLinha;
      
      // Criar e baixar arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      const nomeArquivo = `relatorio_lancamentos_${mesSelecionado || 'todos'}_${new Date().toISOString().split('T')[0]}.csv`;
      
      link.href = url;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Relatório CSV exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast.error('Erro ao exportar CSV.');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="mt-1 text-sm text-gray-600">Visualize e analise os dados do seu convênio</p>
      </div>

      {/* Listagem de Lançamentos */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-4">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Lançamentos</h2>
          
          <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4">
            {/* Primeira linha: Campo de Busca e Filtro por Mês */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
              {/* Campo de Busca */}
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <label htmlFor="busca" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Buscar:
                </label>
                <input
                  id="busca"
                  type="text"
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  placeholder="Nome, CPF, valor, data..."
                  className="block w-full sm:w-64 pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                />
              </div>
              
              {/* Filtro por Mês */}
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <FaFilter className="text-gray-500" />
                <label htmlFor="mes" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Filtrar por Mês:
                </label>
                <select
                  id="mes"
                  value={mesSelecionado}
                  onChange={(e) => setMesSelecionado(e.target.value)}
                  className="block w-full sm:w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  {mesesDisponiveis.map((mes) => (
                    <option key={mes} value={mes}>
                      {mes}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Segunda linha: Botões de Exportação */}
            <div className="flex items-center space-x-2 w-full xl:w-auto justify-start xl:justify-end">
              <FaDownload className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Exportar:</span>
              <button
                onClick={exportarPDF}
                className="flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                title="Exportar para PDF"
              >
                <FaFilePdf className="mr-1 h-4 w-4" />
                PDF
              </button>
              <button
                onClick={exportarCSV}
                className="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                title="Exportar para CSV"
              >
                <FaFileCsv className="mr-1 h-4 w-4" />
                CSV
              </button>
            </div>
          </div>
        </div>

        {/* Total do Mês */}
        {lancamentosFiltrados.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaReceipt className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-900">
                  {mesSelecionado 
                    ? `Total de lançamentos do mês ${mesSelecionado}:` 
                    : 'Total geral de lançamentos:'}
                </span>
              </div>
              <span className="text-lg font-bold text-blue-900">
                {totalDoMes.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </span>
            </div>
            <div className="mt-1 text-xs text-blue-700">
              {lancamentosFiltrados.length} lançamento{lancamentosFiltrados.length !== 1 ? 's' : ''} encontrado{lancamentosFiltrados.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {loadingLancamentos ? (
          <div className="text-center py-8">
            <FaSpinner className="animate-spin h-8 w-8 mx-auto text-blue-600" />
          </div>
        ) : lancamentosFiltrados.length > 0 ? (
          <>
            {/* Versão para Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lançamento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hora - Parcela
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lancamentosFiltrados.map((lancamento) => (
                    <tr key={lancamento.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lancamento.nome_associado || lancamento.associado}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        R$ {formatarValorLista(lancamento.valor)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lancamento.lancamento || '#' + lancamento.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatarData(lancamento.data)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lancamento.hora} - Parcela {lancamento.parcela || '01/01'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-3">
                          <button
                            onClick={() => abrirComprovante(lancamento)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Ver comprovante"
                          >
                            <FaReceipt className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => confirmarEstorno(lancamento)}
                            disabled={estornandoId === lancamento.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Estornar lançamento"
                          >
                            {estornandoId === lancamento.id ? (
                              <FaSpinner className="animate-spin h-5 w-5" />
                            ) : (
                              <FaUndo className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Versão para Mobile */}
            <div className="md:hidden space-y-4">
              {lancamentosFiltrados.map((lancamento) => (
                <div key={lancamento.id} className="bg-white rounded-lg shadow border border-gray-200 p-4">
                  <div className="mb-3">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">
                      {lancamento.nome_associado || lancamento.associado}
                    </h3>
                    <div className="font-semibold text-lg text-gray-900 mb-2">
                      R$ {formatarValorLista(lancamento.valor)}
                    </div>
                    <div className="text-sm text-gray-700 mb-2">
                      <span className="font-medium">Lançamento:</span> {lancamento.lancamento || '#' + lancamento.id}
                    </div>
                    <div className="text-sm text-gray-700 mb-1">
                      <span className="font-medium">Data:</span> {formatarData(lancamento.data)}
                    </div>
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Hora:</span> {lancamento.hora} - <span className="font-medium">Parcela:</span> {lancamento.parcela || '01/01'}
                    </div>
                  </div>
                  
                  <div className="mt-3 border-t pt-3 flex justify-end space-x-2">
                    <button
                      onClick={() => abrirComprovante(lancamento)}
                      className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <FaReceipt className="mr-2 h-4 w-4" />
                      Comprovante
                    </button>
                    <button
                      onClick={() => confirmarEstorno(lancamento)}
                      disabled={estornandoId === lancamento.id}
                      className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {estornandoId === lancamento.id ? (
                        <>
                          <FaSpinner className="animate-spin mr-2 h-4 w-4" />
                          Estornando...
                        </>
                      ) : (
                        <>
                          <FaUndo className="mr-2 h-4 w-4" />
                          Estornar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg p-8 text-center">
            <FaExclamationTriangle className="mx-auto h-12 w-12 text-yellow-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhum lançamento encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">
              {mesSelecionado 
                ? `Não há lançamentos registrados para o mês ${mesSelecionado}.` 
                : 'Não há lançamentos registrados no sistema.'}
            </p>
          </div>
        )}
      </div>

      {/* Modal de confirmação */}
      {showModal && lancamentoSelecionado && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full overflow-hidden shadow-xl transform transition-all">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <FaExclamationTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Confirmar estorno
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Tem certeza que deseja estornar este lançamento? Esta ação não poderá ser desfeita.
                    </p>
                    
                    <div className="mt-3 bg-gray-50 p-3 rounded-md text-sm">
                      <p><span className="font-semibold">Associado:</span> {lancamentoSelecionado.nome_associado || lancamentoSelecionado.associado}</p>
                      <p><span className="font-semibold">Data:</span> {lancamentoSelecionado.data}</p>
                      <p><span className="font-semibold">Valor:</span> R$ {lancamentoSelecionado.valor}</p>
                      <p><span className="font-semibold">Mês:</span> {lancamentoSelecionado.mes}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={handleEstornar}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Confirmar Estorno
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Comprovante Digital */}
      {showComprovanteModal && lancamentoSelecionado && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full overflow-hidden shadow-xl transform transition-all">
            <div className="relative bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <button
                onClick={() => setShowComprovanteModal(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-500"
              >
                <FaTimes className="h-5 w-5" />
              </button>
              
              <div className="mt-2 text-center">
                <div className="flex justify-center mb-4">
                  <img 
                    src="/icons/icon-192x192.png" 
                    alt="Logo SAS" 
                    width="48" 
                    height="48" 
                    className="object-contain rounded-full"
                  />
                </div>
                <h3 className="text-lg leading-6 font-bold text-gray-900 mb-4">
                  Comprovante Digital
                </h3>
                
                <div className="border-t border-b border-dashed border-gray-300 py-6 px-2">
                  <div className="text-center mb-4">
                    <p className="font-bold text-gray-900">SASACRED - SISTEMA DE CRÉDITO</p>
                    <p className="text-sm text-gray-600">Comprovante de Transação</p>
                  </div>
                  
                  <div className="space-y-3 text-left">
                    <div className="grid grid-cols-[140px_1fr] gap-2">
                      <span className="text-sm text-gray-600 font-semibold">Lançamento:</span>
                      <span className="text-sm font-medium text-gray-900 text-right">{lancamentoSelecionado.lancamento || 'N/A'}</span>
                    </div>
                    
                    <div className="grid grid-cols-[140px_1fr] gap-2">
                      <span className="text-sm text-gray-600 font-semibold">Data/Hora:</span>
                      <span className="text-sm font-medium text-gray-900 text-right">{formatarData(lancamentoSelecionado.data)} {lancamentoSelecionado.hora}</span>
                    </div>

                    {(lancamentoSelecionado.razaosocial || lancamentoSelecionado.nome_empregador || lancamentoSelecionado.empregador) && (
                      <div className="space-y-1.5 bg-gray-50 p-3 rounded-lg">
                        <div className="grid grid-cols-[140px_1fr] gap-2">
                          <span className="text-xs text-gray-600 font-semibold">Estabelecimento:</span>
                          <span className="text-xs font-medium text-gray-900 text-right">{lancamentoSelecionado.razaosocial || lancamentoSelecionado.nome_empregador || lancamentoSelecionado.empregador}</span>
                        </div>
                        {lancamentoSelecionado.nome_fantasia && (
                          <div className="grid grid-cols-[140px_1fr] gap-2">
                            <span className="text-xs text-gray-600 font-semibold">Nome Fantasia:</span>
                            <span className="text-xs font-medium text-gray-900 text-right">{lancamentoSelecionado.nome_fantasia}</span>
                          </div>
                        )}
                        {lancamentoSelecionado.cnpj && (
                          <div className="grid grid-cols-[140px_1fr] gap-2">
                            <span className="text-xs text-gray-600 font-semibold">CNPJ:</span>
                            <span className="text-xs font-medium text-gray-900 text-right">{lancamentoSelecionado.cnpj}</span>
                          </div>
                        )}
                        {lancamentoSelecionado.endereco && (
                          <div className="grid grid-cols-[140px_1fr] gap-2">
                            <span className="text-xs text-gray-600 font-semibold">Endereço:</span>
                            <span className="text-xs font-medium text-gray-900 text-right leading-tight">{lancamentoSelecionado.endereco}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-[140px_1fr] gap-2">
                      <span className="text-sm text-gray-600 font-semibold">Associado:</span>
                      <span className="text-sm font-medium text-gray-900 text-right">{lancamentoSelecionado.nome_associado || lancamentoSelecionado.associado}</span>
                    </div>
                    
                    {(lancamentoSelecionado.cpf_associado || lancamentoSelecionado.cpf) && (
                      <div className="grid grid-cols-[140px_1fr] gap-2">
                        <span className="text-sm text-gray-600 font-semibold">CPF:</span>
                        <span className="text-sm font-medium text-gray-900 text-right">{lancamentoSelecionado.cpf_associado || lancamentoSelecionado.cpf}</span>
                      </div>
                    )}
                    
                    {lancamentoSelecionado.nome_empregador && (
                      <div className="grid grid-cols-[140px_1fr] gap-2">
                        <span className="text-sm text-gray-600 font-semibold">Empregador:</span>
                        <span className="text-sm font-medium text-gray-900 text-right">{lancamentoSelecionado.nome_empregador}</span>
                      </div>
                    )}
                    
                    <div className="border-t border-gray-200 my-2 pt-2 space-y-2">
                      <div className="grid grid-cols-[140px_1fr] gap-2">
                        <span className="text-sm text-gray-600 font-semibold">Mês Referência:</span>
                        <span className="text-sm font-medium text-gray-900 text-right">{lancamentoSelecionado.mes}</span>
                      </div>
                      
                      <div className="grid grid-cols-[140px_1fr] gap-2">
                        <span className="text-sm text-gray-600 font-semibold">Parcela:</span>
                        <span className="text-sm font-medium text-gray-900 text-right">{lancamentoSelecionado.parcela || '01/01'}</span>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 my-2 pt-2">
                      <div className="grid grid-cols-[140px_1fr] gap-2">
                        <span className="text-sm text-gray-700 font-bold">VALOR TOTAL:</span>
                        <span className="text-sm text-gray-900 font-bold text-right">{formatarValor(lancamentoSelecionado.valor)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 text-center">
                    <p className="text-xs text-gray-500">TRANSAÇÃO AUTORIZADA - CRÉDITO NO CONVÊNIO</p>
                    <p className="text-xs text-gray-500 mt-1">ESTE DOCUMENTO É UMA REPRESENTAÇÃO DIGITAL DO COMPROVANTE</p>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-center space-x-3 print:hidden">
                  <button
                    onClick={compartilharComprovante}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FaShare className="mr-2 -ml-1 h-4 w-4" />
                    Compartilhar
                  </button>
                  
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FaPrint className="mr-2 -ml-1 h-4 w-4" />
                    Imprimir
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}