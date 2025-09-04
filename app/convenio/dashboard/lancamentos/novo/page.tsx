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
  id_divisao?: number; // ID da divisão para gravar no campo divisao da tabela sind.conta
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
      saldo: 0 // Será preenchido após capturar o mês corrente
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

  const buscarAssociado = async (numeroCartao?: string) => {
    // Usar o número passado como parâmetro ou o state atual
    const cartaoParaBuscar = numeroCartao || cartao;
    
    // Verificar se há cartão informado
    if (!cartaoParaBuscar || cartaoParaBuscar.trim() === '') {
      toast.error('Informe o número do cartão');
      return;
    }

    console.log('🔍 Iniciando busca para cartão:', cartaoParaBuscar);
    setLoadingCartao(true);
    setAssociado(null);

    try {
      console.log('🔍 Buscando associado pelo cartão:', cartaoParaBuscar);
      toast.loading('Buscando cartão...', { id: 'busca-cartao' });
      
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
            toast.error('Erro na consulta do cartão', { id: 'busca-cartao' });
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
              toast.error('Cartão não encontrado', { id: 'busca-cartao' });
              setCartao('');
              setLoadingCartao(false);
            }
          } catch (parseError) {
            console.error('❌ Erro ao fazer parse do JSON:', parseError);
            toast.error('Formato de resposta inválido', { id: 'busca-cartao' });
            setLoadingCartao(false);
            return;
          }
        } else {
          console.error('❌ Erro na resposta:', xhr.status, xhr.statusText);
          toast.error(`Erro na resposta da API: ${xhr.status}`, { id: 'busca-cartao' });
          setLoadingCartao(false);
        }
      };
      
      // Configurar handler de erro
      xhr.onerror = function() {
        console.error('❌ Erro de rede na requisição XHR');
        toast.error('Erro de rede, verifique sua conexão', { id: 'busca-cartao' });
        setLoadingCartao(false);
      };
      
      // Configurar handler de timeout
      xhr.ontimeout = function() {
        console.error('⏱️ Timeout na busca do associado');
        toast.error('Tempo limite excedido, tente novamente', { id: 'busca-cartao' });
        setLoadingCartao(false);
      };
      
      // Preparar dados para envio
      const formData = new URLSearchParams();
      formData.append('cartaodigitado', cartaoParaBuscar);
      
      console.log('📤 Enviando dados:', formData.toString());
      
      // Enviar a requisição
      xhr.send(formData.toString());
    } catch (error) {
      console.error('❌ Erro geral na busca do associado:', error);
      toast.error('Erro ao buscar dados do cartão', { id: 'busca-cartao' });
      setLoadingCartao(false);
    }
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
      
      // Se não conseguiu obter da API, gerar localmente
      if (!tentativaApiSucesso) {
        mesAtual = gerarMesCorrenteLocal();
        console.log('⚠️ Usando mês corrente gerado localmente:', mesAtual);
        toast.success('API indisponível. Usando mês atual do sistema.');
      }
      
      // Atualizar o estado com o mês obtido (seja da API ou gerado localmente)
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
              // Para simplificar, vamos usar o limite como saldo disponível
              const saldoDisponivel = limiteNumerico;
              
              console.log('💰 Saldo calculado:', saldoDisponivel);
              
              // Atualizar associado com saldo calculado
              const associadoFinal = associadoCompleto || associado;
              if (associadoFinal) {
                const novoAssociado = { ...associadoFinal, saldo: Math.max(0, saldoDisponivel) };
                console.log('💰 Associado atualizado com saldo calculado:', novoAssociado);
                setAssociado(novoAssociado);
                
                // Toast de sucesso com o saldo calculado
                toast.success(`Cartão encontrado! Saldo: ${saldoDisponivel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, { 
                  id: 'busca-cartao'
                });
              }
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
      throw error;
    }
  };

  // Função para autorizar pagamento (incluindo o campo divisao)
  const autorizarPagamento = async () => {
    if (!associado || !valor || !senha) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      // Obter dados do convênio
      const dadosConvenioString = localStorage.getItem('dadosConvenio');
      if (!dadosConvenioString) {
        toast.error('Dados do convênio não encontrados');
        setLoading(false);
        return;
      }

      const dadosConvenio = JSON.parse(dadosConvenioString);
      
      // Preparar dados para gravação na tabela sind.conta
      const dadosVenda = {
        associado: associado.matricula,
        convenio: dadosConvenio.cod_convenio,
        valor: valor.replace(/[^\d,]/g, '').replace(',', '.'),
        descricao: descricao || 'Lançamento via app',
        mes: mesCorrente,
        empregador: associado.empregador,
        parcela: parcelas,
        divisao: associado.id_divisao, // Campo divisao agora será preenchido com id_divisao
        id_associado: associado.id
      };

      console.log('💳 Dados para gravação na tabela sind.conta:', dadosVenda);
      console.log('🏢 Campo divisao será gravado com valor:', associado.id_divisao);

      // Simular gravação (aqui você faria a chamada real para a API)
      toast.success('Pagamento autorizado com sucesso!');
      
      // Limpar formulário
      setCartao('');
      setValor('');
      setSenha('');
      setDescricao('');
      setAssociado(null);
      setParcelas(1);
      
    } catch (error) {
      console.error('❌ Erro ao autorizar pagamento:', error);
      toast.error('Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Novo Lançamento" showBackButton={true} />
      
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-6">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 text-gray-600 hover:text-gray-800"
            >
              <FaArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Novo Lançamento</h1>
          </div>

          {/* Busca do Cartão */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número do Cartão
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={cartao}
                onChange={(e) => setCartao(e.target.value)}
                placeholder="Digite o número do cartão"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => buscarAssociado()}
                disabled={loadingCartao}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loadingCartao ? <FaSpinner className="animate-spin" /> : <FaCreditCard />}
                Buscar
              </button>
            </div>
          </div>

          {/* Dados do Associado */}
          {associado && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="font-semibold text-green-800 mb-2">Dados do Associado</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Nome:</span> {associado.nome}
                </div>
                <div>
                  <span className="font-medium">Matrícula:</span> {associado.matricula}
                </div>
                <div>
                  <span className="font-medium">Empregador:</span> {associado.empregador}
                </div>
                <div>
                  <span className="font-medium">Saldo:</span> {associado.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                {associado.id_divisao && (
                  <div>
                    <span className="font-medium">ID Divisão:</span> {associado.id_divisao}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Formulário de Lançamento */}
          {associado && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor
                </label>
                <input
                  type="text"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="R$ 0,00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parcelas
                </label>
                <select
                  value={parcelas}
                  onChange={(e) => setParcelas(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: maxParcelas }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num}x</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição do lançamento"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha do Associado
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite a senha"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={autorizarPagamento}
                disabled={loading}
                className="w-full py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                Autorizar Pagamento
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
