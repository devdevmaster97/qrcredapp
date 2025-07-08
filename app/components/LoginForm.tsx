'use client';

import { useState, useEffect, Fragment } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { FaLock, FaCreditCard, FaSpinner, FaEnvelope, FaPhone, FaWhatsapp, FaInfoCircle, FaEye, FaEyeSlash } from 'react-icons/fa';
import axios from 'axios';
import { FaSpinner as FaSpinner6 } from 'react-icons/fa6';
import { Dialog, Transition } from '@headlessui/react';
import { X, Loader2 } from 'lucide-react';
import Link from 'next/link';

// Esquema de validação para o formulário de login
const loginSchema = z.object({
  cartao: z.string().min(1, 'Cartão é obrigatório'),
  senha: z.string().min(1, 'Senha é obrigatória'),
});

// Tipo para os dados do formulário de login
type LoginFormData = z.infer<typeof loginSchema>;

// Interface para os dados do usuário da resposta do servidor
interface UserData {
  matricula: string;
  nome: string;
  empregador: string;
  cod_cart: string;
  limite: string;
  cpf: string;
  email: string;
  cel: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  celwatzap: string;
  nome_divisao: string;
  situacao: string;
}

// Interface para os cartões salvos
interface SavedCard {
  numero: string;
  nome?: string;
}

interface LoginFormProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  loading: boolean;
}

