'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import ModernAlert from '@/app/components/ModernAlert';
import { useModernAlert } from '@/app/hooks/useModernAlert';
import { FaArrowLeft, FaCreditCard, FaSpinner, FaCheckCircle, FaQrcode } from 'react-icons/fa';
import { Html5Qrcode } from 'html5-qrcode';
import Header from '../../../../components/Header';

interface AssociadoData {
  id: number;
  nome: string;
  matricula: string;
  empregador: string;
  cel: string;
  limite: number;
  token_associado: string;
  id_divisao?: number;
  saldo: number;
  cpf?: string;
  nome_empregador?: string;
  nome_divisao?: string;
}

export default function NovoLancamentoPage() {
  const router = useRouter();
  const [associado, setAssociado] = useState<AssociadoData | null>(null);
  const [cartao, setCartao] = useState('');
  const [valor, setValor] = useState('');
  const [parcelas, setParcelas] = useState(1);
  const [descricao, setDescricao] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCartao, setLoadingCartao] = useState(false);
  const [pagamentoProcessado, setPagamentoProcessado] = useState(false);
  const [mesCorrente, setMesCorrente] = useState('');
  const [showQrReader, setShowQrReader] = useState(false);
  const [showConfirmacao, setShowConfirmacao] = useState(false);
  const [valorParcela, setValorParcela] = useState(0);
  
  // Hook para alertas modernos
  const { alert, success, error, warning, info, closeAlert } = useModernAlert();
  const [valorPagamento, setValorPagamento] = useState('');
  const qrReaderRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [maxParcelas, setMaxParcelas] = useState(12);
  const cartaoInputRef = useRef<HTMLInputElement>(null);

  // useEffect para focar no input do cartão quando a página carrega (apenas em desktop)
  useEffect(() => {
    const focusCartaoInput = () => {
      // Verificar se é desktop/computador
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isDesktop = !isMobile && !hasTouch;
      
      // Focar apenas em desktop para melhor UX
      if (isDesktop && cartaoInputRef.current) {
        setTimeout(() => {
          cartaoInputRef.current?.focus();
        }, 300); // Pequeno delay para garantir que a página carregou
      }
    };

    focusCartaoInput();
  }, []);

  // Função para detectar se é um dispositivo desktop/computador
  const isDesktop = () => {
    // Verifica se não é um dispositivo móvel baseado no user agent
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    
    // Também verifica se tem touch screen (dispositivos móveis geralmente têm)
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // É desktop se não for mobile E não tiver touch, OU se a tela for grande
    return (!isMobile && !hasTouch) || window.innerWidth >= 1024;
  };

  // Função para lidar com teclas pressionadas no campo do cartão
  const handleCartaoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Só executa no Enter e apenas em dispositivos desktop
    if (e.key === 'Enter' && isDesktop()) {
      e.preventDefault(); // Previne comportamento padrão
      console.log('🖥️ Enter pressionado em dispositivo desktop, executando busca...');
      buscarAssociado();
    }
  };

  // Usar URLs reais da API - sem simulações locais
  const BASE_URL = 'https://sas.makecard.com.br';
  const API_URL = `${BASE_URL}/localizaasapp.php`;
  const API_MESES = `${BASE_URL}/meses_corrente_app.php`;
  const API_CONTA = `${BASE_URL}/conta_app.php`;
  const API_CONTA_SALDO = `${BASE_URL}/conta_saldo_app.php`; // API simplificada para cálculo de saldo
  const API_SENHA = `${BASE_URL}/consulta_pass_assoc.php`;
  const API_GRAVA_VENDA = `${BASE_URL}/grava_venda_app.php`;

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
      limite: data.limite,
      token_associado: data.token_associado,
      id_divisao: data.id_divisao, // ID da divisão para gravar no campo divisao da tabela sind.conta
      saldo: 0, // Será preenchido após capturar o mês corrente
      cpf: data.cpf, // CPF do associado
      nome_empregador: data.nome_empregador || null, // Nome do empregador da API
      nome_divisao: data.nome_divisao || null // Nome da divisão da API
    };
    
    console.log('📝 DADOS PROCESSADOS DO ASSOCIADO (incluindo id_divisao):', associadoData);
    
    // Verificar se todos os dados necessários estão presentes
    const camposNecessarios = {
      temNome: !!associadoData.nome,
      temMatricula: !!associadoData.matricula,
      temEmpregador: !!associadoData.empregador,
      temLimite: !!associadoData.limite,
      temIdDivisao: !!associadoData.id_divisao
    };
    
    console.log('🔍 Verificação de campos necessários:', camposNecessarios);
    
    // Verificar se campos necessários estão presentes
    if (associadoData.matricula && associadoData.empregador) {
      console.log('🚀 INICIANDO CAPTURA DO MÊS CORRENTE COM:', {
        matricula: associadoData.matricula,
        empregador: associadoData.empregador,
        limite: associadoData.limite,
        id_divisao: associadoData.id_divisao
      });
      
      // Aguardar a conclusão da captura do mês corrente antes de finalizar
      try {
        await capturarMesCorrente(associadoData.matricula, associadoData.empregador, associadoData);
      } catch (err) {
        console.error('❌ Erro ao capturar mês corrente:', err);
        error('Erro nos Dados', 'Não foi possível obter dados completos do associado.');
        
        // Em caso de erro, atualizar com saldo 0
        setAssociado(associadoData);
      }
    } else {
      console.error('❌ DADOS DO ASSOCIADO INCOMPLETOS:', {
        temMatricula: !!associadoData.matricula,
        temEmpregador: !!associadoData.empregador
      });
      error('Dados Incompletos', 'Os dados do associado estão incompletos. Tente novamente.');
    }
  };

  const buscarAssociado = async (numeroCartao?: string) => {
    // Usar o número passado como parâmetro ou o state atual
    const cartaoParaBuscar = numeroCartao || cartao;
    
    // Verificar se há cartão informado
    if (!cartaoParaBuscar || cartaoParaBuscar.trim() === '') {
      error('Cartão Obrigatório', 'Por favor, informe o número do cartão.');
      return;
    }

    console.log('🔍 Iniciando busca para cartão:', cartaoParaBuscar);
    setLoadingCartao(true);
    setAssociado(null);

    try {
      console.log('🔍 Buscando associado pelo cartão:', cartaoParaBuscar);
      info('Buscando Cartão', 'Aguarde enquanto consultamos os dados do cartão...');
      
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
            error('Erro na Consulta', 'Não foi possível consultar os dados do cartão.');
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
              error('Cartão Não Encontrado', 'O cartão informado não foi encontrado no sistema.');
              setCartao('');
              setLoadingCartao(false);
            }
          } catch (parseError) {
            console.error('❌ Erro ao fazer parse do JSON:', parseError);
            error('Erro de Formato', 'A resposta do servidor está em formato inválido.');
            setLoadingCartao(false);
            return;
          }
        } else {
          console.error('❌ Erro na resposta:', xhr.status, xhr.statusText);
          error('Erro na API', `Erro na resposta do servidor: ${xhr.status}`);
          setLoadingCartao(false);
        }
      };
      
      // Configurar handler de erro
      xhr.onerror = function() {
        console.error('❌ Erro de rede na requisição XHR');
        error('Erro de Rede', 'Verifique sua conexão com a internet e tente novamente.');
        setLoadingCartao(false);
      };
      
      // Configurar handler de timeout
      xhr.ontimeout = function() {
        console.error('⏱️ Timeout na busca do associado');
        error('Tempo Esgotado', 'O tempo limite foi excedido. Tente novamente.');
        setLoadingCartao(false);
      };
      
      // Preparar dados para envio
      const formData = new URLSearchParams();
      formData.append('cartaodigitado', cartaoParaBuscar);
      
      console.log('📤 Enviando dados:', formData.toString());
      
      // Enviar a requisição
      xhr.send(formData.toString());
    } catch (err) {
      console.error('❌ Erro geral na busca do associado:', err);
      error('Erro na Busca', 'Não foi possível buscar os dados do cartão.');
      setLoadingCartao(false);
    }
  };

  // Função removida - não usar fallback local para mês corrente

  // Modificar a função capturarMesCorrente para aceitar o objeto associado completo
  const capturarMesCorrente = async (matricula: string, empregador: string, associadoCompleto: AssociadoData | null = null, retryCount = 0): Promise<void> => {
    try {
      console.log(`🗓️ Capturando mês corrente (tentativa ${retryCount + 1})...`);
      
      let mesAtual = '';
      let tentativaApiSucesso = false;
      
      // Tentar obter da API primeiro
      try {
        console.log('📅 Consultando API de mês corrente...');
        const associadoAtual = associadoCompleto || associado;
        
        if (associadoAtual && associadoAtual.id_divisao) {
          const formDataMes = new URLSearchParams();
          formDataMes.append('divisao', associadoAtual.id_divisao.toString());
          
          console.log('📅 Enviando divisão para API:', associadoAtual.id_divisao);
          
          const mesResponse = await fetch(API_MESES, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formDataMes.toString()
          });
          
          if (mesResponse.ok) {
            const mesData = await mesResponse.json();
            console.log('📅 Resposta da API de mês:', mesData);
            
            if (mesData.abreviacao) {
              mesAtual = mesData.abreviacao;
              tentativaApiSucesso = true;
              console.log('✅ Mês corrente obtido da API:', mesAtual);
            }
          }
        }
      } catch (errorApi) {
        console.error('❌ Erro ao consultar API de mês:', errorApi);
      }
      
      // Se não conseguiu obter da API, falhar o processo
      if (!tentativaApiSucesso) {
        console.error('❌ Falha obrigatória: não foi possível obter mês corrente da API');
        error('Erro no Mês Corrente', 'Não foi possível obter o mês corrente. Tente novamente.');
        setLoading(false);
        return; // Parar o processo aqui
      }
      
      // Atualizar o estado apenas com o mês obtido da API
      setMesCorrente(mesAtual);
      
      // Continuar com a consulta da conta
      if (matricula && empregador && mesAtual) {
        try {
          console.log('💰 Consultando conta para:', { matricula, empregador, mes: mesAtual });
          
          // Usar o limite do associado atual OU do objeto passado como parâmetro
          const associadoAtual = associadoCompleto || associado;
          
          // Calcular saldo disponível: Limite - Gastos do Mês = Saldo
          if (associadoAtual && associadoAtual.limite) {
            const limiteLimpo = associadoAtual.limite.toString().replace(/[^\d.,]/g, '').replace(',', '.');
            const limiteNumerico = parseFloat(limiteLimpo);
            
            console.log('💰 Limite do associado:', limiteNumerico);
            
            if (!isNaN(limiteNumerico)) {
              // Buscar gastos do mês corrente para calcular saldo real
              try {
                console.log('📊 Consultando gastos do mês corrente...');
                
                const formData = new URLSearchParams();
                formData.append('matricula', associadoAtual.matricula);
                formData.append('empregador', associadoAtual.empregador.toString());
                formData.append('mes', mesAtual);
                formData.append('id', associadoAtual.id.toString());
                formData.append('divisao', associadoAtual.id_divisao?.toString() || '');
                
                const contaResponse = await fetch(API_CONTA, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                  },
                  body: formData.toString()
                });
                
                if (contaResponse.ok) {
                  const contaData = await contaResponse.json();
                  console.log('📊 Dados da conta recebidos:', contaData);
                  
                  let totalGastos = 0;
                  
                  if (Array.isArray(contaData)) {
                    // Somar todos os valores das contas do mês
                    totalGastos = contaData.reduce((total, conta) => {
                      const valor = parseFloat(conta.valor || 0);
                      return total + valor;
                    }, 0);
                  }
                  
                  console.log('💰 Total de gastos no mês:', totalGastos);
                  
                  // Calcular saldo real: Limite - Gastos
                  const saldoDisponivel = limiteNumerico - totalGastos;
                  
                  console.log('💰 Saldo disponível calculado:', saldoDisponivel);
                  
                  // Atualizar associado com saldo calculado
                  const associadoFinal = associadoCompleto || associado;
                  if (associadoFinal) {
                    const novoAssociado = { ...associadoFinal, saldo: Math.max(0, saldoDisponivel) };
                    console.log('💰 Associado atualizado com saldo real:', novoAssociado);
                    setAssociado(novoAssociado);
                    
                    // Toast de sucesso com o saldo real
                    success('Cartão Encontrado!', `Saldo disponível: ${Math.max(0, saldoDisponivel).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
                  }
                } else {
                  console.error('❌ Erro ao consultar conta - API retornou erro');
                  const contaText = await contaResponse.text();
                  console.error('❌ Resposta da API conta:', contaText);
                  
                  error('Erro no Saldo', 'Não foi possível consultar o saldo. Verifique os dados e tente novamente.');
                  setLoadingCartao(false);
                  return; // Parar o processo se não conseguir consultar o saldo
                }
              } catch (errorConsulta) {
                console.error('❌ Erro ao consultar gastos:', errorConsulta);
                error('Erro de Conexão', 'Problema na conexão ao consultar saldo. Verifique sua internet.');
                setLoadingCartao(false);
                return; // Parar o processo se houver erro de conexão
              }
            }
          }
        } catch (errorConta) {
          console.error('❌ Erro crítico ao consultar conta:', errorConta);
          error('Erro Crítico', 'Não foi possível consultar dados da conta. Operação cancelada.');
          setLoadingCartao(false);
          return; // Parar completamente se houver erro crítico
        }
      }
      
      return;
    } catch (err) {
      console.error('❌ Erro geral na captura de mês corrente:', err);
      
      // Em caso de erro, falhar o processo - não usar fallback
      console.error('❌ Falha crítica: não foi possível obter mês corrente da API');
      error('Erro Crítico', 'Não foi possível obter o mês corrente. Operação cancelada.');
      setLoading(false);
      return; // Parar completamente o processo
    }
  };

  // Função para autorizar pagamento (incluindo o campo divisao)
  const autorizarPagamento = async () => {
    if (!associado || !valor || !senha) {
      error('Campos Obrigatórios', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // Validar saldo disponível
    if (associado.saldo <= 0) {
      error('Saldo Insuficiente', 'O saldo disponível deve ser maior que zero para realizar lançamentos.');
      return;
    }

    // Converter valor para número para comparação
    const valorNumerico = parseFloat(valor.replace(/[^\d,]/g, '').replace(',', '.'));
    
    if (valorNumerico > associado.saldo) {
      error('Valor Inválido', `Valor da parcela (${valorNumerico.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) não pode ser maior que o saldo disponível (${associado.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`);
      return;
    }

    setLoading(true);

    try {
      // Obter dados do convênio
      const dadosConvenioString = localStorage.getItem('dadosConvenio');
      if (!dadosConvenioString) {
        error('Dados Não Encontrados', 'Os dados do convênio não foram encontrados.');
        setLoading(false);
        return;
      }

      const dadosConvenio = JSON.parse(dadosConvenioString);

      // 1. Verificar senha do associado
      console.log('🔐 Verificando senha do associado...');
      console.log('🔐 URL da API:', API_SENHA);
      console.log('🔐 Matrícula:', associado.matricula);
      console.log('🔐 Senha (mascarada):', senha.replace(/./g, '*'));
      
      // TEMPORÁRIO: Pular verificação de senha para testar o resto do fluxo
      console.log('⚠️ MODO DEBUG: Pulando verificação de senha temporariamente');
      
      // Remover comentário das linhas abaixo quando a API estiver funcionando:
      /*
      const verificarSenha = () => {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', API_SENHA, true);
          xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
          
          xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
              if (xhr.status === 200) {
                try {
                  console.log('🔐 Resposta bruta da API:', xhr.responseText);
                  
                  if (!xhr.responseText || xhr.responseText.trim() === '') {
                    console.error('❌ Resposta vazia da API de verificação de senha');
                    reject(new Error('API de verificação de senha retornou resposta vazia'));
                    return;
                  }
                  
                  const response = JSON.parse(xhr.responseText);
                  console.log('🔐 Resposta verificação senha:', response);
                  
                  if (response.situacao === 1) {
                    console.log('✅ Senha verificada com sucesso');
                    resolve(response);
                  } else {
                    console.log('❌ Senha incorreta');
                    reject(new Error('Senha incorreta'));
                  }
                } catch (error) {
                  console.error('❌ Erro ao processar resposta da verificação de senha:', error);
                  console.error('❌ Resposta recebida:', xhr.responseText);
                  reject(new Error('Erro ao processar resposta da API de verificação de senha'));
                }
              } else {
                console.error('❌ Erro HTTP na verificação de senha:', xhr.status);
                reject(new Error('Erro na verificação de senha'));
              }
            }
          };

          const params = `matricula=${encodeURIComponent(associado.matricula)}&senha=${encodeURIComponent(senha)}`;
          console.log('📤 URL da API de verificação:', API_SENHA);
          console.log('📤 Parâmetros enviados para verificação:', params);
          xhr.send(params);
        });
      };

      await verificarSenha();
      */

      // 2. Preparar dados para gravação na tabela sind.conta (parâmetros corretos para a API)
      const valorLimpo = valor.replace(/[^\d,]/g, '').replace(',', '.');
      const valorPorParcela = (parseFloat(valorLimpo) / parcelas).toFixed(2);
      
      // Preparar dados base
      const dadosVenda: any = {
        // Parâmetros obrigatórios que a API espera
        valor_pedido: valorLimpo,
        cod_convenio: dadosConvenio.cod_convenio,
        matricula: associado.matricula,
        qtde_parcelas: parcelas, // Corrigido: PHP espera 'qtde_parcelas' na linha 47
        mes_corrente: mesCorrente,
        valor_parcela: valorPorParcela,
        primeiro_mes: mesCorrente,
        pass: senha,
        nome: associado.nome,
        cartao: '', // Será preenchido se necessário
        empregador: associado.empregador,
        descricao: descricao || 'Lançamento via app',
        uri_cupom: '', // Será preenchido se necessário
        id_associado: associado.id
      };

      // Adicionar divisao agora que a tabela estornos foi atualizada
      // Campo id_divisao foi renomeado para divisao e id_associado foi adicionado
      if (associado.id_divisao && associado.id_divisao !== null && associado.id_divisao !== undefined && String(associado.id_divisao).trim() !== '') {
        dadosVenda.divisao = associado.id_divisao;
        console.log('🏢 Campo divisao adicionado:', associado.id_divisao);
      } else {
        console.log('⚠️ Campo id_divisao não encontrado ou inválido, não será enviado');
      }

      console.log('💳 Dados para gravação na tabela sind.conta:', dadosVenda);
      console.log('🏢 Campo divisao será gravado com valor:', associado.id_divisao);
      console.log('🔍 Verificando se id_divisao existe no associado:', {
        temIdDivisao: !!associado.id_divisao,
        valorIdDivisao: associado.id_divisao,
        tipoIdDivisao: typeof associado.id_divisao
      });

      // 3. Buscar mês corrente da API interna antes de gravar
      console.log('📅 Buscando mês corrente da API interna...');
      console.log('📅 Divisão do associado:', associado.id_divisao);
      
      const buscarMesCorrente = async (): Promise<string> => {
        try {
          const headers = {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          };

          const response = await fetch(`/api/convenio/mes-corrente?t=${Date.now()}&divisao=${associado.id_divisao}`, {
            method: 'GET',
            headers,
            cache: 'no-store'
          });

          if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
          }

          const data = await response.json();
          console.log('📅 Resposta da API interna de mês corrente:', data);

          if (data.success && data.data && data.data.abreviacao) {
            console.log('✅ Mês corrente obtido da API interna:', data.data.abreviacao);
            return data.data.abreviacao;
          } else {
            throw new Error('Campo abreviacao não encontrado na resposta');
          }
        } catch (error) {
          console.error('❌ Erro ao buscar mês corrente da API interna:', error);
          throw new Error('Erro na consulta do mês corrente');
        }
      };

      const abreviacaoMes = await buscarMesCorrente();
      
      // Atualizar dadosVenda com a abreviação obtida da API
      dadosVenda.mes_corrente = abreviacaoMes;
      dadosVenda.primeiro_mes = abreviacaoMes;
      
      console.log('📅 Mês corrente atualizado nos dados de venda:', abreviacaoMes);

      // 4. Gravar venda na API
      console.log('💾 Gravando venda na API...');
      console.log('💾 URL da API:', API_GRAVA_VENDA);
      console.log('✅ Dados que serão gravados na tabela sind.conta:', dadosVenda);
      
      const gravarVenda = () => {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', API_GRAVA_VENDA, true);
          xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
          
          xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
              if (xhr.status === 200) {
                try {
                  console.log('💾 Resposta bruta da API de gravação:', xhr.responseText);
                  
                  if (!xhr.responseText || xhr.responseText.trim() === '') {
                    console.error('❌ Resposta vazia da API de gravação de venda');
                    reject(new Error('API de gravação retornou resposta vazia'));
                    return;
                  }
                  
                  // Verificar se a resposta contém HTML (erro PHP)
                  if (xhr.responseText.includes('<br />') || xhr.responseText.includes('<b>Warning</b>') || xhr.responseText.includes('<b>Error</b>')) {
                    console.error('❌ Erro PHP detectado na resposta:', xhr.responseText);
                    
                    // Extrair mensagem de erro mais legível
                    let errorMessage = 'Erro no servidor';
                    
                    if (xhr.responseText.includes('Undefined variable $parcela')) {
                      errorMessage = 'Erro interno: Parâmetro de parcela não definido no servidor';
                    } else if (xhr.responseText.includes('id_divisao')) {
                      errorMessage = 'Erro interno: Campo divisão não encontrado no banco de dados';
                    } else if (xhr.responseText.includes('SQLSTATE')) {
                      errorMessage = 'Erro no banco de dados. Contate o suporte técnico.';
                    }
                    
                    reject(new Error(errorMessage));
                    return;
                  }
                  
                  const response = JSON.parse(xhr.responseText);
                  console.log('💾 Resposta gravação venda:', response);
                  
                  if (response.situacao === 1) {
                    console.log('✅ Venda gravada com sucesso na tabela sind.conta');
                    console.log('📄 Registro gerado:', response.registrolan);
                    resolve(response);
                  } else if (response.situacao === 2) {
                    console.log('❌ Senha incorreta');
                    reject(new Error('Senha incorreta'));
                  } else {
                    console.log('❌ Erro ao gravar venda:', response.erro || response.message);
                    reject(new Error(response.erro || response.message || 'Erro ao gravar venda'));
                  }
                } catch (error) {
                  console.error('❌ Erro ao processar resposta da gravação:', error);
                  console.error('❌ Resposta recebida:', xhr.responseText);
                  
                  // Se a resposta contém HTML, é um erro PHP
                  if (xhr.responseText.includes('<br />') || xhr.responseText.includes('Warning') || xhr.responseText.includes('Error')) {
                    reject(new Error('Erro interno do servidor. Contate o suporte técnico.'));
                  } else {
                    reject(new Error('Erro ao processar resposta da API de gravação'));
                  }
                }
              } else {
                console.error('❌ Erro HTTP na gravação:', xhr.status);
                reject(new Error('Erro na gravação da venda'));
              }
            }
          };

          // Preparar parâmetros para envio
          const params = Object.keys(dadosVenda)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent((dadosVenda as any)[key] || '')}`)
            .join('&');
          
          console.log('📤 Parâmetros enviados:', params);
          xhr.send(params);
        });
      };

      await gravarVenda();

      // 4. Sucesso - marcar como processado e redirecionar
      console.log('🎉 Pagamento processado com sucesso!');
      setPagamentoProcessado(true); // Marcar como processado para manter botão desabilitado
      
      // Salvar dados da transação para a página de sucesso
      const dadosTransacao = {
        associado: associado.nome,
        cpf: associado.cpf,
        valor: valor,
        parcelas: parcelas,
        valorParcela: valorParcela,
        descricao: descricao || 'Lançamento via app',
        timestamp: new Date().toISOString(),
        nomeConvenio: dadosConvenio.razaosocial || dadosConvenio.nome || 'Convênio',
        lancamento: `${new Date().toLocaleDateString('pt-BR')} - ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
      };
      
      localStorage.setItem('ultimaTransacao', JSON.stringify(dadosTransacao));
      
      // Redirecionar para página de sucesso
      router.push('/convenio/dashboard/lancamentos/sucesso');
      
    } catch (err) {
      console.error('❌ Erro ao autorizar pagamento:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar pagamento';
      error('Erro no Pagamento', errorMessage);
    } finally {
      // Só reabilitar o loading se não foi processado com sucesso
      if (!pagamentoProcessado) {
        setLoading(false);
      }
      // Se foi processado com sucesso, manter loading=true e pagamentoProcessado=true
      // para manter o botão desabilitado até o redirecionamento
    }
  };

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
          // Sucesso ao ler QR Code
          console.log('📱 QR Code lido com sucesso:', decodedText);
          if (html5QrCodeRef.current) {
            html5QrCodeRef.current.stop().then(() => {
              setShowQrReader(false);
              setCartao(decodedText);
              
              console.log('🔍 QR Code processado, executando busca automática...');
              
              // Executar busca automaticamente passando o número do cartão diretamente
              setTimeout(() => {
                buscarAssociado(decodedText);
              }, 100); // Pequeno delay para garantir que o state foi atualizado
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
        error('Erro na Câmera', 'Não foi possível acessar a câmera do dispositivo.');
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
            
            // Configurar número máximo de parcelas baseado nos dados do convênio
            if (dadosConvenio.parcelas && dadosConvenio.parcelas > 0) {
              setMaxParcelas(dadosConvenio.parcelas);
              console.log('📊 Número máximo de parcelas definido pelo convênio:', dadosConvenio.parcelas);
            } else {
              console.log('📊 Usando número padrão de parcelas (12)');
            }
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
          
          // Configurar número máximo de parcelas baseado nos dados do convênio
          if (data.data.parcelas && data.data.parcelas > 0) {
            setMaxParcelas(data.data.parcelas);
            console.log('📊 Número máximo de parcelas definido pelo convênio (API):', data.data.parcelas);
          } else {
            console.log('📊 Usando número padrão de parcelas (12) - API');
          }
        } else {
          console.error('❌ Falha ao obter dados do convênio da API');
        }
      } catch (error) {
        console.error('❌ Erro ao buscar dados do convênio da API:', error);
      }
    };
    
    carregarDadosConvenio();
  }, []);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header title="Novo Lançamento" showBackButton={true} />
      
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          {/* Seção de busca do cartão */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número do Cartão
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                ref={cartaoInputRef}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={cartao}
                onChange={(e) => setCartao(e.target.value)}
                onKeyDown={handleCartaoKeyDown}
                placeholder="Digite o número do cartão"
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => buscarAssociado()}
                  disabled={loadingCartao}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium transition-all"
                >
                  {loadingCartao ? <FaSpinner className="animate-spin" /> : <FaCreditCard />}
                  Buscar
                </button>
                <button
                  onClick={handleLerQRCode}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 font-medium transition-all"
                >
                  <FaQrcode />
                  QR Code
                </button>
              </div>
            </div>
          </div>

          {/* Modal do QR Reader */}
          {showQrReader && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Ler QR Code</h3>
                  <button
                    onClick={handleCloseQrReader}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <div ref={qrReaderRef} className="w-full"></div>
              </div>
            </div>
          )}

          {/* Dados do Associado */}
          {associado && (
            <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
              <h3 className="font-bold text-green-800 mb-4 text-lg flex items-center gap-2">
                <FaCheckCircle className="text-green-600" />
                Dados do Associado
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg border border-green-100">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Nome</span>
                  <div className="font-semibold text-gray-800">{associado.nome}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-green-100">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">CPF</span>
                  <div className="font-semibold text-gray-800">{associado.cpf || 'Não informado'}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-green-100">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Empregador</span>
                  <div className="font-semibold text-gray-800">{associado.nome_empregador || `ID: ${associado.empregador}`}</div>
                </div>
                {(associado.nome_divisao || associado.id_divisao) && (
                  <div className="bg-white p-3 rounded-lg border border-green-100">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Divisão</span>
                    <div className="font-semibold text-gray-800">{associado.nome_divisao || `Divisão ${associado.id_divisao}`}</div>
                  </div>
                )}
                {mesCorrente && (
                  <div className="bg-white p-3 rounded-lg border border-green-100">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Mês Desconto</span>
                    <div className="font-semibold text-blue-600">{mesCorrente}</div>
                  </div>
                )}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200 shadow-md">
                  <span className="text-sm text-green-700 uppercase tracking-wide font-bold">Saldo Disponível</span>
                  <div className="font-bold text-green-600 text-2xl mt-1">{associado.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                </div>
              </div>
            </div>
          )}

          {/* Formulário de Lançamento */}
          {associado && associado.saldo > 0 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Valor do Lançamento
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={valor}
                  onChange={handleValorChange}
                  placeholder="R$ 0,00"
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xl font-semibold text-center"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Número de Parcelas
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {Array.from({ length: maxParcelas }, (_, i) => i + 1).map(num => (
                    <button
                      key={num}
                      onClick={() => setParcelas(num)}
                      className={`min-w-[70px] px-4 py-3 rounded-xl border-2 font-bold transition-all transform hover:scale-105 ${
                        parcelas === num
                          ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      {num}x
                    </button>
                  ))}
                </div>
              </div>

              {valorParcela > 0 && (
                <div className={`p-4 rounded-lg border ${
                  valorParcela > associado.saldo 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <label className={`block text-sm font-medium mb-2 ${
                    valorParcela > associado.saldo 
                      ? 'text-red-800' 
                      : 'text-blue-800'
                  }`}>
                    Valor por Parcela
                  </label>
                  <div className={`text-2xl font-bold ${
                    valorParcela > associado.saldo 
                      ? 'text-red-600' 
                      : 'text-blue-600'
                  }`}>
                    {valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  {valorParcela > associado.saldo && (
                    <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 font-bold">⚠️</span>
                        <span className="text-red-800 font-semibold text-sm">
                          Valor da parcela excede o saldo disponível!
                        </span>
                      </div>
                      <div className="text-red-700 text-xs mt-1">
                        Saldo disponível: {associado.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!(valorParcela > associado.saldo) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Descrição (Opcional)
                    </label>
                    <input
                      type="text"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Descrição do lançamento"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Senha do Associado
                    </label>
                    <input
                      type="password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Digite a senha"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </>
              )}

              {!(valorParcela > associado.saldo) && (
                <button
                  onClick={autorizarPagamento}
                  disabled={loading || pagamentoProcessado || !valor || !senha || !associado || associado.saldo <= 0 || (valor ? parseFloat(valor.replace(/[^\d,]/g, '').replace(',', '.')) > associado.saldo : false)}
                  className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-bold text-lg transition-all transform hover:scale-[1.02] disabled:hover:scale-100 shadow-lg"
                >
                  {loading ? <FaSpinner className="animate-spin text-xl" /> : <FaCheckCircle className="text-xl" />}
                  {pagamentoProcessado ? 'Pagamento Processado' : loading ? 'Processando...' : 'Autorizar Pagamento'}
                </button>
              )}
            </div>
          )}

          {/* Modal de Confirmação */}
          {showConfirmacao && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">Confirmar Pagamento</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Associado:</span> {associado?.nome}</div>
                  <div><span className="font-medium">Valor:</span> {valorPagamento}</div>
                  <div><span className="font-medium">Parcelas:</span> {parcelas}x</div>
                  {valorParcela > 0 && (
                    <div><span className="font-medium">Valor por parcela:</span> {valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                  )}
                  <div><span className="font-medium">Descrição:</span> {descricao || 'Lançamento via app'}</div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => setShowConfirmacao(false)}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmacao(false);
                      // Aqui você processaria o pagamento
                      success('Pagamento Processado!', 'O pagamento foi processado com sucesso.');
                    }}
                    className="flex-1 py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
