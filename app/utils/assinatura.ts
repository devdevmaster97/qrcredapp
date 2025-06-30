// Utilitários para gerenciar o status da assinatura digital do Sascred

const ASSINATURA_STORAGE_KEY = 'sascred_assinatura_completa';

/**
 * Verifica se a assinatura digital foi completa
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
 * Simula a verificação do status da assinatura digital
 * Em produção, esta função deve fazer uma chamada real para a API do ZapSign
 */
export async function verificarStatusAssinatura(): Promise<boolean> {
  // Simular delay de verificação
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Para demonstração, assumir 70% de chance de estar completa
  // Em produção, fazer chamada real para API
  return Math.random() > 0.3;
}

/**
 * URL do ZapSign para verificação de assinatura
 */
export const ZAPSIGN_URL = 'https://app.zapsign.com.br/verificar/doc/b4ab32f3-d964-4fae-b9d2-01c05f2f4258'; 