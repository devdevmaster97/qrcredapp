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
 * Extrai o signer_token da URL do ZapSign
 * Exemplo: https://app.zapsign.com.br/verificar/92b36ec9-a449-4574-8ff0-5cc2c5ab7
 * Retorna: 92b36ec9-a449-4574-8ff0-5cc2c5ab7
 */
export function extrairSignerTokenDaUrl(url: string): string | undefined {
  try {
    // Remover espaços e quebras de linha
    const urlLimpa = url.trim();
    
    // Padrão regex para capturar o token após "/verificar/"
    const regex = /\/verificar\/([a-zA-Z0-9\-]+)/;
    const match = urlLimpa.match(regex);
    
    if (match && match[1]) {
      console.log('✅ Signer token extraído:', match[1]);
      return match[1];
    }
    
    console.log('❌ Não foi possível extrair signer_token da URL:', urlLimpa);
    return undefined;
  } catch (error) {
    console.error('❌ Erro ao extrair signer_token:', error);
    return undefined;
  }
}

/**
 * Verifica se uma URL é válida do ZapSign
 */
export function isUrlZapSignValida(url: string): boolean {
  try {
    const urlLimpa = url.trim();
    return urlLimpa.includes('zapsign.com.br/verificar/') && extrairSignerTokenDaUrl(urlLimpa) !== undefined;
  } catch {
    return false;
  }
}

/**
 * Verifica o status da assinatura digital via token do signatário
 * Usa a nova API que consulta diretamente pelo signer_token
 */
export async function verificarStatusAssinatura(signerToken?: string): Promise<boolean> {
  try {
    console.log('🔍 Verificando status da assinatura digital...');
    
    let tokenParaUsar = signerToken;
    
    // Se não foi fornecido token, tentar extrair da URL padrão
    if (!tokenParaUsar) {
      // Usar o token padrão da URL do ZapSign
      tokenParaUsar = extrairSignerTokenDaUrl(ZAPSIGN_URL);
      
      if (!tokenParaUsar) {
        console.log('⚠️ Signer token não fornecido e não foi possível extrair da URL padrão.');
        return false;
      }
    }

    console.log('📞 Chamando API de verificação de assinatura com token:', tokenParaUsar);
    
    // Chamar nossa API local
    const response = await fetch('/api/verificar-assinatura-zapsign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ signer_token: tokenParaUsar })
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

    if (response.ok && data.status === 'ok' && data.assinado === true) {
      console.log('✅ Assinatura digital completa!', data.signatario);
      
      // Marcar como completa no localStorage
      marcarAssinaturaCompleta();
      
      return true;
    } else if (data.status === 'pendente') {
      console.log(`⏳ Assinatura pendente. Status: ${data.signatario?.status}`);
      return false;
    } else if (data.status === 'nao_encontrado') {
      console.log('❌ Token do signatário não encontrado');
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
 * Verifica assinatura usando URL completa do ZapSign
 */
export async function verificarAssinaturaPorUrl(urlZapSign: string): Promise<boolean> {
  const signerToken = extrairSignerTokenDaUrl(urlZapSign);
  
  if (!signerToken) {
    console.error('❌ Não foi possível extrair signer_token da URL:', urlZapSign);
    return false;
  }
  
  return verificarStatusAssinatura(signerToken);
}

/**
 * Obtém informações do usuário para verificação de assinatura
 */
export function obterInfoUsuarioAssinatura() {
  if (typeof window === 'undefined') return undefined;
  
  try {
    const storedUser = localStorage.getItem('qrcred_user');
    if (!storedUser) return undefined;
    
    const userData = JSON.parse(storedUser);
    
    return {
      nome: userData.nome || '',
      cpf: userData.cpf || userData.documento || '',
      cartao: userData.cartao || '',
      empresa: userData.nome_divisao || ''
    };
  } catch (error) {
    console.error('Erro ao obter informações do usuário:', error);
    return undefined;
  }
}

/**
 * Obtém detalhes completos do signatário via API
 */
export async function obterDetalhesSignatario(signerToken: string) {
  try {
    const response = await fetch('/api/verificar-assinatura-zapsign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ signer_token: signerToken })
    });

    const data = await response.json();
    
    if (response.ok && data.signatario) {
      return data.signatario;
    }
    
    return undefined;
  } catch (error) {
    console.error('Erro ao obter detalhes do signatário:', error);
    return undefined;
  }
}

/**
 * URL do ZapSign para verificação de assinatura
 * O signer_token será extraído automaticamente desta URL
 */
export const ZAPSIGN_URL = 'https://app.zapsign.com.br/verificar/doc/b4ab32f3-d964-4fae-b9d2-01c05f2f4258'; 