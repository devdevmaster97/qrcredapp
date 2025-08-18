/**
 * Sistema de notificações para aprovação de antecipação
 * Similar ao sascredNotifications.ts
 */

// Chave para armazenar flag de verificação forçada
const FORCE_CHECK_KEY = 'antecipacao_force_check';
const LAST_CHECK_KEY = 'antecipacao_last_check';

/**
 * Marca que uma verificação de aprovação deve ser forçada
 */
export function forceAntecipacaoCheck() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(FORCE_CHECK_KEY, Date.now().toString());
    console.log('🔔 Marcado para verificação forçada da antecipação');
  }
}

/**
 * Verifica se deve forçar uma verificação
 */
export function shouldForceAntecipacaoCheck(): boolean {
  if (typeof window === 'undefined') return false;
  
  const forceCheck = localStorage.getItem(FORCE_CHECK_KEY);
  const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
  
  if (!forceCheck) return false;
  
  const forceTime = parseInt(forceCheck);
  const lastTime = lastCheck ? parseInt(lastCheck) : 0;
  
  // Forçar verificação se a marca for mais recente que a última verificação
  return forceTime > lastTime;
}

/**
 * Marca que a verificação foi realizada
 */
export function markAntecipacaoChecked() {
  if (typeof window !== 'undefined') {
    const now = Date.now().toString();
    localStorage.setItem(LAST_CHECK_KEY, now);
    localStorage.removeItem(FORCE_CHECK_KEY);
    console.log('✅ Verificação da antecipação marcada como realizada');
  }
}

/**
 * Limpa todas as flags de verificação
 */
export function clearAntecipacaoFlags() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(FORCE_CHECK_KEY);
    localStorage.removeItem(LAST_CHECK_KEY);
    console.log('🧹 Flags de verificação da antecipação limpas');
  }
}

/**
 * Trigger para verificação imediata da antecipação
 * Deve ser chamado quando há suspeita de que o status mudou
 */
export function triggerAntecipacaoVerification() {
  forceAntecipacaoCheck();
  
  // Disparar evento customizado para componentes que escutam
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('antecipacaoStatusChanged', {
      detail: { timestamp: Date.now() }
    });
    window.dispatchEvent(event);
    console.log('🚀 Evento de verificação da antecipação disparado');
  }
}
