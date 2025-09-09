'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaCheckCircle, FaHome, FaPlus, FaReceipt, FaPrint, FaShare, FaTimes } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import Header from '../../../../components/Header';

interface DadosTransacao {
  associado: string;
  cpf: string;
  valor: string;
  parcelas: number;
  valorParcela: number;
  descricao: string;
  timestamp: string;
  nomeConvenio?: string;
  lancamento?: string;
}

export default function SucessoPage() {
  const router = useRouter();
  const [dadosTransacao, setDadosTransacao] = useState<DadosTransacao | null>(null);
  const [showComprovanteModal, setShowComprovanteModal] = useState(false);

  // Função para detectar se é dispositivo móvel ou computador
  const detectarDispositivo = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // É mobile se detectar mobile no user agent OU se tiver touch e tela pequena
    return (isMobile || (hasTouch && window.innerWidth < 1024)) ? 'celular' : 'computador';
  };

  // Função para obter descrição baseada no dispositivo
  const obterDescricaoDispositivo = () => {
    const dispositivo = detectarDispositivo();
    return dispositivo === 'celular' ? 'Lançamento via celular' : 'Lançamento via computador';
  };

  useEffect(() => {
    // Recuperar dados da transação do localStorage
    const dadosString = localStorage.getItem('ultimaTransacao');
    if (dadosString) {
      try {
        const dados = JSON.parse(dadosString);
        setDadosTransacao(dados);
        // Limpar dados após carregar para evitar reutilização
        localStorage.removeItem('ultimaTransacao');
      } catch (error) {
        console.error('Erro ao carregar dados da transação:', error);
        // Se não conseguir carregar, redirecionar de volta
        router.push('/convenio/dashboard/lancamentos');
      }
    } else {
      // Se não há dados, redirecionar de volta
      router.push('/convenio/dashboard/lancamentos');
    }
  }, [router]);

  const formatarData = (timestamp: string) => {
    const data = new Date(timestamp);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!dadosTransacao) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="bg-gradient-to-br from-green-50 to-emerald-100 text-white p-4 shadow-md">
        <div className="container mx-auto flex items-center">
          <h1 className="text-xl font-bold"></h1>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Ícone de Sucesso Animado */}
        <div className="text-center mb-8" style={{ paddingTop: '30px' }}>
          <div className="relative inline-block mb-6">
            {/* Círculo animado de fundo */}
            <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center animate-bounce shadow-2xl">
              <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center animate-pulse">
                <FaCheckCircle className="text-white text-5xl animate-ping" />
              </div>
            </div>
            {/* Efeito de ondas */}
            <div className="absolute inset-0 w-32 h-32 bg-green-400 rounded-full animate-ping opacity-30"></div>
            <div className="absolute inset-0 w-32 h-32 bg-green-300 rounded-full animate-ping opacity-20" style={{animationDelay: '0.5s'}}></div>
          </div>
          <h1 className="text-3xl font-bold text-green-800 mb-2">
            Transação Efetuada com Sucesso!
          </h1>
        </div>

        {/* Detalhes da Transação */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-green-200 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FaReceipt className="text-green-600" />
            Detalhes da Transação
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className="text-xs text-gray-500 uppercase tracking-wide block">Associado</span>
                <div className="font-semibold text-gray-800">{dadosTransacao.associado}</div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className="text-xs text-gray-500 uppercase tracking-wide block">CPF</span>
                <div className="font-semibold text-gray-800">{dadosTransacao.cpf || 'Não informado'}</div>
              </div>
            </div>

            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <span className="text-xs text-green-600 uppercase tracking-wide block">Valor Total</span>
                  <div className="text-2xl font-bold text-green-800">{dadosTransacao.valor}</div>
                </div>
                
                <div>
                  <span className="text-xs text-green-600 uppercase tracking-wide block">Parcelas</span>
                  <div className="text-2xl font-bold text-green-800">{dadosTransacao.parcelas}x</div>
                </div>
                
                {dadosTransacao.valorParcela > 0 && (
                  <div>
                    <span className="text-xs text-green-600 uppercase tracking-wide block">Valor por Parcela</span>
                    <div className="text-2xl font-bold text-green-800">
                      {dadosTransacao.valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {dadosTransacao.descricao && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className="text-xs text-gray-500 uppercase tracking-wide block">Descrição</span>
                <div className="font-semibold text-gray-800">{dadosTransacao.descricao}</div>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <span className="text-xs text-blue-600 uppercase tracking-wide block">Data e Hora</span>
              <div className="font-semibold text-blue-800">{formatarData(dadosTransacao.timestamp)}</div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="space-y-4">
          <button
            onClick={() => router.push('/convenio/dashboard/lancamentos/novo')}
            className="w-full py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center gap-3 font-bold text-lg transition-all transform hover:scale-[1.02] shadow-lg"
          >
            <FaPlus className="text-xl" />
            Novo Lançamento
          </button>
          
          <button
            onClick={() => router.push('/convenio/dashboard')}
            className="w-full py-4 bg-gray-600 text-white rounded-xl hover:bg-gray-700 flex items-center justify-center gap-3 font-bold text-lg transition-all transform hover:scale-[1.02] shadow-lg"
          >
            <FaHome className="text-xl" />
            Voltar à Página Principal
          </button>
          
          <button
            onClick={() => setShowComprovanteModal(true)}
            className="w-full py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center justify-center gap-3 font-bold text-lg transition-all transform hover:scale-[1.02] shadow-lg"
          >
            <FaPrint className="text-xl" />
            Imprimir Comprovante
          </button>
        </div>

      </div>
      
      {/* Modal do Comprovante */}
      {showComprovanteModal && dadosTransacao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header do Modal */}
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Comprovante Digital</h3>
              <button
                onClick={() => setShowComprovanteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo do Comprovante */}
            <div id="comprovante-content" className="p-6 bg-white">
              {/* Logo */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-3 bg-blue-600 rounded-full flex items-center justify-center">
                  <Image
                    src="/icons/icon-192x192.png"
                    alt="Logo"
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                </div>
                <h2 className="text-lg font-bold text-gray-900">SASCRED - SISTEMA DE CRÉDITO</h2>
                <p className="text-sm text-gray-600">Comprovante de Transação</p>
              </div>

              {/* Linha separadora */}
              <div className="border-t border-dashed border-gray-300 my-4"></div>

              {/* Dados da transação */}
              <div className="space-y-3 text-sm">
                {dadosTransacao.lancamento && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lançamento:</span>
                    <span className="font-medium text-gray-900">{dadosTransacao.lancamento}</span>
                  </div>
                )}
                
                {dadosTransacao.nomeConvenio && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estabelecimento:</span>
                    <span className="font-medium text-gray-900">{dadosTransacao.nomeConvenio}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Associado:</span>
                  <span className="font-medium text-gray-900">{dadosTransacao.associado}</span>
                </div>
                
                {dadosTransacao.cpf && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">CPF:</span>
                    <span className="font-medium text-gray-900">{dadosTransacao.cpf}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor Total:</span>
                  <span className="font-bold text-green-600">{dadosTransacao.valor}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Parcelas:</span>
                  <span className="font-medium text-gray-900">{dadosTransacao.parcelas}x</span>
                </div>
                
                {dadosTransacao.valorParcela > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valor por Parcela:</span>
                    <span className="font-medium text-gray-900">
                      {dadosTransacao.valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Data Emissão:</span>
                  <span className="font-medium text-gray-900">{new Date(dadosTransacao.timestamp).toLocaleDateString('pt-BR')}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Hora:</span>
                  <span className="font-medium text-gray-900">{new Date(dadosTransacao.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Descrição:</span>
                  <span className="font-medium text-gray-900">{obterDescricaoDispositivo()}</span>
                </div>
              </div>

              {/* Linha separadora */}
              <div className="border-t border-dashed border-gray-300 my-4"></div>

              {/* Texto final */}
              <div className="text-center text-xs text-gray-500 space-y-1">
                <p>TRANSAÇÃO AUTORIZADA - CRÉDITO NO CONVÊNIO</p>
                <p>DOCUMENTO DIGITAL VÁLIDO</p>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-3 p-4 border-t print:hidden">
              <button
                onClick={compartilharComprovante}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <FaShare className="h-4 w-4" />
                Compartilhar
              </button>
              <button
                onClick={imprimirComprovante}
                className="flex-1 py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <FaPrint className="h-4 w-4" />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
  // Função para compartilhar comprovante como imagem
  async function compartilharComprovante() {
    if (!dadosTransacao) return;

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

      // Dados da transação
      const dados = [
        ...(dadosTransacao.lancamento ? [['Lançamento:', dadosTransacao.lancamento]] : []),
        ...(dadosTransacao.nomeConvenio ? [['Estabelecimento:', dadosTransacao.nomeConvenio]] : []),
        ['Associado:', dadosTransacao.associado],
        ['CPF:', dadosTransacao.cpf || 'Não informado'],
        ['Valor Total:', dadosTransacao.valor],
        ['Parcelas:', `${dadosTransacao.parcelas}x`],
        ['Valor por Parcela:', dadosTransacao.valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
        ['Data Emissão:', new Date(dadosTransacao.timestamp).toLocaleDateString('pt-BR')],
        ['Hora:', new Date(dadosTransacao.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })],
        ['Descrição:', obterDescricaoDispositivo()]
      ];

      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#333333';

      let yPosition = 160;
      const lineHeight = 25;

      dados.forEach(([label, value]) => {
        ctx.fillStyle = '#666666';
        ctx.fillText(label, 30, yPosition);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 11px Arial';
        ctx.fillText(String(value), 150, yPosition);
        ctx.font = '11px Arial';
        yPosition += lineHeight;
      });

      // Linha separadora final
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
          const file = new File([blob], `comprovante_transacao.png`, {
            type: 'image/png'
          });

          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                title: 'Comprovante de Transação',
                text: `Comprovante da transação - ${dadosTransacao.associado}`,
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
  }

  // Função auxiliar para baixar imagem
  function baixarImagem(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comprovante_transacao.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Comprovante baixado com sucesso!');
  }

  // Função para imprimir comprovante
  function imprimirComprovante() {
    if (!dadosTransacao) return;
    
    const printContent = document.getElementById('comprovante-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Comprovante de Transação</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px;
              background: white;
              color: #000;
              line-height: 1.4;
            }
            
            .print-content { 
              max-width: 400px; 
              margin: 0 auto;
              padding: 24px;
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
            }
            
            .text-center { text-align: center; }
            .mb-6 { margin-bottom: 24px; }
            .mb-3 { margin-bottom: 12px; }
            .my-4 { margin: 16px 0; }
            .space-y-3 > * + * { margin-top: 12px; }
            .space-y-1 > * + * { margin-top: 4px; }
            
            .w-16 { width: 64px; }
            .h-16 { height: 64px; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .bg-blue-600 { background-color: #2563eb; }
            .rounded-full { border-radius: 50%; }
            .flex { display: flex; }
            .items-center { align-items: center; }
            .justify-center { justify-content: center; }
            
            .logo-container {
              width: 64px;
              height: 64px;
              margin: 0 auto 12px auto;
              background-color: #2563eb;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
            }
            
            .logo-image {
              width: 40px;
              height: 40px;
              border-radius: 50%;
              background: url('/icons/icon-192x192.png') center/cover;
            }
            
            .text-lg { font-size: 18px; }
            .text-sm { font-size: 14px; }
            .text-xs { font-size: 12px; }
            .font-bold { font-weight: bold; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            
            .text-gray-900 { color: #111827; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-500 { color: #6b7280; }
            .text-green-600 { color: #059669; }
            
            .border-t { border-top: 1px solid #d1d5db; }
            .border-dashed { border-style: dashed; }
            .border-gray-300 { border-color: #d1d5db; }
            
            .flex-justify-between {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            
            @media print {
              body { 
                margin: 0; 
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
              .print-content { 
                max-width: none;
                border: none;
                box-shadow: none;
              }
              .logo-container {
                background-color: #2563eb !important;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-content">
            <!-- Logo -->
            <div class="text-center mb-6">
              <div class="logo-container">
                <div class="logo-image"></div>
              </div>
              <h2 class="text-lg font-bold text-gray-900">SASCRED - SISTEMA DE CRÉDITO</h2>
              <p class="text-sm text-gray-600">Comprovante de Transação</p>
            </div>

            <!-- Linha separadora -->
            <div class="border-t border-dashed border-gray-300 my-4"></div>

            <!-- Dados da transação -->
            <div class="space-y-3 text-sm">
              ${dadosTransacao.lancamento ? `
              <div class="flex-justify-between">
                <span class="text-gray-600">Lançamento:</span>
                <span class="font-medium text-gray-900">${dadosTransacao.lancamento}</span>
              </div>
              ` : ''}
              
              <div class="flex-justify-between">
                <span class="text-gray-600">Associado:</span>
                <span class="font-medium text-gray-900">${dadosTransacao.associado}</span>
              </div>
              
              ${dadosTransacao.cpf ? `
              <div class="flex-justify-between">
                <span class="text-gray-600">CPF:</span>
                <span class="font-medium text-gray-900">${dadosTransacao.cpf}</span>
              </div>
              ` : ''}
              
              <div class="flex-justify-between">
                <span class="text-gray-600">Valor Total:</span>
                <span class="font-bold text-green-600">${dadosTransacao.valor}</span>
              </div>
              
              <div class="flex-justify-between">
                <span class="text-gray-600">Parcelas:</span>
                <span class="font-medium text-gray-900">${dadosTransacao.parcelas}x</span>
              </div>
              
              ${dadosTransacao.valorParcela > 0 ? `
              <div class="flex-justify-between">
                <span class="text-gray-600">Valor por Parcela:</span>
                <span class="font-medium text-gray-900">
                  ${dadosTransacao.valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              ` : ''}
              
              <div class="flex-justify-between">
                <span class="text-gray-600">Data Emissão:</span>
                <span class="font-medium text-gray-900">${new Date(dadosTransacao.timestamp).toLocaleDateString('pt-BR')}</span>
              </div>
              
              <div class="flex-justify-between">
                <span class="text-gray-600">Hora:</span>
                <span class="font-medium text-gray-900">${new Date(dadosTransacao.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              
              <div class="flex-justify-between">
                <span class="text-gray-600">Descrição:</span>
                <span class="font-medium text-gray-900">${obterDescricaoDispositivo()}</span>
              </div>
            </div>

            <!-- Linha separadora -->
            <div class="border-t border-dashed border-gray-300 my-4"></div>

            <!-- Texto final -->
            <div class="text-center text-xs text-gray-500 space-y-1">
              <p>TRANSAÇÃO AUTORIZADA - CRÉDITO NO CONVÊNIO</p>
              <p>DOCUMENTO DIGITAL VÁLIDO</p>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }
}
