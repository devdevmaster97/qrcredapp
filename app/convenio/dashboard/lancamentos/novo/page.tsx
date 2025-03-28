'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FaSpinner, FaQrcode, FaArrowLeft, FaCreditCard } from 'react-icons/fa';
import Header from '@/app/components/Header';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

// Importar o QR Reader de forma dinâmica para evitar problemas de SSR
// @ts-ignore - Ignorando erros de tipo para o pacote react-qr-reader que é antigo
const QrReader = dynamic(() => import('react-qr-reader'), { ssr: false });

interface AssociadoData {
  nome: string;
  matricula: string;
  empregador: string;
  saldo: number;
  token_associado?: string;
  cel?: string;
  limite?: string;
}

// Definindo a interface para as props do QrReader
interface QrReaderProps {
  delay?: number;
  onError: (err: any) => void;
  onScan: (data: string | null) => void;
  style?: React.CSSProperties;
  facingMode?: string;
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
  
  // API Host
  const HOST = process.env.NEXT_PUBLIC_API_HOST || 'https://api.qrcred.com.br/';

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

  const buscarAssociado = async () => {
    if (!cartao || cartao.length < 10) {
      toast.error('Número de cartão inválido');
      return;
    }

    setLoadingCartao(true);
    setAssociado(null);

    try {
      // Chamada para API localizaasapp.php
      const response = await fetch(`${HOST}localizaasapp.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          cartaodigitado: cartao
        })
      });
      
      const data = await response.json();
      
      if (data && data.nome && data.nome !== 'login incorreto') {
        const mockData: AssociadoData = {
          nome: data.nome,
          matricula: data.matricula,
          empregador: data.empregador,
          cel: data.cel,
          limite: data.limite,
          token_associado: data.token_associado,
          saldo: 0 // Será preenchido após capturar o mês corrente
        };
        setAssociado(mockData);
        capturarMesCorrente(data.matricula, data.empregador);
      } else {
        toast.error('Cartão não encontrado');
        setCartao('');
      }
    } catch (error) {
      toast.error('Erro ao buscar dados do cartão');
      console.error('Erro ao buscar associado:', error);
    } finally {
      setLoadingCartao(false);
    }
  };

  const capturarMesCorrente = async (matricula: string, empregador: string) => {
    try {
      // Primeiro, busca o mês corrente
      const responseMes = await fetch(`${HOST}meses_corrente_app.php`);
      const dataMes = await responseMes.json();
      
      if (dataMes && dataMes.length > 0) {
        const mesAtual = dataMes[0].abreviacao;
        setMesCorrente(mesAtual);
        
        // Depois, calcula o saldo com base no mês corrente
        const responseConta = await fetch(`${HOST}conta_app.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            matricula: matricula,
            empregador: empregador,
            mes: mesAtual
          })
        });
        
        const dataConta = await responseConta.json();
        
        if (dataConta) {
          // Calcula o total
          let total = 0;
          for(let i = 0; i < dataConta.length; i++) {
            total += parseFloat(dataConta[i].valor);
          }
          
          // Calcula o saldo (limite - total)
          if (associado && associado.limite) {
            const limite = parseFloat(associado.limite);
            const saldo = limite - total;
            
            // Atualiza o associado com o saldo
            setAssociado(prev => {
              if (prev) {
                return { ...prev, saldo: saldo };
              }
              return prev;
            });
          }
        }
      }
    } catch (error) {
      console.error('Erro ao capturar mês corrente:', error);
      toast.error('Erro ao calcular saldo disponível');
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

  const handleQrScan = (data: string | null) => {
    if (data) {
      setShowQrReader(false);
      setCartao(data);
      buscarAssociado();
    }
  };

  const handleQrError = (err: any) => {
    console.error(err);
    toast.error('Erro ao ler QR Code. Tente novamente.');
    setShowQrReader(false);
  };

  const handleCloseQrReader = () => {
    setShowQrReader(false);
  };

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
      // Verificar senha do associado
      const responseSenha = await fetch(`${HOST}consulta_pass_assoc.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          pass: senha,
          matricula: associado.matricula,
          empregador: associado.empregador
        })
      });
      
      const dataSenha = await responseSenha.json();
      
      if (dataSenha && dataSenha.situacao === 'certo') {
        // Processar o pagamento
        // Aqui seria implementada a API de pagamento
        
        // Simulação de envio para API
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Sucesso
        toast.success('Pagamento autorizado com sucesso!');
        router.push('/convenio/dashboard/lancamentos');
      } else {
        toast.error('Senha incorreta');
        setSenha('');
      }
    } catch (error) {
      toast.error('Erro ao processar pagamento');
      console.error('Erro ao processar pagamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVoltar = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header title="Novo Lançamento" showBackButton onBackClick={handleVoltar} />
      
      {showQrReader ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg max-w-sm w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ler QR Code</h3>
            <div className="mb-4">
              {/* @ts-ignore - O componente ReactQrReader tem tipos incompatíveis */}
              <QrReader
                delay={300}
                onError={handleQrError}
                onScan={handleQrScan}
                style={{ width: '100%' }}
                facingMode="environment"
              />
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
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                        placeholder="Digite o número do cartão"
                        value={cartao}
                        onChange={(e) => setCartao(e.target.value)}
                        maxLength={10}
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
                      <p className="text-sm font-medium text-gray-500">Saldo Disponível</p>
                      <p className="text-lg font-medium text-green-600">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="valor" className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Total da Compra
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="valor"
                      name="valor"
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="R$ 0,00"
                      value={valor}
                      onChange={handleValorChange}
                      disabled={!associado}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="parcelas" className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade de Parcelas
                  </label>
                  <div className="mt-1">
                    <select
                      id="parcelas"
                      name="parcelas"
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      value={parcelas}
                      onChange={(e) => setParcelas(Number(e.target.value))}
                      disabled={!associado}
                    >
                      {Array.from({ length: maxParcelas }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num}>
                          {num}x {num > 1 ? 'parcelas' : 'à vista'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {parcelas > 1 && valorParcela > 0 && (
                  <div className="col-span-2 bg-blue-50 p-3 rounded-md">
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
                
                <div className="col-span-2">
                  <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição da Compra (opcional)
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="descricao"
                      name="descricao"
                      rows={2}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Digite a senha de 6 dígitos"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      maxLength={6}
                      disabled={!associado}
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