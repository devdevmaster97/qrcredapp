// Utilitários para gerenciar o status da assinatura digital do Sascred

const ASSINATURA_STORAGE_KEY = 'sascred_assinatura_completa';

/**
 * Verifica se a assinatura digital foi completa (verificação local)
 */
export function isAssinaturaCompleta(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ASSINATURA_STORAGE_KEY) === 'true';
}

/**
 * Marca a assinatura digital como completa
 */
export function marcarAssinaturaCompleta(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ASSINATURA_STORAGE_KEY, 'true');
  }
}

/**
 * Remove o status da assinatura digital (para testes/reset)
 */
export function resetarAssinatura(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ASSINATURA_STORAGE_KEY);
  }
}

/**
 * Abre o canal de antecipação no WhatsApp
 */
export function abrirCanalAntecipacao(): void {
  const numero = '5535998120032';
  const mensagem = '🚀 Olá! Completei minha assinatura digital do Sascred e gostaria de solicitar uma Antecipação de Crédito!';
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
  
  try {
    window.open(url, '_blank');
  } catch (error) {
    window.location.href = url;
  }
}

/**
 * Obtém o CPF do usuário logado
 */
function obterCpfUsuario(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const storedUser = localStorage.getItem('qrcred_user');
    if (!storedUser) return null;
    
    const userData = JSON.parse(storedUser);
    // Assumindo que o CPF está nos dados do usuário
    // Pode ser necessário ajustar dependendo da estrutura dos dados
    return userData.cpf || userData.documento || null;
  } catch (error) {
    console.error('Erro ao obter CPF do usuário:', error);
    return null;
  }
}

/**
 * Verifica o status da assinatura digital via API do ZapSign
 * Faz uma chamada real para nossa API local que consulta o ZapSign
 */
export async function verificarStatusAssinatura(): Promise<boolean> {
  try {
    console.log('🔍 Verificando status da assinatura digital...');
    
    // Obter CPF do usuário
    const cpf = obterCpfUsuario();
    
    if (!cpf) {
      console.log('⚠️ CPF do usuário não encontrado. Não é possível verificar assinatura.');
      return false;
    }

    console.log('📞 Chamando API de verificação de assinatura...');
    
    // Chamar nossa API local
    const response = await fetch('/api/verificar-assinatura-zapsign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cpf })
    });

    const responseText = await response.text();
    console.log('📥 Resposta bruta da API:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Erro ao fazer parse da resposta:', e);
      return false;
    }

    console.log('📊 Dados da verificação:', data);

    if (response.ok && data.status === 'ok') {
      console.log('✅ Assinatura digital encontrada!', data.documento);
      
      // Marcar como completa no localStorage
      marcarAssinaturaCompleta();
      
      return true;
    } else if (data.status === 'nao_encontrado') {
      console.log('❌ Assinatura digital não encontrada para este CPF');
      return false;
    } else {
      console.log('⚠️ Erro na verificação:', data.mensagem);
      return false;
    }

  } catch (error) {
    console.error('💥 Erro ao verificar status da assinatura:', error);
    return false;
  }
}

/**
 * Verifica se o usuário tem CPF disponível para verificação de assinatura
 */
export function temCpfParaVerificacao(): boolean {
  return obterCpfUsuario() !== null;
}

/**
 * Obtém informações do usuário para verificação de assinatura
 */
export function obterInfoUsuarioAssinatura() {
  if (typeof window === 'undefined') return null;
  
  try {
    const storedUser = localStorage.getItem('qrcred_user');
    if (!storedUser) return null;
    
    const userData = JSON.parse(storedUser);
    
    return {
      nome: userData.nome || '',
      cpf: userData.cpf || userData.documento || '',
      cartao: userData.cartao || '',
      empresa: userData.nome_divisao || ''
    };
  } catch (error) {
    console.error('Erro ao obter informações do usuário:', error);
    return null;
  }
}

/**
 * URL do ZapSign para verificação de assinatura
 */
export const ZAPSIGN_URL = 'https://app.zapsign.com.br/verificar/doc/b4ab32f3-d964-4fae-b9d2-01c05f2f4258'; 