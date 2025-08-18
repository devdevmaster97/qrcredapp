'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FaSpinner, FaQrcode, FaArrowLeft, FaCreditCard, FaCalendarAlt, FaCheckCircle } from 'react-icons/fa';
import Header from '@/app/components/Header';
import toast from 'react-hot-toast';
import { Html5Qrcode } from 'html5-qrcode';

interface AssociadoData {
  id?: number; // ID do associado da tabela sind.associado
  nome: string;
  matricula: string;
  empregador: string;
  saldo: number;
  token_associado?: string;
  cel?: string;
  limite?: string;
}

export default function NovoLancamentoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingCartao, setLoadingCartao] = useState(false);
  const [cartao, setCartao] = useState('');
  const [valor, setValor] = useState('');
  const [parcelas, setParcelas] = useState(1);
  const [maxParcelas, setMaxParcelas] = useState(12);
  const [senha, setSenha] = useState('');
  const [descricao, setDescricao] = useState('');
  const [associado, setAssociado] = useState<AssociadoData | null>(null);
  const [valorParcela, setValorParcela] = useState(0);
  const [showQrReader, setShowQrReader] = useState(false);
  const [mesCorrente, setMesCorrente] = useState('');
  const [showConfirmacao, setShowConfirmacao] = useState(false);
  const [valorPagamento, setValorPagamento] = useState('');
  const qrReaderRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  
  // Usar URLs reais da API - sem simulações locais
  const BASE_URL = 'https://sas.makecard.com.br';
  const API_URL = `${BASE_URL}/localizaasapp.php`;
  const API_MESES = `${BASE_URL}/meses_corrente_app.php`;
  const API_CONTA = `${BASE_URL}/conta_app.php`;
  const API_CONTA_SALDO = `${BASE_URL}/conta_saldo_app.php`; // API simplificada para cálculo de saldo
  const API_SENHA = `${BASE_URL}/consulta_pass_assoc.php`;
  const API_GRAVA_VENDA = `${BASE_URL}/grava_venda_app.php`;

  // Inicializa e limpa o leitor QR ao montar/desmontar
  useEffect(() => {
    // Limpar o scanner QR quando o componente for desmontado
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(error => {
          console.error("Erro ao parar o scanner:", error);
        });
      }
    };
  }, []);

  // Inicializa o leitor QR quando o modal é aberto
  useEffect(() => {
    if (showQrReader && qrReaderRef.current) {
      const qrCodeId = "qr-reader-" + Date.now();
      // Limpa o conteúdo anterior e adiciona um novo elemento
      qrReaderRef.current.innerHTML = `<div id="${qrCodeId}" style="width:100%;"></div>`;

      // Inicializa o scanner
      html5QrCodeRef.current = new Html5Qrcode(qrCodeId);
      
      html5QrCodeRef.current.start(
        { facingMode: "environment" }, // Usar câmera traseira
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Sucesso
          if (html5QrCodeRef.current) {
            html5QrCodeRef.current.stop().then(() => {
              setShowQrReader(false);
              setCartao(decodedText);
              buscarAssociado();
            }).catch(err => {
              console.error("Erro ao parar o scanner:", err);
            });
          }
        },
        (errorMessage) => {
          // Erro ou QR não encontrado (ignorar)
        }
      ).catch(err => {
        console.error("Erro ao iniciar o scanner:", err);
        toast.error("Não foi possível acessar a câmera");
        setShowQrReader(false);
      });
    }
  }, [showQrReader]);

  // Formatar valor como moeda
  const formatarValor = (valor: string) => {
    // Remove caracteres não numéricos
    const valorNumerico = valor.replace(/\D/g, '');
    
    // Converte para centavos e depois formata como moeda
    const valorEmReais = (parseInt(valorNumerico) / 100).toFixed(2);
    return valorEmReais;
  };

  // Atualiza valor da parcela quando valor total ou número de parcelas mudam
  useEffect(() => {
    if (valor && parcelas > 0) {
      const valorNumerico = parseFloat(valor.replace(/[^\d,]/g, '').replace(',', '.'));
      if (!isNaN(valorNumerico)) {
        setValorParcela(valorNumerico / parcelas);
      }
    } else {
      setValorParcela(0);
    }
  }, [valor, parcelas]);

  // Adicionar useEffect para obter dados do convênio ao carregar a página
  useEffect(() => {
    const carregarDadosConvenio = async () => {
      // Tentar obter dados do convênio do localStorage
      try {
        const dadosConvenioString = localStorage.getItem('dadosConvenio');
        
        if (dadosConvenioString) {
          const dadosConvenio = JSON.parse(dadosConvenioString);
          console.log('📊 Dados do convênio obtidos do localStorage:', dadosConvenio);
          
          // Verificar se o código do convênio está presente
          if (dadosConvenio.cod_convenio) {
            console.log('📊 Código do convênio encontrado no localStorage:', dadosConvenio.cod_convenio);
          } else {
            console.warn('⚠️ Código do convênio não encontrado no localStorage');
            // Se não houver dados no localStorage, buscar da API
            await buscarDadosConvenioAPI();
          }
        } else {
          console.warn('⚠️ Dados do convênio não encontrados no localStorage');
          // Se não houver dados no localStorage, buscar da API
          await buscarDadosConvenioAPI();
        }
      } catch (error) {
        console.error('❌ Erro ao obter dados do convênio:', error);
        // Se houver erro, tentar buscar da API
        await buscarDadosConvenioAPI();
      }
    };
    
    const buscarDadosConvenioAPI = async () => {
      try {
        console.log('📤 Buscando dados do convênio da API...');
        const response = await fetch('/api/convenio/dados');
        const data = await response.json();
        
        if (data.success && data.data) {
          // Salvar os dados do convênio no localStorage
          localStorage.setItem('dadosConvenio', JSON.stringify(data.data));
          console.log('📊 Dados do convênio salvos no localStorage:', data.data);
        } else {
          console.error('❌ Falha ao obter dados do convênio da API');
        }
      } catch (error) {
        console.error('❌ Erro ao buscar dados do convênio da API:', error);
      }
    };
    
    carregarDadosConvenio();
  }, []);

  // Função alternativa usando XMLHttpRequest para contornar possíveis problemas de CORS
  const xhrRequest = (url: string, method = 'GET', data: any = null, options: any = {}): Promise<any> => {
    return new Promise((resolve, reject) => {
      console.log('🌐 XHR: Iniciando requisição para', url, { method, withCredentials: options.withCredentials });
      const xhr = new XMLHttpRequest();
      
      // Configurar timeout de 30 segundos
      xhr.timeout = options.timeout || 30000;
      
      xhr.open(method, url, true);
      
      // Tentar configurar withCredentials se especificado
      if (options.withCredentials) {
        xhr.withCredentials = true;
      }
      
      if (method === 'POST') {
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      }
      
      // Adicionar headers customizados se fornecidos
      if (options.headers) {
        Object.keys(options.headers).forEach(header => {
          try {
            xhr.setRequestHeader(header, options.headers[header]);
          } catch (e) {
            console.warn(`Não foi possível definir o header ${header}:`, e);
          }
        });
      }
      
      xhr.onload = function() {
        console.log('🌐 XHR: Resposta recebida', {
          status: xhr.status,
          statusText: xhr.statusText,
          responseText: xhr.responseText.substring(0, 500) // Mostra apenas os primeiros 500 caracteres
        });
        
        // Extrair todos os cabeçalhos para diagnóstico
        try {
          const headersText = xhr.getAllResponseHeaders();
          console.log('🌐 XHR: Cabeçalhos da resposta:', headersText);
        } catch (e) {
          console.warn('🌐 XHR: Não foi possível ler cabeçalhos:', e);
        }
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            // Tenta parsear como JSON
            const jsonResponse = JSON.parse(xhr.responseText);
            resolve(jsonResponse);
          } catch (e) {
            // Se não for JSON, retorna o texto
            resolve(xhr.responseText);
          }
        } else {
          reject({
            status: xhr.status,
            statusText: xhr.statusText,
            responseText: xhr.responseText
          });
        }
      };
      
      xhr.onerror = function() {
        console.error('🌐 XHR: Erro de rede', {
          url,
          method,
          status: xhr.status,
          statusText: xhr.statusText
        });
        reject({
          status: xhr.status,
          statusText: xhr.statusText,
          error: 'Erro de rede'
        });
      };
      
      xhr.ontimeout = function() {
        console.error('🌐 XHR: Timeout atingido');
        reject({
          error: 'Timeout',
          message: 'A requisição excedeu o tempo limite de 30 segundos'
        });
      };
      
      // Para requisições POST, converte dados em formato de URL encoded
      if (method === 'POST' && data) {
        let formData = '';
        if (typeof data === 'string') {
          formData = data;
        } else if (data instanceof URLSearchParams) {
          formData = data.toString();
        } else if (typeof data === 'object') {
          formData = new URLSearchParams(data).toString();
        }
        console.log('🌐 XHR: Enviando dados', formData);
        xhr.send(formData);
      } else {
        xhr.send();
      }
    });
  };

  const buscarAssociado = async () => {
    if (!cartao || cartao.length < 5) {
      toast.error('Número de cartão inválido');
      return;
    }

    setLoadingCartao(true);
    setAssociado(null);

    try {
      console.log('🔍 Buscando associado pelo cartão:', cartao);
      toast.success('Buscando cartão...');
      
      // Usando XHR diretamente para melhor controle e diagnóstico
      const xhr = new XMLHttpRequest();
      
      // Definir um timeout de 20 segundos
      xhr.timeout = 20000;
      
      // Configurar a requisição
      xhr.open('POST', API_URL, true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      
      // Monitorar o carregamento
      xhr.onloadstart = () => console.log('🔍 Iniciando busca de associado');
      
      // Configurar o handler de sucesso
      xhr.onload = async function() {
        console.log('✅ Resposta recebida para busca do associado:', {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: xhr.getAllResponseHeaders()
        });
        
        // Verificar se a resposta foi bem-sucedida
        if (xhr.status >= 200 && xhr.status < 300) {
          const responseText = xhr.responseText;
          console.log('📄 Resposta da API (texto):', responseText.substring(0, 500));
          
          if (!responseText || responseText.trim() === '') {
            console.error('❌ Resposta vazia da API');
            toast.error('Resposta vazia da API');
            setLoadingCartao(false);
            return;
          }
          
          // Tentar converter para JSON
          try {
            const data = JSON.parse(responseText);
            console.log('🧩 Dados parseados:', data);
            
            // Verificação simplificada - apenas verificamos se o nome não é incorreto ou vazio
            if (data && data.nome && data.nome !== 'login incorreto' && data.nome !== "login fazio") {
              console.log('✅ Dados do associado válidos, iniciando processamento...');
              await processarDadosAssociado(data);
              console.log('✅ Processamento do associado concluído');
              setLoadingCartao(false);
              return;
            } else {
              // Se a API responder mas não encontrar o cartão
              console.warn('⚠️ Cartão não encontrado ou login inválido:', data);
              toast.error('Cartão não encontrado');
              setCartao('');
              setLoadingCartao(false);
            }
          } catch (parseError) {
            console.error('❌ Erro ao fazer parse do JSON:', parseError);
            toast.error('Formato de resposta inválido');
            setLoadingCartao(false);
            return;
          }
        } else {
          console.error('❌ Erro na resposta:', xhr.status, xhr.statusText);
          toast.error(`Erro na resposta da API: ${xhr.status}`);
          setLoadingCartao(false);
        }
      };
      
      // Configurar handler de erro
      xhr.onerror = function() {
        console.error('❌ Erro de rede na requisição XHR');
        toast.error('Erro de rede, verifique sua conexão');
        setLoadingCartao(false);
      };
      
      // Configurar handler de timeout
      xhr.ontimeout = function() {
        console.error('⏱️ Timeout na busca do associado');
        toast.error('Tempo limite excedido, tente novamente');
        setLoadingCartao(false);
      };
      
      // Preparar dados para envio
      const formData = new URLSearchParams();
      formData.append('cartaodigitado', cartao);
      
      console.log('📤 Enviando dados:', formData.toString());
      
      // Enviar a requisição
      xhr.send(formData.toString());
    } catch (error) {
      console.error('❌ Erro geral na busca do associado:', error);
      toast.error('Erro ao buscar dados do cartão');
      setLoadingCartao(false);
    }
  };

  // Função auxiliar para processar dados do associado
  const processarDadosAssociado = async (data: any) => {
    console.log('✅ DADOS VÁLIDOS DO ASSOCIADO:', data);
    
    // Criar objeto com todos os dados necessários
    const associadoData: AssociadoData = {
      id: data.id, // ID do associado da tabela sind.associado
      nome: data.nome,
      matricula: data.matricula || data.codigo, // Aceita tanto matricula quanto codigo
      empregador: data.empregador,
      cel: data.cel,
      limite: data.limite, // Definir um valor padrão caso o limite não esteja presente
      token_associado: data.token_associado,
      saldo: 0 // Será preenchido após capturar o mês corrente
    };
    
    console.log('📝 DADOS PROCESSADOS DO ASSOCIADO:', associadoData);
    
    // Verificar se todos os dados necessários estão presentes
    const camposNecessarios = {
      temNome: !!associadoData.nome,
      temMatricula: !!associadoData.matricula,
      temEmpregador: !!associadoData.empregador,
      temLimite: !!associadoData.limite
    };
    
    console.log('🔍 Verificação de campos necessários:', camposNecessarios);
    
    // NÃO atualizar o estado ainda - aguardar cálculo do saldo primeiro
    
    // Verificar se campos necessários estão presentes
    if (associadoData.matricula && associadoData.empregador) {
      console.log('🚀 INICIANDO CAPTURA DO MÊS CORRENTE COM:', {
        matricula: associadoData.matricula,
        empregador: associadoData.empregador,
        limite: associadoData.limite
      });
      
      // Aguardar a conclusão da captura do mês corrente antes de finalizar
      try {
        await capturarMesCorrente(associadoData.matricula, associadoData.empregador, associadoData);
      } catch (error) {
        console.error('❌ Erro ao capturar mês corrente:', error);
        toast.error('Erro ao obter dados completos do associado');
        
        // Em caso de erro, atualizar com saldo 0
        setAssociado(associadoData);
      }
    } else {
      console.error('❌ DADOS DO ASSOCIADO INCOMPLETOS:', {
        temMatricula: !!associadoData.matricula,
        temEmpregador: !!associadoData.empregador
      });
      toast.error('Dados do associado incompletos');
    }
  };

  // Adiciona efeito para verificar se há mês em cache ao iniciar
  useEffect(() => {
    // Verifica se há um mês em cache e quando foi armazenado
    try {
      const cachedMonthData = localStorage.getItem('mesCorrenteCache');
      
      if (cachedMonthData) {
        const { mes, timestamp } = JSON.parse(cachedMonthData);
        const agora = new Date().getTime();
        const umDiaEmMs = 24 * 60 * 60 * 1000;
        
        // Usa o cache se tiver menos de 1 dia
        if (mes && (agora - timestamp) < umDiaEmMs) {
          console.log('📆 Usando mês corrente do cache:', mes);
          setMesCorrente(mes);
        } else {
          console.log('📆 Cache do mês corrente expirado ou inválido');
        }
      }
    } catch (err) {
      console.warn('Erro ao acessar cache do mês corrente:', err);
    }
  }, []);

  // Função para buscar o mês corrente usando XMLHttpRequest
  const buscarMesCorrenteXHR = (endpoint: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      console.log('🗓️ XHR: Buscando mês corrente em:', endpoint);
      const xhr = new XMLHttpRequest();
      
      xhr.timeout = 20000;
      xhr.open('GET', endpoint, true);
      
      xhr.onload = function() {
        console.log('🗓️ XHR: Resposta recebida para mês corrente:', {
          status: xhr.status,
          statusText: xhr.statusText,
          responseText: xhr.responseText.substring(0, 200)
        });
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            // Tenta parsear como JSON
            const jsonResponse = JSON.parse(xhr.responseText);
            resolve(jsonResponse);
      } catch (e) {
            // Se não for JSON, retorna o texto
            resolve(xhr.responseText);
          }
        } else {
          reject({
            status: xhr.status,
            statusText: xhr.statusText,
            responseText: xhr.responseText
          });
        }
      };
      
      xhr.onerror = function() {
        console.error('🗓️ XHR: Erro de rede ao buscar mês corrente', {
          endpoint,
          status: xhr.status,
          statusText: xhr.statusText
        });
        reject({
          status: xhr.status,
          statusText: xhr.statusText,
          error: 'Erro de rede'
        });
      };
      
      xhr.ontimeout = function() {
        console.error('🗓️ XHR: Timeout ao buscar mês corrente');
        reject({
          error: 'Timeout',
          message: 'A requisição excedeu o tempo limite de 20 segundos'
        });
      };
      
      xhr.send();
    });
  };

  // Função para consultar conta usando XMLHttpRequest
  const consultarContaXHR = (matricula: string, empregador: string, mes: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      console.log('💰 XHR: Consultando conta:', { matricula, empregador, mes });
      const xhr = new XMLHttpRequest();
      
      xhr.timeout = 25000;
      xhr.open('POST', API_CONTA, true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      
      xhr.onload = function() {
        console.log('💰 XHR: Resposta recebida para conta:', {
          status: xhr.status,
          statusText: xhr.statusText,
          responseText: xhr.responseText.substring(0, 200)
        });
        
        console.log('💰 XHR: Resposta COMPLETA da API conta:', xhr.responseText);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            // Tenta parsear como JSON
            const jsonResponse = JSON.parse(xhr.responseText);
            resolve(jsonResponse);
          } catch (e) {
            // Se não for JSON, retorna o texto
            resolve(xhr.responseText);
          }
        } else {
          reject({
            status: xhr.status,
            statusText: xhr.statusText,
            responseText: xhr.responseText
          });
        }
      };
      
      xhr.onerror = function() {
        console.error('💰 XHR: Erro de rede ao consultar conta', {
          matricula,
          empregador,
          mes,
          status: xhr.status,
          statusText: xhr.statusText
        });
        reject({
          status: xhr.status,
          statusText: xhr.statusText,
          error: 'Erro de rede'
        });
      };
      
      xhr.ontimeout = function() {
        console.error('💰 XHR: Timeout ao consultar conta');
        reject({
          error: 'Timeout',
          message: 'A requisição excedeu o tempo limite de 25 segundos'
        });
      };
      
      // Preparar dados para envio
      const params = new URLSearchParams();
      params.append('matricula', matricula);
      params.append('empregador', empregador.toString()); // Garantir que seja string
      params.append('mes', mes);
      
      console.log('💰 XHR: Parâmetros enviados:', {
        matricula: matricula,
        empregador: empregador,
        empregador_tipo: typeof empregador,
        mes: mes,
        params_string: params.toString()
      });
      
      xhr.send(params.toString());
    });
  };

  // Função para consultar conta com SQL simplificado
  const consultarContaSaldoXHR = (matricula: string, empregador: string, mes: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      console.log('💰 XHR SALDO: Consultando conta simplificada:', { matricula, empregador, mes });
      const xhr = new XMLHttpRequest();
      
      xhr.timeout = 25000;
      xhr.open('POST', API_CONTA_SALDO, true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      
      xhr.onload = function() {
        console.log('💰 XHR SALDO: Resposta recebida:', {
          status: xhr.status,
          statusText: xhr.statusText,
          responseText: xhr.responseText.substring(0, 200)
        });
        
        console.log('💰 XHR SALDO: Resposta COMPLETA:', xhr.responseText);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const jsonResponse = JSON.parse(xhr.responseText);
            resolve(jsonResponse);
          } catch (e) {
            resolve(xhr.responseText);
          }
        } else {
          reject({
            status: xhr.status,
            statusText: xhr.statusText,
            responseText: xhr.responseText
          });
        }
      };
      
      xhr.onerror = function() {
        console.error('💰 XHR SALDO: Erro de rede:', {
          matricula,
          empregador,
          mes,
          status: xhr.status,
          statusText: xhr.statusText
        });
        reject({
          status: xhr.status,
          statusText: xhr.statusText,
          error: 'Erro de rede'
        });
      };
      
      xhr.ontimeout = function() {
        console.error('💰 XHR SALDO: Timeout');
        reject({
          error: 'Timeout',
          message: 'A requisição excedeu o tempo limite'
        });
      };
      
      // Preparar dados para envio
      const params = new URLSearchParams();
      params.append('matricula', matricula);
      params.append('empregador', empregador.toString());
      params.append('mes', mes);
      
      console.log('💰 XHR SALDO: Parâmetros enviados:', {
        matricula: matricula,
        empregador: empregador,
        mes: mes,
        params_string: params.toString()
      });
      
      xhr.send(params.toString());
    });
  };

  // Função para verificar senha usando XMLHttpRequest
  const verificarSenhaXHR = (matricula: string, empregador: string, senha: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      console.log('🔑 XHR: Verificando senha:', { matricula, empregador, senha: '******' });
      const xhr = new XMLHttpRequest();
      
      xhr.timeout = 20000;
      xhr.open('POST', API_SENHA, true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      
      xhr.onload = function() {
        console.log('🔑 XHR: Resposta recebida para verificação de senha:', {
          status: xhr.status,
          statusText: xhr.statusText,
          responseText: xhr.responseText.substring(0, 200)
        });
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            // Tenta parsear como JSON
            const jsonResponse = JSON.parse(xhr.responseText);
            resolve(jsonResponse);
            } catch (e) {
            // Se não for JSON, retorna o texto
            resolve(xhr.responseText);
          }
        } else {
          reject({
            status: xhr.status,
            statusText: xhr.statusText,
            responseText: xhr.responseText
          });
        }
      };
      
      xhr.onerror = function() {
        console.error('🔑 XHR: Erro de rede ao verificar senha', {
          matricula,
          empregador,
          status: xhr.status,
          statusText: xhr.statusText
        });
        reject({
          status: xhr.status,
          statusText: xhr.statusText,
          error: 'Erro de rede'
        });
      };
      
      xhr.ontimeout = function() {
        console.error('🔑 XHR: Timeout ao verificar senha');
        reject({
          error: 'Timeout',
          message: 'A requisição excedeu o tempo limite de 20 segundos'
        });
      };
      
      // Preparar dados para envio
      const params = new URLSearchParams();
      params.append('matricula', matricula);
      params.append('empregador', empregador);
      params.append('senha', senha);
      params.append('pass', senha);       // Tentativa alternativa
      params.append('password', senha);   // Mais uma tentativa
      
      xhr.send(params.toString());
    });
  };

  // Função para gerar mês corrente localmente como fallback
  const gerarMesCorrenteLocal = () => {
    const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const data = new Date();
    return `${meses[data.getMonth()]}/${data.getFullYear()}`;
  };

  // Modificar a função capturarMesCorrente para aceitar o objeto associado completo
  const capturarMesCorrente = async (matricula: string, empregador: string, associadoCompleto: AssociadoData | null = null, retryCount = 0): Promise<void> => {
    try {
      console.log(`🗓️ Capturando mês corrente (tentativa ${retryCount + 1})...`);
      
      let mesAtual = '';
      let tentativaApiSucesso = false;
      
      // Tentar usar a API primeiro
      try {
        // Definir endpoints a serem tentados
        const endpoints = [API_MESES, API_MESES];
        
        // Tentar cada endpoint até que um funcione
        for (const endpoint of endpoints) {
          try {
            console.log('📤 Tentando API do mês corrente:', endpoint);
            
            // Usar XMLHttpRequest para buscar mês corrente
            const resultado = await buscarMesCorrenteXHR(endpoint);
            
            if (resultado) {
              // Verificar se é um objeto com a propriedade abreviacao
              if (typeof resultado === 'object' && resultado.abreviacao) {
                mesAtual = resultado.abreviacao;
                console.log('✅ Mês corrente obtido da API:', mesAtual);
                tentativaApiSucesso = true;
                break;
              }
              // Verificar se é uma string que pode conter o mês
              else if (typeof resultado === 'string' && resultado.includes('/')) {
                mesAtual = resultado;
                console.log('✅ Mês corrente obtido da API (formato string):', mesAtual);
                tentativaApiSucesso = true;
                break;
              }
            }
          } catch (error) {
            console.error(`❌ Erro ao acessar ${endpoint}:`, error);
          }
        }
      } catch (e) {
        console.error('❌ Erro geral ao tentar acessar APIs:', e);
      }
      
      // Se não conseguiu obter da API, gerar localmente
      if (!tentativaApiSucesso) {
        mesAtual = gerarMesCorrenteLocal();
        console.log('⚠️ Usando mês corrente gerado localmente:', mesAtual);
        toast.success('API indisponível. Usando mês atual do sistema.');
      }
      
      // Atualizar o estado com o mês obtido (seja da API ou gerado localmente)
      setMesCorrente(mesAtual);
      
      // Armazenar em cache para usos futuros
      localStorage.setItem('mesCorrenteCache', JSON.stringify({
        mes: mesAtual,
        timestamp: new Date().getTime()
      }));
      
      // Continuar com a consulta da conta
      if (matricula && empregador && mesAtual) {
        try {
          console.log('💰 Consultando conta para:', { matricula, empregador, mes: mesAtual });
          console.log('💰 URL da API Conta:', API_CONTA);
          
          // Primeiro, tentar a API original
          let dadosConta = await consultarContaXHR(matricula, empregador, mesAtual);
          
          // Se não retornar dados, tentar consulta mais simples
          if (Array.isArray(dadosConta) && dadosConta.length === 0) {
            console.log('⚠️ API original retornou vazio. Tentando consulta simplificada...');
            dadosConta = await consultarContaSaldoXHR(matricula, empregador, mesAtual);
          }
          console.log('💰 Resposta da API Conta (tipo):', typeof dadosConta);
          console.log('💰 Resposta da API Conta (é array?):', Array.isArray(dadosConta));
          console.log('💰 Resposta da API Conta (primeira linha):', JSON.stringify(dadosConta, null, 2).substring(0, 500));
          
          // Se não retornou dados, vamos testar algumas variações para debug
          if (Array.isArray(dadosConta) && dadosConta.length === 0) {
            console.log('⚠️ API retornou array vazio. Testando variações dos parâmetros...');
            
            // Teste 1: Sem aspas na matrícula (caso seja numérica)
            console.log('🔍 Teste SQL sugerido 1: WHERE associado.codigo = ' + matricula + ' AND associado.empregador = ' + empregador + ' AND conta.mes = \'' + mesAtual + '\'');
            
            // Teste 2: Com aspas na matrícula
            console.log('🔍 Teste SQL sugerido 2: WHERE associado.codigo = \'' + matricula + '\' AND associado.empregador = ' + empregador + ' AND conta.mes = \'' + mesAtual + '\'');
            
            // Teste 3: Verificar outros meses
            console.log('🔍 Sugestão: Verifique se há dados para outros meses além de ' + mesAtual);
            
            console.log('🔍 Parâmetros exatos enviados:');
            console.log('   matricula (tipo ' + typeof matricula + '):', matricula);
            console.log('   empregador (tipo ' + typeof empregador + '):', empregador);
            console.log('   mes (tipo ' + typeof mesAtual + '):', mesAtual);
          }
          
          // Processar os dados da conta conforme especificação
          if (Array.isArray(dadosConta)) {
            let totalGastosMes = 0;
            
            console.log('💰 Dados da conta recebidos:', dadosConta);
            
            // Somar todos os valores do mês corrente
            dadosConta.forEach(item => {
              if (item.valor) {
                // Limpar e converter o valor
                const valorLimpo = item.valor.toString().replace(/[^\d.,]/g, '').replace(',', '.');
                const valorNumerico = parseFloat(valorLimpo);
                
                if (!isNaN(valorNumerico) && valorNumerico > 0) {
                  totalGastosMes += valorNumerico;
                  console.log('💰 Somando valor:', valorNumerico, 'Total acumulado:', totalGastosMes);
                }
              }
            });
            
            console.log('💰 Total de gastos do mês:', totalGastosMes);
            
            // Usar o limite do associado atual OU do objeto passado como parâmetro
            const associadoAtual = associadoCompleto || associado;
            
            // Calcular saldo disponível: Limite - Gastos do Mês = Saldo
            if (associadoAtual && associadoAtual.limite) {
              const limiteLimpo = associadoAtual.limite.toString().replace(/[^\d.,]/g, '').replace(',', '.');
              const limiteNumerico = parseFloat(limiteLimpo);
              
              console.log('💰 Limite do associado:', limiteNumerico);
              console.log('💰 Total gastos do mês:', totalGastosMes);
              
              if (!isNaN(limiteNumerico)) {
                // Fórmula: Saldo = Limite - Gastos do Mês
                const saldoDisponivel = limiteNumerico - totalGastosMes;
                
                console.log('💰 Cálculo do saldo: Limite (', limiteNumerico, ') - Gastos (', totalGastosMes, ') = Saldo (', saldoDisponivel, ')');
                
                // Atualizar associado com saldo calculado
                const associadoFinal = associadoCompleto || associado;
                if (associadoFinal) {
                  const novoAssociado = { ...associadoFinal, saldo: Math.max(0, saldoDisponivel) }; // Garantir que saldo não seja negativo
                  console.log('💰 Associado atualizado com saldo calculado:', novoAssociado);
                  setAssociado(novoAssociado);
                  
                  // Toast para confirmar que o saldo foi calculado
                  toast.success(`Saldo calculado: ${saldoDisponivel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
                } else {
                  console.warn('⚠️ Nenhum associado disponível para atualizar');
                }
              } else {
                console.warn('⚠️ Limite não é um número válido:', associadoAtual.limite);
                // Em caso de erro, usar o associado com saldo 0
                const associadoFinal = associadoCompleto || associado;
                if (associadoFinal) {
                  setAssociado({ ...associadoFinal, saldo: 0 });
                }
              }
            } else {
              console.warn('⚠️ Associado ou limite não disponível para calcular saldo');
              const associadoFinal = associadoCompleto || associado;
              if (associadoFinal) {
                setAssociado({ ...associadoFinal, saldo: 0 });
              }
            }
          } else {
            console.warn('⚠️ Dados da conta não estão no formato esperado:', dadosConta);
            // Usar o associado com saldo 0
            const associadoFinal = associadoCompleto || associado;
            if (associadoFinal) {
              setAssociado({ ...associadoFinal, saldo: 0 });
            }
          }
        } catch (errorConta) {
          console.error('❌ Erro ao consultar conta:', errorConta);
          // Em caso de erro, usar o associado com saldo 0
          const associadoFinal = associadoCompleto || associado;
          if (associadoFinal) {
            setAssociado({ ...associadoFinal, saldo: 0 });
          }
        }
      }
      
      return;
    } catch (error) {
      console.error('❌ Erro geral na captura de mês corrente:', error);
      
      // Em caso de erro, usar mês local e associado com saldo 0
      const mesLocal = gerarMesCorrenteLocal();
      setMesCorrente(mesLocal);
      
      const associadoFinal = associadoCompleto || associado;
      if (associadoFinal) {
        setAssociado({ ...associadoFinal, saldo: 0 });
      }
      
      toast.error('Não foi possível obter dados completos.');
      throw error; // Re-throw para ser capturado na função chamadora
    }
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove todos os caracteres não numéricos
    let value = e.target.value.replace(/\D/g, '');
    
    // Converte para formato monetário (R$ 0,00)
    if (value) {
      const valorNumerico = parseInt(value) / 100;
      value = valorNumerico.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
    } else {
      value = '';
    }
    
    setValor(value);
  };

  const handleLerQRCode = () => {
    setShowQrReader(true);
  };

  const handleCloseQrReader = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().catch(error => {
        console.error("Erro ao parar o scanner:", error);
      });
    }
    setShowQrReader(false);
  };

  // Função para gravar venda usando XMLHttpRequest
  const gravarVendaXHR = (dadosVenda: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      console.log('💰 XHR: Gravando venda com os seguintes dados:', dadosVenda);
      const xhr = new XMLHttpRequest();
      
      xhr.timeout = 30000;
      xhr.open('POST', API_GRAVA_VENDA, true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      
      xhr.onload = function() {
        console.log('💰 XHR: Resposta recebida para gravação de venda:', {
          status: xhr.status,
          statusText: xhr.statusText,
          responseText: xhr.responseText.substring(0, 500)
        });
        
        // Log completo da resposta para depuração
        console.log('💰 XHR: Resposta completa:', xhr.responseText);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            // Tenta parsear como JSON
            const jsonResponse = JSON.parse(xhr.responseText);
            console.log('💰 XHR: Venda gravada com sucesso. Resposta JSON:', jsonResponse);
            resolve(jsonResponse);
          } catch (e) {
            console.log('💰 XHR: Erro ao parsear JSON. Resposta em texto:', xhr.responseText);
            
            // Verificar se a resposta contém texto que indica sucesso
            if (xhr.responseText.includes('situacao')) {
              try {
                // Tenta extrair informações relevantes da resposta de texto
                const situacaoMatch = xhr.responseText.match(/situacao["\s:]+(\d+)/i);
                const registroMatch = xhr.responseText.match(/registrolan["\s:]+(\w+)/i);
                
                if (situacaoMatch && situacaoMatch[1]) {
                  const resposta = {
                    situacao: parseInt(situacaoMatch[1]),
                    registrolan: registroMatch && registroMatch[1] ? registroMatch[1] : ''
                  };
                  console.log('💰 XHR: Extraiu dados da resposta de texto:', resposta);
                  resolve(resposta);
                  return;
                }
              } catch (parseError) {
                console.error('💰 XHR: Erro ao extrair dados da resposta de texto:', parseError);
              }
            }
            
            // Se não conseguir extrair informações, retorna a resposta em texto
            resolve({
              situacao: 1, // Assume sucesso
              responseText: xhr.responseText,
              message: 'Resposta não-JSON, mas com status de sucesso'
            });
          }
        } else {
          console.error('💰 XHR: Erro ao gravar venda:', xhr.status, xhr.statusText);
          reject({
            status: xhr.status,
            statusText: xhr.statusText,
            responseText: xhr.responseText
          });
        }
      };
      
      xhr.onerror = function() {
        console.error('💰 XHR: Erro de rede ao gravar venda');
        reject({
          status: xhr.status,
          statusText: xhr.statusText,
          error: 'Erro de rede'
        });
      };
      
      xhr.ontimeout = function() {
        console.error('💰 XHR: Timeout ao gravar venda');
        reject({
          error: 'Timeout',
          message: 'A requisição excedeu o tempo limite de 30 segundos'
        });
      };
      
      // Preparar dados para envio
      const params = new URLSearchParams();
      
      // Adicionar todos os parâmetros necessários baseados no código PHP fornecido
      Object.keys(dadosVenda).forEach(key => {
        params.append(key, dadosVenda[key]);
      });
      
      console.log('💰 XHR: Enviando dados para gravação:', params.toString());
      xhr.send(params.toString());
    });
  };

  // Função para recalcular saldo após lançamento seguindo a mesma lógica da especificação
  const recalcularSaldoAposLancamento = async () => {
    try {
      if (!associado || !mesCorrente) {
        console.warn('⚠️ Dados insuficientes para recalcular saldo');
        return;
      }

      console.log('💰 Recalculando saldo após lançamento...');
      
      // Consultar novamente a conta para obter dados atualizados
      const dadosContaAtualizados = await consultarContaXHR(associado.matricula, associado.empregador, mesCorrente);
      
      if (Array.isArray(dadosContaAtualizados)) {
        let totalGastosMesAtualizado = 0;
        
        // Somar todos os valores do mês (incluindo o lançamento recém feito)
        dadosContaAtualizados.forEach(item => {
          if (item.valor) {
            const valorLimpo = item.valor.toString().replace(/[^\d.,]/g, '').replace(',', '.');
            const valorNumerico = parseFloat(valorLimpo);
            
            if (!isNaN(valorNumerico) && valorNumerico > 0) {
              totalGastosMesAtualizado += valorNumerico;
            }
          }
        });
        
        console.log('💰 Total de gastos atualizado do mês:', totalGastosMesAtualizado);
        
        // Calcular novo saldo: Limite - Gastos Atualizados
        if (associado.limite) {
          const limiteLimpo = associado.limite.toString().replace(/[^\d.,]/g, '').replace(',', '.');
          const limiteNumerico = parseFloat(limiteLimpo);
        
          if (!isNaN(limiteNumerico)) {
            const novoSaldo = limiteNumerico - totalGastosMesAtualizado;
            
            console.log('💰 Recálculo do saldo: Limite (', limiteNumerico, ') - Gastos Atualizados (', totalGastosMesAtualizado, ') = Novo Saldo (', novoSaldo, ')');
            
            // Atualizar o estado com o saldo recalculado
            setAssociado(prev => {
              if (prev) {
                const associadoAtualizado = { ...prev, saldo: Math.max(0, novoSaldo) };
                console.log('💰 Saldo recalculado e atualizado:', associadoAtualizado);
                return associadoAtualizado;
              }
              return prev;
            });
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao recalcular saldo após lançamento:', error);
    }
  };

  // Modifique a função handleSubmit para usar verificarSenhaXHR
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!associado) {
      toast.error('Busque os dados do cartão primeiro');
      return;
    }
    
    if (!valor || parseFloat(valor.replace(/[^\d,]/g, '').replace(',', '.')) <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    
    if (!senha || senha.length < 6) {
      toast.error('Informe a senha do cartão (6 dígitos)');
      return;
    }
    
    // Verificar se o valor total não excede o saldo
    const valorTotal = parseFloat(valor.replace(/[^\d,]/g, '').replace(',', '.'));
    if (valorTotal > associado.saldo) {
      toast.error('O valor total não pode ser maior que o saldo disponível');
      return;
    }
    
    // Verificar se o valor da parcela não excede o saldo quando for mais de uma parcela
    if (parcelas > 1 && valorParcela > associado.saldo) {
      toast.error('O valor da parcela não pode ser maior que o saldo disponível');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('🔑 Verificando senha para associado:', {
        matricula: associado.matricula,
        empregador: associado.empregador,
        senha: '******'
      });
      
      // Usar a função de verificação de senha com XMLHttpRequest
      const resultadoSenha = await verificarSenhaXHR(
        associado.matricula, 
        associado.empregador, 
        senha
      );
      
      console.log('🔐 Dados da resposta de senha:', resultadoSenha);
        
      // Verificar diferentes propriedades possíveis para a verificação de sucesso
      const senhaCorreta = 
        (resultadoSenha && resultadoSenha.success === true) || 
        (resultadoSenha && resultadoSenha.situacao === 'certo') ||
        (resultadoSenha && resultadoSenha.status === 'success') ||
        (resultadoSenha && resultadoSenha.result === true);
        
      if (senhaCorreta) {
        try {
          toast.success('Senha validada! Gravando venda...');
          
          // Obter dados do convênio do localStorage
          const dadosConvenioString = localStorage.getItem('dadosConvenio');
          let codConvenio = '0';
          let nomeFantasia = '';
          
          if (dadosConvenioString) {
            try {
              const dadosConvenio = JSON.parse(dadosConvenioString);
              // Garantir que estamos acessando a propriedade correta
              codConvenio = dadosConvenio.cod_convenio || dadosConvenio.codConvenio || '0';
              nomeFantasia = dadosConvenio.nome_fantasia || dadosConvenio.nomeFantasia || '';
              console.log('📊 Usando código de convênio:', codConvenio);
            } catch (e) {
              console.error('❌ Erro ao processar dados do convênio:', e);
              
              // Verificar se há token de convênio e tentar extrair dados dele
              const tokenConvenio = localStorage.getItem('convenioToken');
              if (tokenConvenio) {
                try {
                  // O token está em base64, então decodificamos
                  const tokenDecodificado = JSON.parse(atob(tokenConvenio));
                  if (tokenDecodificado && tokenDecodificado.id) {
                    codConvenio = tokenDecodificado.id;
                    console.log('📊 Usando código de convênio do token:', codConvenio);
                  }
                } catch (tokenError) {
                  console.error('❌ Erro ao processar token do convênio:', tokenError);
                }
              }
            }
          } else {
            console.warn('⚠️ Dados do convênio não encontrados no localStorage');
            
            // Como último recurso, tentar obter do sessionStorage
            const sessaoConvenio = sessionStorage.getItem('convenioData');
            if (sessaoConvenio) {
              try {
                const dadosSessao = JSON.parse(sessaoConvenio);
                codConvenio = dadosSessao.cod_convenio || dadosSessao.codConvenio || '0';
                console.log('📊 Usando código de convênio da sessão:', codConvenio);
              } catch (sessaoError) {
                console.error('❌ Erro ao processar dados de sessão do convênio:', sessaoError);
              }
            }
          }
          
          // Formatar os dados para a API de gravação de venda
          const valorLimpo = valor.replace(/[R$\s.]/g, '').replace(',', '.');
          const valorParcelaLimpo = valorParcela.toString().replace(',', '.');
          
          // Validar e limitar a 2 casas decimais
          const valorNumerico = parseFloat(valorLimpo);
          if (isNaN(valorNumerico)) {
            toast.error('Valor inválido');
            setLoading(false);
            return;
          }
          
          // Arredondar para 2 casas decimais e converter de volta para string
          const valorFormatado = valorNumerico.toFixed(2);
          const valorParcelaNumerico = parseFloat(valorParcelaLimpo);
          const valorParcelaFormatado = isNaN(valorParcelaNumerico) ? '0.00' : valorParcelaNumerico.toFixed(2);
          
          console.log('💰 Valor original:', valorLimpo);
          console.log('💰 Valor formatado (2 casas decimais):', valorFormatado);
          console.log('💰 Valor parcela formatado (2 casas decimais):', valorParcelaFormatado);
          
          // Log explícito para depurar o valor final de codConvenio
          console.log('📊 VALOR FINAL DO CÓDIGO DO CONVÊNIO:', codConvenio);
          
          // Preparar dados conforme exigido pela API grava_venda_app.php
          const dadosVenda = {
            cod_convenio: codConvenio,
            matricula: associado.matricula,
            pass: senha,
            nome: associado.nome,
            cartao: cartao,
            empregador: associado.empregador,
            valor_pedido: valorFormatado, // Usar valor com exatamente 2 casas decimais
            valor_parcela: valorParcelaFormatado, // Usar valor parcela com exatamente 2 casas decimais
            mes_corrente: mesCorrente,
            primeiro_mes: mesCorrente, // Usando o mês corrente como primeiro mês
            qtde_parcelas: parcelas.toString(),
            uri_cupom: '', // Campo obrigatório
            descricao: descricao || 'Lançamento via QRCred App',
            id_associado: associado.id || null // ID do associado para integridade referencial
          };
          
          console.log('📝 Dados para gravação de venda:', dadosVenda);
          
          // Gravar a venda
          const resultadoVenda = await gravarVendaXHR(dadosVenda);
          
          console.log('✅ Venda gravada com sucesso:', resultadoVenda);
          
          // Verificar o status da resposta
          if (resultadoVenda && typeof resultadoVenda === 'object') {
            // Verificar situação como número ou string
            const situacao = resultadoVenda.situacao;
            
            if (situacao === 1 || situacao === '1') {
              // Sucesso - situacao = 1
              console.log('✅ Venda registrada com sucesso! Registro:', resultadoVenda.registrolan);
              toast.success('Pagamento realizado com sucesso!');
              
                            // Salvar dados da venda
              if (resultadoVenda.registrolan) {
                console.log('✅ Registro de lançamento:', resultadoVenda.registrolan);
                // Aqui poderia armazenar o registro para exibição ou referência futura
              }
              
              // Recalcular saldo após lançamento bem-sucedido
              await recalcularSaldoAposLancamento();
                
              // Exibir tela de confirmação
              setValorPagamento(valor);
              setShowConfirmacao(true);
            } else if (situacao === 2 || situacao === '2') {
              // Senha incorreta - situacao = 2
              console.error('❌ Senha incorreta!');
              toast.error('Senha incorreta. Verifique e tente novamente.');
              setSenha('');
            } else if (!situacao && resultadoVenda.responseText) {
              // Caso em que recebemos texto, mas assumimos sucesso
              console.log('✅ Venda possivelmente registrada (resposta em texto)');
              toast.success('Pagamento processado!');
              
              // Recalcular saldo após lançamento bem-sucedido
              await recalcularSaldoAposLancamento();
              
              setValorPagamento(valor);
              setShowConfirmacao(true);
            } else {
              // Outros erros
              console.error('❌ Erro ao processar venda:', resultadoVenda);
              toast.error('Erro ao processar venda. Tente novamente.');
            }
          } else if (typeof resultadoVenda === 'string' && resultadoVenda.trim() !== '') {
            // Resposta é string não vazia, assumimos sucesso
            console.log('✅ Resposta em formato de texto:', resultadoVenda);
            toast.success('Pagamento processado!');
            
            // Recalcular saldo após lançamento bem-sucedido
            await recalcularSaldoAposLancamento();
            
            setValorPagamento(valor);
            setShowConfirmacao(true);
          } else {
            // Resposta inválida
            console.error('❌ Resposta inválida da API:', resultadoVenda);
            toast.error('Erro ao processar venda. Resposta inválida.');
          }
        } catch (errorVenda) {
          console.error('❌ Erro ao gravar venda:', errorVenda);
          toast.error('Erro ao gravar venda. Tente novamente.');
        }
      } else {
        toast.error('Senha incorreta');
        setSenha('');
      }
    } catch (error) {
      console.error('❌ Erro ao processar pagamento:', error);
      toast.error('Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleVoltar = () => {
    router.back();
  };

  const handleVoltarParaDashboard = () => {
    router.push('/convenio/dashboard/lancamentos');
  };

  // Se estiver mostrando a tela de confirmação, renderize isso
  if (showConfirmacao) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header title="Pagamento Confirmado" />
        
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
            <div className="animate-bounce mb-6 mx-auto">
              <FaCheckCircle className="h-24 w-24 text-green-500 mx-auto" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pagamento Realizado!</h2>
            
            <p className="text-lg text-gray-600 mb-1">Valor: {valorPagamento}</p>
            {parcelas > 1 && (
              <p className="text-md text-gray-500 mb-4">
                Em {parcelas}x de {valorParcela.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </p>
            )}
            
            {associado && (
              <div className="mt-4 bg-gray-50 p-4 rounded-md mb-6">
                <p className="text-sm font-medium text-gray-500">Cliente</p>
                <p className="text-lg font-medium text-gray-900">{associado.nome}</p>
              </div>
            )}
            
            <div className="mt-6">
              <button
                type="button"
                onClick={handleVoltarParaDashboard}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Voltar para Lançamentos
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header title="Novo Lançamento" showBackButton onBackClick={handleVoltar} />
      
      {showQrReader ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg max-w-sm w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ler QR Code</h3>
            <div className="mb-4">
              <div ref={qrReaderRef} className="w-full"></div>
            </div>
            <button
              type="button"
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md"
              onClick={handleCloseQrReader}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      
      <div className="flex-1 py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Registrar Novo Pagamento</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Seção Cartão */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Dados do Cartão</h3>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-grow">
                  <label htmlFor="cartao" className="block text-sm font-medium text-gray-700 mb-1">
                    Número do Cartão
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <div className="relative flex items-stretch flex-grow">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaCreditCard className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="cartao"
                        name="cartao"
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 text-lg py-3 border-2 border-gray-400 rounded-md font-medium"
                        placeholder="Digite o cartão"
                        value={cartao}
                        onChange={(e) => setCartao(e.target.value)}
                        maxLength={10}
                        autoComplete="off"
                        data-form-type="other"
                        data-lpignore="true"
                        data-1p-ignore
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2 sm:self-end">
                  <button
                    type="button"
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center"
                    onClick={handleLerQRCode}
                  >
                    <FaQrcode className="mr-2" /> QR Code
                  </button>
                  
                  <button
                    type="button"
                    className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md"
                    onClick={buscarAssociado}
                    disabled={!cartao || loadingCartao}
                  >
                    {loadingCartao ? <FaSpinner className="animate-spin mx-auto" /> : 'Buscar'}
                  </button>
                </div>
              </div>
              
              {/* Informações do Associado */}
              {associado && (
                <div className="mt-4 bg-gray-50 p-4 rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Nome do Titular</p>
                      <p className="text-lg font-medium text-gray-900">{associado.nome}</p>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-gray-600">Saldo Disponível</p>
                      <p className="text-2xl font-bold text-green-600">
                        {associado.saldo.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Seção Pagamento */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Configuração do Pagamento</h3>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="valor" className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Total da Compra
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="valor"
                      name="valor"
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full text-lg py-3 border-2 border-gray-400 rounded-md font-medium"
                      placeholder="R$ 0,00"
                      value={valor}
                      onChange={handleValorChange}
                      disabled={!associado}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade de Parcelas
                  </label>
                  <div className="mt-1">
                    {/* Lista horizontal de parcelas com scroll */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      {Array.from({ length: maxParcelas }, (_, i) => i + 1).map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setParcelas(num)}
                          disabled={!associado}
                          className={`
                            flex-shrink-0 px-4 py-3 rounded-lg border-2 font-medium text-sm min-w-[120px] text-center transition-all duration-200
                            ${parcelas === num 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-lg transform scale-105' 
                              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                            }
                            ${!associado ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
                          `}
                        >
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-lg">{num}x</span>
                            <span className="text-xs opacity-90">
                              {num === 1 ? 'à vista' : 'parcelas'}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Informação das parcelas logo abaixo do campo */}
                  {parcelas > 1 && valorParcela > 0 && (
                    <div className="mt-2 bg-blue-50 p-3 rounded-md">
                      <p className="text-sm text-blue-700">
                        Pagamento em <strong>{parcelas}x</strong> de <strong>
                          {valorParcela.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}
                        </strong>
                      </p>
                    </div>
                  )}
                </div>
                
                <div>
                  <label htmlFor="mes-corrente" className="block text-sm font-medium text-gray-700 mb-1">
                    Mês Atual
                  </label>
                  <div className="mt-1">
                    <div className="flex items-center h-12 px-4 border border-gray-300 rounded-md bg-blue-50 min-w-0">
                      <FaCalendarAlt className="text-blue-500 mr-2 flex-shrink-0" />
                      <span className="text-lg text-blue-700 font-medium truncate">
                        {mesCorrente || 'Aguardando dados...'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição da Compra (opcional)
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="descricao"
                      name="descricao"
                      rows={2}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full text-lg py-3 border-2 border-gray-400 rounded-md font-medium"
                      placeholder="Descreva os itens ou referência da compra"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      disabled={!associado}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Seção Autorização */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Autorização da Transação</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
                    Senha do Cartão
                  </label>
                  <div className="mt-1">
                    <input
                      type="password"
                      id="senha"
                      name="senha"
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full text-lg py-3 border-2 border-gray-400 rounded-md font-medium"
                      placeholder="Digite a senha de 6 dígitos"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      maxLength={6}
                      disabled={!associado}
                      autoComplete="off"
                      data-form-type="other"
                      data-lpignore="true"
                      data-1p-ignore
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-6 flex justify-end">
              <button
                type="button"
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
                onClick={handleVoltar}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={!associado || loading || !valor || !senha}
              >
                {loading ? <FaSpinner className="animate-spin mx-auto" /> : 'Autorizar Pagamento'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}