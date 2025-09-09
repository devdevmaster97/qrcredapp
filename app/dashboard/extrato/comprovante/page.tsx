'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FaShare, FaArrowLeft, FaQrcode } from 'react-icons/fa';
import Image from 'next/image';

interface LancamentoDetalhes {
  descricao: string;
  valor: string;
  data: string;
  parcela?: string;
  codigo: string;
  lancamento?: string;
  mes: string;
  nome: string;
}

export default function ComprovantePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lancamento, setLancamento] = useState<LancamentoDetalhes | null>(null);
  const [loading, setLoading] = useState(true);
  const comprovanteRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    try {
      const lancamentoParam = searchParams.get('lancamento');
      if (lancamentoParam) {
        const dados = JSON.parse(decodeURIComponent(lancamentoParam));
        setLancamento(dados);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do lançamento:', error);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  const handleVoltar = () => {
    router.back();
  };

  const compartilharComoImagem = async () => {
    if (!comprovanteRef.current) return;
    
    try {
      // Importar html2canvas dinamicamente apenas no cliente
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;
      
      // Criar uma versão canvas do comprovante
      const canvas = await html2canvas(comprovanteRef.current, {
        scale: 2, // Melhor qualidade
        backgroundColor: '#ffffff',
        logging: false
      });
      
      // Converter para blob e compartilhar
      canvas.toBlob(async (blob: Blob | null) => {
        if (!blob) {
          console.error('Erro ao gerar imagem');
          return;
        }
        
        // Adicionar timestamp para nome único
        const timestamp = new Date().getTime();
        const fileName = `comprovante_${timestamp}.png`;
        
        // Criar objeto de arquivo
        const file = new File([blob], fileName, { type: 'image/png' });
        
        // Verificar se o navegador suporta Web Share API
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'Comprovante SasCred',
              text: 'Comprovante de Lançamento SasCred',
              files: [file]
            });
          } catch (shareError) {
            console.error('Erro ao compartilhar:', shareError);
            
            // Fallback para download direto
            downloadComprovante(canvas);
          }
        } else {
          // Fallback para download direto
          downloadComprovante(canvas);
        }
      }, 'image/png', 0.9);
    } catch (error) {
      console.error('Erro ao gerar ou compartilhar comprovante:', error);
    }
  };
  
  // Função para download direto quando compartilhamento não é suportado
  const downloadComprovante = (canvas: HTMLCanvasElement) => {
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `comprovante_${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Formatar valor para exibição
  const formatarValor = (valor: string) => {
    if (!valor) return 'R$ 0,00';
    
    const valorNum = parseFloat(valor);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valorNum);
  };

  // Formatar data para exibição
  const formatarData = (dateStr: string) => {
    try {
      const [date, time] = dateStr.split(' ');
      return format(new Date(date + 'T' + (time || '00:00:00')), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (err) {
      console.error('Erro ao formatar data:', err);
      return dateStr;
    }
  };

  // Gerar um ID de autenticação fictício para o comprovante
  const gerarIdAutenticacao = () => {
    return Math.random().toString(36).substring(2, 12).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
      </div>
    );
  }

  if (!lancamento) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-red-600 mb-4">Dados do lançamento não encontrados</h1>
          <p className="text-gray-600 mb-6">Não foi possível carregar as informações deste lançamento.</p>
          <button 
            onClick={handleVoltar}
            className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center justify-center mx-auto"
          >
            <FaArrowLeft className="mr-2" /> Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Barra superior com botões */}
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={handleVoltar}
            className="p-2 rounded-full bg-white shadow-md"
          >
            <FaArrowLeft className="text-blue-600" />
          </button>
          
          <h1 className="text-lg font-bold text-gray-900">Comprovante de Lançamento</h1>
          
          <button 
            onClick={compartilharComoImagem}
            className="p-2 rounded-full bg-white shadow-md"
          >
            <FaShare className="text-blue-600" />
          </button>
        </div>
        
        {/* Comprovante */}
        <div 
          ref={comprovanteRef}
          className="bg-white rounded-lg shadow-lg overflow-hidden"
        >
          {/* Cabeçalho */}
          <div className="bg-blue-600 p-5 text-center text-white">
            <div className="flex justify-center mb-2">
              <Image 
                src="/icons/logo-32x32.png" 
                alt="SasCred Logo" 
                width={32} 
                height={32}
                className="filter brightness-0 invert"
              />
            </div>
            <h2 className="text-xl font-bold">SasCred</h2>
            <p className="text-sm opacity-80">Comprovante de Transação</p>
          </div>
          
          {/* Corpo do comprovante */}
          <div className="p-6">
            <div className="text-center mb-6">
              <h3 className="text-gray-900 font-semibold text-lg mb-1">{lancamento.descricao}</h3>
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {formatarValor(lancamento.valor)}
              </div>
              {lancamento.parcela && (
                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mb-2">
                  Parcela: {lancamento.parcela}
                </span>
              )}
              <p className="text-gray-500 text-sm">{formatarData(lancamento.data)}</p>
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-xs">Cliente</p>
                  <p className="text-gray-900 font-medium">{lancamento.nome}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Código</p>
                  <p className="text-gray-900 font-medium">{lancamento.codigo}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Mês de referência</p>
                  <p className="text-gray-900 font-medium">{lancamento.mes}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Lançamento</p>
                  <p className="text-gray-900 font-medium font-mono text-sm">{lancamento.lancamento || lancamento.codigo}</p>
                </div>
              </div>
            </div>
            
            {/* Rodapé do comprovante */}
            <div className="mt-8 pt-4 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500 mb-1">
                Este comprovante foi emitido em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
              <p className="text-xs text-gray-400">
                SasCred - Sistema de Pagamentos
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 