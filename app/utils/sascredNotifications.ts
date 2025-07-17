/**
 * Utilitários para notificações e verificações do SasCred
 * Usado para detectar quando o usuário completa a assinatura digital
 */

/**
 * Dispara verificação imediata do status de adesão SasCred
 * Use quando souber que o usuário acabou de assinar digitalmente
 */
export function triggerSasCredVerification() {
  console.log('🚀 SasCred: Forçando verificação imediata de adesão');
  
  // Disparar evento customizado para atualizar hook
  window.dispatchEvent(new CustomEvent('sascred-status-changed', {
    detail: { action: 'force-check', timestamp: Date.now() }
  }));
  
  // Salvar flag no localStorage para componentes que escutam
  localStorage.setItem('sascred_force_check', Date.now().toString());
  
  // Remover flag após 1 segundo
  setTimeout(() => {
    localStorage.removeItem('sascred_force_check');
  }, 1000);
}

/**
 * Marca que o usuário pode ter assinado digitalmente
 * Use quando o usuário voltar de uma tela de assinatura
 */
export function markPossibleSignature() {
  console.log('✍️ SasCred: Usuário pode ter assinado - agendando verificação');
  
  // Marcar no localStorage que pode ter assinado
  localStorage.setItem('sascred_possible_signature', Date.now().toString());
  
  // Forçar verificação após 3 segundos
  setTimeout(() => {
    triggerSasCredVerification();
  }, 3000);
}

/**
 * Verifica se há uma possível assinatura pendente
 */
export function hasPendingSignatureCheck(): boolean {
  const timestamp = localStorage.getItem('sascred_possible_signature');
  if (!timestamp) return false;
  
  const signatureTime = parseInt(timestamp);
  const now = Date.now();
  
  // Considera pendente se foi há menos de 2 minutos
  return (now - signatureTime) < 120000;
}

/**
 * Limpa flags de assinatura pendente
 */
export function clearSignatureFlags() {
  localStorage.removeItem('sascred_possible_signature');
  localStorage.removeItem('sascred_force_check');
}

/**
 * Inicia verificação acelerada após possível assinatura
 * Verifica mais frequentemente por 2 minutos
 */
export function startAcceleratedChecking() {
  console.log('⚡ SasCred: Iniciando verificação acelerada');
  
  let checkCount = 0;
  const maxChecks = 24; // 2 minutos = 24 checks de 5s
  
  const acceleratedInterval = setInterval(() => {
    checkCount++;
    
    console.log(`🔍 SasCred: Verificação acelerada ${checkCount}/${maxChecks}`);
    triggerSasCredVerification();
    
    // Parar após 2 minutos ou se não há mais flag pendente
    if (checkCount >= maxChecks || !hasPendingSignatureCheck()) {
      clearInterval(acceleratedInterval);
      console.log('🛑 SasCred: Verificação acelerada finalizada');
    }
  }, 5000);
  
  return acceleratedInterval;
} 