export default function LoginForm({ onSubmit, loading }: LoginFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [readOnly, setReadOnly] = useState(false);
  const [associadoNome, setAssociadoNome] = useState('Login do Associado');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [showSavedCards, setShowSavedCards] = useState(false);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  
  // Estados para recuperação de senha
  const [mostrarRecuperacao, setMostrarRecuperacao] = useState(false);
  const [metodoRecuperacao, setMetodoRecuperacao] = useState('');
  const [cartaoRecuperacao, setCartaoRecuperacao] = useState('');
  const [codigoRecuperacao, setCodigoRecuperacao] = useState('');
  const [etapaRecuperacao, setEtapaRecuperacao] = useState<'cartao' | 'codigo' | 'nova_senha'>('cartao');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false);
  const [mensagemRecuperacao, setMensagemRecuperacao] = useState('');
  const [destinoMascarado, setDestinoMascarado] = useState('');
  const [tokenRecuperacao, setTokenRecuperacao] = useState('');
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const [enviandoNovaSenha, setEnviandoNovaSenha] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmacaoSenha, setMostrarConfirmacaoSenha] = useState(false);
  const [mostrarSenhaLogin, setMostrarSenhaLogin] = useState(false);
  
  // Estado para armazenar informações do usuário para recuperação
  const [dadosUsuarioRecuperacao, setDadosUsuarioRecuperacao] = useState<{
    email?: string;
    celular?: string;
    temEmail: boolean;
    temCelular: boolean;
    temWhatsapp: boolean;
  }>({
    temEmail: false,
    temCelular: false,
    temWhatsapp: false
  });

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Carregar cartões salvos no carregamento do componente
  useEffect(() => {
    const loadSavedCards = () => {
      const storedCards = localStorage.getItem('qrcred_saved_cards');
      if (storedCards) {
        try {
          const parsedCards = JSON.parse(storedCards) as SavedCard[];
          setSavedCards(parsedCards);
          if (parsedCards.length > 0) {
            setShowSavedCards(true);
          }
        } catch (error) {
          console.error('Erro ao carregar cartões salvos:', error);
        }
      }
    };

    loadSavedCards();
  }, []);

  // Função para selecionar um cartão salvo
  const handleSelectCard = (card: SavedCard) => {
    setValue('cartao', card.numero);
    setShowSavedCards(false);
    setAssociadoNome(card.nome ? `Olá, ${card.nome}` : 'Login do Associado');
  };

  // Função para lidar com a troca de cartão
  const handleTrocarCartao = () => {
    setReadOnly(false);
    setShowSavedCards(true);
    setAssociadoNome('Login do Associado');
  };

  // Função para processar o login
  const onSubmitForm = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      setDebugInfo('');

      // Limpar o cartão de possíveis formatações
      const cartaoLimpo = data.cartao.replace(/\D/g, '').trim();
      const senhaLimpa = data.senha.trim();
      
      // Para fins de diagnóstico
      console.log('Tentando login com cartão (original):', data.cartao);
      console.log('Tentando login com cartão (limpo):', cartaoLimpo);
      
      // Criar FormData para enviar
      const formData = new FormData();
      formData.append('cartao', cartaoLimpo);
      formData.append('senha', senhaLimpa);
      
      // Tentar primeira abordagem: direto para a API local
      try {
        const response = await axios.post('/api/login', formData);
        console.log('Resposta da API local:', response.data);
        
        if (response.data && response.data.situacao) {
          processarResposta(response.data, cartaoLimpo);
        } else {
          // Se não tiver situacao, tentar abordagem alternativa
          throw new Error('Resposta sem situação');
        }
      } catch (localError) {
        console.error('Erro na API local, tentando diretamente:', localError);
        
        // Segunda abordagem: diretamente para o backend
        const urlSearchParams = new URLSearchParams();
        urlSearchParams.append('cartao', cartaoLimpo);
        urlSearchParams.append('senha', senhaLimpa);
        
        const response = await axios.post(
          'https://sas.makecard.com.br/localiza_associado_app_2.php',
          urlSearchParams.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );
        
        console.log('Resposta direta do backend:', response.data);
        processarResposta(response.data, cartaoLimpo);
      }
    } catch (error: unknown) {
      console.error('Erro na autenticação:', error);
      setErrorMessage('Erro de conexão. Verifique sua internet.');
      if (error instanceof Error) {
        setDebugInfo(error.message);
      } else {
        setDebugInfo(String(error));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Função para salvar o cartão na lista de cartões salvos
  const saveCardToLocalStorage = (card: string, nome?: string) => {
    try {
      // Obter cartões salvos
      const storedCards = localStorage.getItem('qrcred_saved_cards');
      let cards: SavedCard[] = [];
      
      if (storedCards) {
        cards = JSON.parse(storedCards);
      }
      
      // Verificar se o cartão já existe
      const cardExists = cards.some(c => c.numero === card);
      
      // Se não existir, adicionar
      if (!cardExists) {
        cards.push({ numero: card, nome });
        
        // Limitar a 5 cartões salvos
        if (cards.length > 5) {
          cards.shift();
        }
        
        localStorage.setItem('qrcred_saved_cards', JSON.stringify(cards));
      } else if (nome) {
        // Atualizar nome se necessário
        const updatedCards = cards.map(c => 
          c.numero === card ? { ...c, nome } : c
        );
        localStorage.setItem('qrcred_saved_cards', JSON.stringify(updatedCards));
      }
    } catch (error) {
      console.error('Erro ao salvar cartão:', error);
    }
  };

  // Função para processar a resposta do servidor
  const processarResposta = (data: Partial<UserData>, cartaoOriginal: string) => {
    // Processamento da resposta
    const resultado = data.situacao;
    console.log('Situação retornada:', resultado);
    
    // Converter para número para garantir a comparação correta
    const situacaoNum = Number(resultado);
    
    if (situacaoNum === 1) {
      // Antes de prosseguir, mostrar o objeto para diagnóstico
      console.log('Dados recebidos:', data);
      
      // Salvar o cartão utilizado
      saveCardToLocalStorage(cartaoOriginal, data.nome);
      
      // Armazenar dados do usuário 
      localStorage.setItem('qrcred_user', JSON.stringify({
        matricula: data.matricula || '',
        nome: data.nome || '',
        empregador: data.empregador || '',
        cartao: data.cod_cart || cartaoOriginal,
        limite: data.limite || '',
        cpf: data.cpf || '',
        email: data.email || '',
        cel: data.cel || '',
        cep: data.cep || '',
        endereco: data.endereco || '',
        numero: data.numero || '',
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        estado: data.uf || '',
        celzap: data.celwatzap || '',
        nome_divisao: data.nome_divisao || '',
      }));

      // Redirecionar para o dashboard
      router.push('/dashboard');
    } else if (situacaoNum === 6) {
      setErrorMessage('Senha incorreta');
    } else if (situacaoNum === 2 || situacaoNum === 3) {
      setErrorMessage('Cartão não encontrado');
    } else if (situacaoNum === 0) {
      setErrorMessage('Cartão bloqueado');
    } else {
      setErrorMessage(`Erro ao fazer login (código: ${resultado})`);
      setDebugInfo(JSON.stringify(data));
    }
  };

  // Função para verificar métodos disponíveis para o cartão
  const verificarMetodosRecuperacao = async (cartao: string) => {
    if (!cartao || cartao.length < 6) {
      setMensagemRecuperacao('Por favor, informe o número completo do cartão');
      return;
    }

    setEnviandoRecuperacao(true);
    setMensagemRecuperacao('Verificando métodos disponíveis...');
    
    try {
      // Preparar os dados para enviar
      const formData = new FormData();
      formData.append('cartao', cartao);
      
      // Chamar a API para verificar métodos disponíveis
      const response = await fetch('/api/verificar-metodos-recuperacao', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      console.log('Métodos de recuperação disponíveis:', result);
      
      if (result.success) {
        setDadosUsuarioRecuperacao({
          email: result.email,
          celular: result.celular,
          temEmail: Boolean(result.temEmail),
          temCelular: Boolean(result.temCelular),
          temWhatsapp: Boolean(result.temWhatsapp)
        });
        
        // Limpar mensagem de erro
        setMensagemRecuperacao('');
        
        // Se tiver apenas um método disponível, já seleciona automaticamente
        if (result.temEmail && !result.temCelular && !result.temWhatsapp) {
          setMetodoRecuperacao('email');
        } else if (!result.temEmail && result.temCelular && !result.temWhatsapp) {
          setMetodoRecuperacao('sms');
        } else if (!result.temEmail && !result.temCelular && result.temWhatsapp) {
          setMetodoRecuperacao('whatsapp');
        }
      } else {
        setMensagemRecuperacao(result.message || 'Cartão não encontrado ou sem métodos de recuperação disponíveis.');
      }
    } catch (error) {
      console.error('Erro ao verificar métodos de recuperação:', error);
      setMensagemRecuperacao('Erro ao verificar métodos disponíveis. Tente novamente.');
    } finally {
      setEnviandoRecuperacao(false);
    }
  };

  // Função para lidar com o envio do formulário de recuperação de senha
  const handleRecuperarSenha = async () => {
    if (!cartaoRecuperacao) {
      setMensagemRecuperacao('Por favor, informe o número do cartão');
      return;
    }
    
    if (!metodoRecuperacao) {
      setMensagemRecuperacao('Por favor, selecione um método de recuperação');
      return;
    }
    
    setEnviandoRecuperacao(true);
    setMensagemRecuperacao('');
    
    try {
      // Preparar os dados para enviar
      const formData = new FormData();
      formData.append('cartao', cartaoRecuperacao);
      formData.append('metodo', metodoRecuperacao);
      
      console.log(`Solicitando código de recuperação para cartão: ${cartaoRecuperacao}, método: ${metodoRecuperacao}`);
      
      // Chamar a API de recuperação de senha
      const response = await fetch('/api/recuperacao-senha', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      console.log('Resposta da solicitação de código:', result);
      
      if (result.success) {
        // Atualizar mensagem e mostrar campo para código
        setMensagemRecuperacao(result.message);
        setDestinoMascarado(result.destino);
        
        // Se estiver em ambiente de desenvolvimento, mostrar o código recebido
        if (result.codigoTemp) {
          setMensagemRecuperacao(prev => 
            `${prev} [AMBIENTE DEV: Use o código ${result.codigoTemp}]`
          );
        }
        
        // Mover para próxima etapa (validação de código)
        setTimeout(() => {
          setEtapaRecuperacao('codigo');
        }, 1500);
      } else {
        setMensagemRecuperacao(result.message || 'Erro ao solicitar recuperação de senha.');
      }
    } catch (error) {
      console.error('Erro ao solicitar recuperação de senha:', error);
      setMensagemRecuperacao('Erro ao solicitar recuperação de senha. Tente novamente mais tarde.');
    } finally {
      setEnviandoRecuperacao(false);
    }
  };

  // Função para validar o código de recuperação
  const handleValidarCodigo = async () => {
    if (!codigoRecuperacao || codigoRecuperacao.length < 6) {
      setMensagemRecuperacao('Por favor, informe o código de verificação completo');
      return;
    }
    
    setEnviandoCodigo(true);
    setMensagemRecuperacao('');
    
    try {
      // Preparar os dados para enviar
      const formData = new FormData();
      formData.append('cartao', cartaoRecuperacao);
      formData.append('codigo', codigoRecuperacao);
      
      // Em ambiente de desenvolvimento, podemos forçar a validação
      if (process.env.NODE_ENV === 'development') {
        formData.append('forcarValidacao', 'true');
      }
      
      console.log('Enviando validação de código:', {
        cartao: cartaoRecuperacao,
        codigo: codigoRecuperacao,
        dev: process.env.NODE_ENV === 'development'
      });
      
      // Verificar o código localmente em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        try {
          // Verificar status dos códigos armazenados
          const responseDebug = await fetch('/api/debug-codigos');
          const resultDebug = await responseDebug.json();
          console.log('Debug - códigos armazenados:', resultDebug);
        } catch (err) {
          console.error('Erro ao verificar códigos para debug:', err);
        }
      }
      
      // Chamar a API de validação do código
      const response = await fetch('/api/validar-codigo', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        console.error('Erro na resposta da API:', {
          status: response.status,
          statusText: response.statusText
        });
        
        // Em ambiente de desenvolvimento, podemos prosseguir mesmo com erro
        if (process.env.NODE_ENV === 'development') {
          console.log('Ambiente de desenvolvimento: ignorando erro na validação e prosseguindo');
          setTokenRecuperacao(gerarTokenTemporario(cartaoRecuperacao));
          setMensagemRecuperacao('Código validado com sucesso (modo desenvolvimento). Agora defina sua nova senha.');
          setTimeout(() => {
            setEtapaRecuperacao('nova_senha');
            setMensagemRecuperacao('');
          }, 1500);
          setEnviandoCodigo(false);
          return;
        }
      }
      
      const result = await response.json();
      console.log('Resposta da validação de código:', result);
      
      // Verificar se o erro é "Nenhum código solicitado para este cartão"
      if (result.success === false && 
          result.message === 'Nenhum código solicitado para este cartão.') {
        console.log('Detectado erro de código não encontrado no banco, tentando inserir manualmente');
        
        // Tentar inserir o código no banco de dados
        const formDataInsert = new FormData();
        formDataInsert.append('cartao', cartaoRecuperacao);
        formDataInsert.append('codigo', codigoRecuperacao);
        
        try {
          const responseInsert = await fetch('/api/insere-codigo', {
            method: 'POST',
            body: formDataInsert
          });
          
          const resultInsert = await responseInsert.json();
          console.log('Resposta da inserção de código:', resultInsert);
          
          if (resultInsert.success) {
            console.log('Código inserido com sucesso, tentando validar novamente');
            
            // Tentar validar novamente após inserção
            const responseValidacao = await fetch('/api/validar-codigo', {
              method: 'POST',
              body: formData
            });
            
            const resultValidacao = await responseValidacao.json();
            console.log('Resposta da segunda validação:', resultValidacao);
            
            if (resultValidacao.success) {
              // Código validado com sucesso após inserção
              setTokenRecuperacao(resultValidacao.token);
              setMensagemRecuperacao('Código validado com sucesso. Agora defina sua nova senha.');
              setTimeout(() => {
                setEtapaRecuperacao('nova_senha');
                setMensagemRecuperacao('');
              }, 1500);
              setEnviandoCodigo(false);
              return;
            } else {
              // Ainda com erro após inserção, usar o modo de desenvolvimento
              if (process.env.NODE_ENV === 'development') {
                console.log('Ainda com erro após inserção, usando fallback de desenvolvimento');
                setTokenRecuperacao(gerarTokenTemporario(cartaoRecuperacao));
                setMensagemRecuperacao('Código validado com sucesso (modo desenvolvimento - após inserção). Agora defina sua nova senha.');
                setTimeout(() => {
                  setEtapaRecuperacao('nova_senha');
                  setMensagemRecuperacao('');
                }, 1500);
                setEnviandoCodigo(false);
                return;
              }
            }
          }
        } catch (insertError) {
          console.error('Erro ao inserir código manualmente:', insertError);
        }
      }
      
      if (result.success) {
        // Salvar o token e avançar para a próxima etapa
        setTokenRecuperacao(result.token);
        setMensagemRecuperacao('Código validado com sucesso. Agora defina sua nova senha.');
        // Mover para a etapa final (nova senha)
        setTimeout(() => {
          setEtapaRecuperacao('nova_senha');
          setMensagemRecuperacao('');
        }, 1500);
      } else {
        setMensagemRecuperacao(result.message || 'Código inválido ou expirado.');
        console.log('Erro na validação:', result.message);
        
        // Se houver informações adicionais de erro, mostrar no console
        if (result.error) {
          console.error('Detalhes do erro:', result.error);
        }
      }
    } catch (error) {
      console.error('Erro ao validar código:', error);
      
      // Em ambiente de desenvolvimento, podemos prosseguir mesmo com exceção
      if (process.env.NODE_ENV === 'development') {
        console.log('Ambiente de desenvolvimento: ignorando exceção na validação e prosseguindo');
        setTokenRecuperacao(gerarTokenTemporario(cartaoRecuperacao));
        setMensagemRecuperacao('Código validado com sucesso (modo desenvolvimento - fallback). Agora defina sua nova senha.');
        setTimeout(() => {
          setEtapaRecuperacao('nova_senha');
          setMensagemRecuperacao('');
        }, 1500);
      } else {
        setMensagemRecuperacao('Erro ao validar código. Tente novamente.');
      }
    } finally {
      setEnviandoCodigo(false);
    }
  };

  // Função auxiliar para gerar token temporário
  const gerarTokenTemporario = (cartao: string): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return btoa(`${cartao}:${timestamp}:${random}`);
  };

  // Função para definir a nova senha
  const handleDefinirNovaSenha = async () => {
    // Verificar se a senha foi informada
    if (!novaSenha) {
      setMensagemRecuperacao('Por favor, informe a nova senha');
      return;
    }
    
    // Verificar se a senha tem exatamente 6 dígitos numéricos
    if (!/^\d{6}$/.test(novaSenha)) {
      setMensagemRecuperacao('A senha deve conter exatamente 6 dígitos numéricos');
      return;
    }
    
    // Verificar se as senhas são iguais
    if (novaSenha !== confirmacaoSenha) {
      setMensagemRecuperacao('As senhas não conferem. Digite exatamente a mesma senha nos dois campos.');
      console.log('Senhas diferentes:', {
        novaSenha,
        confirmacaoSenha,
        iguais: novaSenha === confirmacaoSenha,
        tamanhoNova: novaSenha.length,
        tamanhoConfirmacao: confirmacaoSenha.length
      });
      return;
    }
    
    setEnviandoNovaSenha(true);
    setMensagemRecuperacao('');
    
    try {
      console.log('Enviando nova senha para o cartão:', cartaoRecuperacao);
      
      // Preparar os dados para enviar
      const formData = new FormData();
      formData.append('cartao', cartaoRecuperacao);
      formData.append('senha', novaSenha);
      formData.append('confirmacao', confirmacaoSenha); // Enviar confirmação também
      formData.append('token', tokenRecuperacao);
      
      // Chamar a API de redefinição de senha
      const response = await fetch('/api/redefinir-senha', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      console.log('Resposta do servidor:', result);
      
      if (result.success) {
        setMensagemRecuperacao(result.message || 'Senha redefinida com sucesso!');
        
        // Após 3 segundos, fechar o modal e limpar os campos
        setTimeout(() => {
          setMostrarRecuperacao(false);
          resetarFormularioRecuperacao();
          // Preencher o campo de cartão no formulário de login
          setValue('cartao', cartaoRecuperacao);
        }, 3000);
      } else {
        setMensagemRecuperacao(result.message || 'Erro ao redefinir senha.');
      }
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      setMensagemRecuperacao('Erro ao redefinir senha. Tente novamente mais tarde.');
    } finally {
      setEnviandoNovaSenha(false);
    }
  };

  // Função para resetar o formulário de recuperação
  const resetarFormularioRecuperacao = () => {
    setMetodoRecuperacao('');
    setCartaoRecuperacao('');
    setCodigoRecuperacao('');
    setNovaSenha('');
    setConfirmacaoSenha('');
    setEtapaRecuperacao('cartao');
    setTokenRecuperacao('');
    setDestinoMascarado('');
    setMensagemRecuperacao('');
  };

  // Função para abrir o modal de recuperação de senha
  const abrirModalRecuperacao = (e: React.MouseEvent) => {
    e.preventDefault();
    setMostrarRecuperacao(true);
    resetarFormularioRecuperacao();
  };

  // Função para voltar etapa da recuperação
  const voltarEtapaRecuperacao = () => {
    if (etapaRecuperacao === 'codigo') {
      setEtapaRecuperacao('cartao');
    } else if (etapaRecuperacao === 'nova_senha') {
      setEtapaRecuperacao('codigo');
    }
    setMensagemRecuperacao('');
  };

  // Modal de recuperação de senha
  const renderRecuperacaoSenha = () => {
    if (!mostrarRecuperacao) return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-blue-600">
                {etapaRecuperacao === 'cartao' && 'Recuperação de Senha'}
                {etapaRecuperacao === 'codigo' && 'Verificação de Código'}
                {etapaRecuperacao === 'nova_senha' && 'Definir Nova Senha'}
              </h3>
              <button 
                onClick={() => setMostrarRecuperacao(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            {mensagemRecuperacao && (
              <div className={`p-3 mb-4 rounded ${
                mensagemRecuperacao.includes('sucesso') || mensagemRecuperacao.includes('enviado')
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                <p>{mensagemRecuperacao}</p>
                {destinoMascarado && etapaRecuperacao === 'codigo' && (
                  <p className="text-sm mt-1">
                    Enviado para: <span className="font-semibold">{destinoMascarado}</span>
                  </p>
                )}
              </div>
            )}

            {etapaRecuperacao === 'cartao' && (
              <div>
                <div className="mb-4">
                  <label htmlFor="cartaoRecuperacao" className="block text-sm font-medium text-gray-700 mb-1">
                    Número do Cartão
                  </label>
                  <input
                    type="text"
                    id="cartaoRecuperacao"
                    value={cartaoRecuperacao}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setCartaoRecuperacao(value);
                      // Se tiver 6 dígitos ou mais, verifica os métodos disponíveis
                      if (value.length >= 6) {
                        verificarMetodosRecuperacao(value);
                      } else {
                        // Resetar dados de métodos disponíveis
                        setDadosUsuarioRecuperacao({
                          temEmail: false,
                          temCelular: false,
                          temWhatsapp: false
                        });
                        setMetodoRecuperacao('');
                      }
                    }}
                    placeholder="Digite o número do seu cartão"
                    maxLength={16}
                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {(dadosUsuarioRecuperacao.temEmail || dadosUsuarioRecuperacao.temCelular || dadosUsuarioRecuperacao.temWhatsapp) && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Método de Recuperação
                    </label>
                    
                    <div className="space-y-2">
                      {dadosUsuarioRecuperacao.temEmail && (
                        <div className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50"
                             onClick={() => setMetodoRecuperacao('email')}>
                          <input
                            type="radio"
                            id="metodoEmail"
                            name="metodoRecuperacao"
                            value="email"
                            checked={metodoRecuperacao === 'email'}
                            onChange={() => setMetodoRecuperacao('email')}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <label htmlFor="metodoEmail" className="ml-2 flex items-center w-full cursor-pointer">
                            <FaEnvelope className="text-blue-500 mr-2" />
                            <div>
                              <p className="text-sm font-medium">E-mail</p>
                              <p className="text-xs text-gray-500">{dadosUsuarioRecuperacao.email || 'E-mail cadastrado'}</p>
                            </div>
                          </label>
                        </div>
                      )}
                      
                      {dadosUsuarioRecuperacao.temCelular && (
                        <div className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50"
                             onClick={() => setMetodoRecuperacao('sms')}>
                          <input
                            type="radio"
                            id="metodoSMS"
                            name="metodoRecuperacao"
                            value="sms"
                            checked={metodoRecuperacao === 'sms'}
                            onChange={() => setMetodoRecuperacao('sms')}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <label htmlFor="metodoSMS" className="ml-2 flex items-center w-full cursor-pointer">
                            <FaPhone className="text-green-500 mr-2" />
                            <div>
                              <p className="text-sm font-medium">SMS</p>
                              <p className="text-xs text-gray-500">{dadosUsuarioRecuperacao.celular || 'Celular cadastrado'}</p>
                            </div>
                          </label>
                        </div>
                      )}
                      
                      {dadosUsuarioRecuperacao.temWhatsapp && (
                        <div className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50"
                             onClick={() => setMetodoRecuperacao('whatsapp')}>
                          <input
                            type="radio"
                            id="metodoWhatsapp"
                            name="metodoRecuperacao"
                            value="whatsapp"
                            checked={metodoRecuperacao === 'whatsapp'}
                            onChange={() => setMetodoRecuperacao('whatsapp')}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <label htmlFor="metodoWhatsapp" className="ml-2 flex items-center w-full cursor-pointer">
                            <FaWhatsapp className="text-green-600 mr-2" />
                            <div>
                              <p className="text-sm font-medium">WhatsApp</p>
                              <p className="text-xs text-gray-500">{dadosUsuarioRecuperacao.celular || 'Celular cadastrado'}</p>
                            </div>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end mt-6">
                  <button
                    type="button"
                    onClick={handleRecuperarSenha}
                    disabled={enviandoRecuperacao || !cartaoRecuperacao || !metodoRecuperacao}
                    className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                      (enviandoRecuperacao || !cartaoRecuperacao || !metodoRecuperacao) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    style={{ display: 'flex', alignItems: 'center', height: '40px' }}
                  >
                    {enviandoRecuperacao ? (
                      <span className="flex items-center">
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        Enviando...
                      </span>
                    ) : (
                      'Enviar Código'
                    )}
                  </button>
                </div>
              </div>
            )}
            
            {etapaRecuperacao === 'codigo' && (
              <div>
                <div className="mb-4">
                  <label htmlFor="codigoRecuperacao" className="block text-sm font-medium text-gray-700 mb-1">
                    Código de Verificação
                  </label>
                  <input
                    type="text"
                    id="codigoRecuperacao"
                    value={codigoRecuperacao}
                    onChange={(e) => setCodigoRecuperacao(e.target.value.replace(/\D/g, ''))}
                    placeholder="Digite o código de 6 dígitos"
                    maxLength={6}
                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 text-center text-lg tracking-widest"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Digite o código de 6 dígitos enviado para {destinoMascarado || 'seu contato cadastrado'}.
                  </p>
                </div>

                <div className="flex justify-between mt-6">
                  <button
                    type="button"
                    onClick={voltarEtapaRecuperacao}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleValidarCodigo}
                    disabled={enviandoCodigo || !codigoRecuperacao || codigoRecuperacao.length < 6}
                    className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                      (enviandoCodigo || !codigoRecuperacao || codigoRecuperacao.length < 6) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {enviandoCodigo ? (
                      <span className="flex items-center">
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        Verificando...
                      </span>
                    ) : (
                      'Verificar Código'
                    )}
                  </button>
                </div>
              </div>
            )}

            {etapaRecuperacao === 'nova_senha' && (
              <div>
                <div className="mb-4">
                  <label htmlFor="novaSenha" className="block text-sm font-medium text-gray-700 mb-1">
                    Nova senha (6 dígitos numéricos)
                  </label>
                  <div className="relative">
                    <input
                      type={mostrarNovaSenha ? "text" : "password"}
                      id="novaSenha"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value.replace(/\D/g, '').substring(0, 6))}
                      placeholder="Apenas 6 dígitos numéricos"
                      maxLength={6}
                      className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                      tabIndex={-1}
                    >
                      {mostrarNovaSenha ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    A senha deve conter exatamente 6 dígitos numéricos.
                  </p>
                </div>

                <div className="mb-4">
                  <label htmlFor="confirmacaoSenha" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar senha
                  </label>
                  <div className="relative">
                    <input
                      type={mostrarConfirmacaoSenha ? "text" : "password"}
                      id="confirmacaoSenha"
                      value={confirmacaoSenha}
                      onChange={(e) => setConfirmacaoSenha(e.target.value.replace(/\D/g, '').substring(0, 6))}
                      placeholder="Repita a mesma senha"
                      maxLength={6}
                      className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => setMostrarConfirmacaoSenha(!mostrarConfirmacaoSenha)}
                      tabIndex={-1}
                    >
                      {mostrarConfirmacaoSenha ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Digite novamente a mesma senha para confirmar.
                  </p>
                </div>

                <div className="flex justify-between mt-6">
                  <button
                    type="button"
                    onClick={voltarEtapaRecuperacao}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleDefinirNovaSenha}
                    disabled={enviandoNovaSenha || !novaSenha || novaSenha !== confirmacaoSenha || !/^\d{6}$/.test(novaSenha)}
                    className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                      (enviandoNovaSenha || !novaSenha || novaSenha !== confirmacaoSenha || !/^\d{6}$/.test(novaSenha)) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {enviandoNovaSenha ? (
                      <span className="flex items-center">
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        Salvando...
                      </span>
                    ) : (
                      'Salvar Nova Senha'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{associadoNome}</h2>
      </div>

      {showSavedCards && savedCards.length > 0 && (
        <div className="mb-4">
          <h3 className="text-md font-medium text-gray-700 mb-2">Cartões Recentes</h3>
          <div className="space-y-2">
            {savedCards.map((card, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectCard(card)}
                className="w-full flex items-center justify-between p-3 border rounded-md hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center">
                  <FaCreditCard className="text-blue-500 mr-2" />
                  <span>{card.numero}</span>
                </span>
                {card.nome && <span className="text-sm text-gray-500">{card.nome}</span>}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowSavedCards(false)}
              className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-md shadow transition duration-200"
            >
              Usar Outro Cartão
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
        {!showSavedCards && (
          <>
            <div className="space-y-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaCreditCard className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Número do Cartão"
                  className="block w-full pl-10 py-2 sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  readOnly={readOnly}
                  maxLength={10}
                  {...register('cartao')}
                />
              </div>
              {errors.cartao && (
                <p className="text-sm text-red-500">{errors.cartao.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={mostrarSenhaLogin ? "text" : "password"}
                  placeholder="Senha"
                  className="block w-full pl-10 pr-10 py-2 sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  maxLength={20}
                  {...register('senha')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                  onClick={() => setMostrarSenhaLogin(!mostrarSenhaLogin)}
                  tabIndex={-1}
                >
                  {mostrarSenhaLogin ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                </button>
              </div>
              {errors.senha && (
                <p className="text-sm text-red-500">{errors.senha.message}</p>
              )}
            </div>

            {errorMessage && (
              <div className="p-2 bg-red-100 text-red-700 rounded text-center">
                {errorMessage}
              </div>
            )}
            
            {debugInfo && (
              <div className="p-2 bg-gray-100 text-gray-700 rounded text-xs overflow-auto max-h-40">
                <strong>Info Diagnóstico:</strong> {debugInfo}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  'Entrar'
                )}
              </button>
            </div>
            
            {readOnly && (
              <button
                type="button"
                onClick={handleTrocarCartao}
                className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-md shadow transition duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
              >
                Trocar Cartão
              </button>
            )}
            
            {savedCards.length > 0 && !readOnly && (
              <button
                type="button"
                onClick={() => setShowSavedCards(true)}
                className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-md shadow transition duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
              >
                Cartões Recentes
              </button>
            )}
            
            <div className="text-center">
              <a 
                href="#" 
                className="text-sm text-blue-600 hover:text-blue-800"
                onClick={abrirModalRecuperacao}
              >
                Esqueci minha senha
              </a>
            </div>

            {/* Link para cadastro */}
            <div className="mt-4 text-center">
              <Link href="/cadastro" className="text-sm text-blue-600 hover:text-blue-800">
                Não tem cadastro? Clique aqui para se cadastrar
              </Link>
            </div>
          </>
        )}
      </form>

      {renderRecuperacaoSenha()}
    </div>
  );
}

/**
 * Mascara o email para exibição, mostrando apenas parte do email
 * Ex: jo***@gm***.com
 */
function mascaraEmail(email: string): string {
  if (!email || email.indexOf('@') === -1) return '***@***.com';
  
  const [usuario, dominio] = email.split('@');
  const dominioPartes = dominio.split('.');
  const extensao = dominioPartes.pop() || '';
  const nomeUsuarioMascarado = usuario.substring(0, Math.min(2, usuario.length)) + '***';
  const nomeDominioMascarado = dominioPartes.join('.').substring(0, Math.min(2, dominioPartes.join('.').length)) + '***';
  
  return `${nomeUsuarioMascarado}@${nomeDominioMascarado}.${extensao}`;
}

/**
 * Mascara o telefone para exibição, mostrando apenas parte do número
 * Ex: (**) *****-1234
 */
function mascaraTelefone(telefone: string): string {
  if (!telefone) return '(**) *****-****';
  
  const numeroLimpo = telefone.replace(/\D/g, '');
  if (numeroLimpo.length < 4) return '(**) *****-****';
  
  const ultimosDigitos = numeroLimpo.slice(-4);
  return `(**) *****-${ultimosDigitos}`;
} 