/**
 * Utilitários para gerenciar notificações e verificações de adesão à antecipação
 * Similar ao sascredNotifications.ts mas específico para antecipação
 */

// Chaves do localStorage
const FORCE_CHECK_KEY = 'antecipacao_adesao_force_check';
const LAST_CHECK_KEY = 'antecipacao_adesao_last_check';
const POSSIBLE_SIGNATURE_KEY = 'antecipacao_possible_signature';
const ACCELERATED_CHECKING_KEY = 'antecipacao_accelerated_checking';

/**
 * Marca que uma verificação forçada de adesão à antecipação deve ser feita
 */
export function forceAntecipacaoAdesaoCheck(): void {
  localStorage.setItem(FORCE_CHECK_KEY, Date.now().toString());
  console.log('🔔 Antecipação: Marcada verificação forçada de adesão');
  
  // Disparar evento customizado para hooks que estão escutando
  window.dispatchEvent(new CustomEvent('forceAntecipacaoAdesaoCheck'));
}

/**
 * Verifica se deve forçar uma verificação de adesão à antecipação
 */
export function shouldForceAntecipacaoAdesaoCheck(): boolean {
  const forceCheck = localStorage.getItem(FORCE_CHECK_KEY);
  const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
  
  if (!forceCheck) return false;
  
  const forceTime = parseInt(forceCheck);
  const lastTime = lastCheck ? parseInt(lastCheck) : 0;
  
  // Se o force é mais recente que a última verificação
  return forceTime > lastTime;
}

/**
 * Marca que uma verificação de adesão à antecipação foi realizada
 */
export function markAntecipacaoAdesaoChecked(): void {
  const now = Date.now().toString();
  localStorage.setItem(LAST_CHECK_KEY, now);
  
  // Limpar flag de verificação forçada se existir
  const forceCheck = localStorage.getItem(FORCE_CHECK_KEY);
  if (forceCheck) {
    localStorage.removeItem(FORCE_CHECK_KEY);
    console.log('🧹 Antecipação: Limpou flag de verificação forçada');
  }
}

/**
 * Marca que o usuário pode ter assinado o contrato de antecipação (para polling acelerado)
 */
export function markPossibleAntecipacaoSignature(): void {
  localStorage.setItem(POSSIBLE_SIGNATURE_KEY, Date.now().toString());
  console.log('✍️ Antecipação: Marcada possível assinatura digital');
}

/**
 * Verifica se há uma possível assinatura de antecipação pendente
 */
export function hasPendingAntecipacaoSignatureCheck(): boolean {
  const possibleSignature = localStorage.getItem(POSSIBLE_SIGNATURE_KEY);
  if (!possibleSignature) return false;
  
  const signatureTime = parseInt(possibleSignature);
  const now = Date.now();
  
  // Considerar pendente se foi marcada há menos de 10 minutos
  return (now - signatureTime) < (10 * 60 * 1000);
}

/**
 * Limpa a marcação de possível assinatura de antecipação
 */
export function clearPossibleAntecipacaoSignature(): void {
  localStorage.removeItem(POSSIBLE_SIGNATURE_KEY);
  console.log('🧹 Antecipação: Limpou marcação de possível assinatura');
}

/**
 * Inicia verificação acelerada para detectar assinatura de antecipação
 */
export function startAcceleratedAntecipacaoChecking(): void {
  localStorage.setItem(ACCELERATED_CHECKING_KEY, Date.now().toString());
  console.log('⚡ Antecipação: Iniciada verificação acelerada');
  
  // Disparar verificações mais frequentes
  const checkInterval = setInterval(() => {
    const startTime = localStorage.getItem(ACCELERATED_CHECKING_KEY);
    if (!startTime) {
      clearInterval(checkInterval);
      return;
    }
    
    const elapsed = Date.now() - parseInt(startTime);
    
    // Parar após 5 minutos de verificação acelerada
    if (elapsed > 5 * 60 * 1000) {
      localStorage.removeItem(ACCELERATED_CHECKING_KEY);
      clearInterval(checkInterval);
      console.log('⏰ Antecipação: Verificação acelerada finalizada por timeout');
      return;
    }
    
    // Disparar verificação
    forceAntecipacaoAdesaoCheck();
    
  }, 3000); // Verificar a cada 3 segundos durante o período acelerado
}

/**
 * Para a verificação acelerada de antecipação
 */
export function stopAcceleratedAntecipacaoChecking(): void {
  localStorage.removeItem(ACCELERATED_CHECKING_KEY);
  console.log('🛑 Antecipação: Verificação acelerada interrompida');
}

/**
 * Dispara uma verificação de adesão à antecipação
 */
export function triggerAntecipacaoAdesaoVerification(): void {
  console.log('🎯 Antecipação: Disparando verificação de adesão');
  forceAntecipacaoAdesaoCheck();
  
  // Também disparar evento para componentes que estão escutando
  window.dispatchEvent(new CustomEvent('antecipacaoAdesaoStatusChanged'));
}

/**
 * Limpa todos os dados de verificação de adesão à antecipação
 */
export function clearAllAntecipacaoAdesaoData(): void {
  localStorage.removeItem(FORCE_CHECK_KEY);
  localStorage.removeItem(LAST_CHECK_KEY);
  localStorage.removeItem(POSSIBLE_SIGNATURE_KEY);
  localStorage.removeItem(ACCELERATED_CHECKING_KEY);
  console.log('🧹 Antecipação: Todos os dados de verificação foram limpos');
}

/**
 * Debug: mostra o estado atual das verificações de antecipação
 */
export function debugAntecipacaoAdesaoState(): void {
  console.log('🔍 Antecipação - Estado atual das verificações:', {
    forceCheck: localStorage.getItem(FORCE_CHECK_KEY),
    lastCheck: localStorage.getItem(LAST_CHECK_KEY),
    possibleSignature: localStorage.getItem(POSSIBLE_SIGNATURE_KEY),
    acceleratedChecking: localStorage.getItem(ACCELERATED_CHECKING_KEY),
    shouldForce: shouldForceAntecipacaoAdesaoCheck(),
    hasPending: hasPendingAntecipacaoSignatureCheck()
  });
}
