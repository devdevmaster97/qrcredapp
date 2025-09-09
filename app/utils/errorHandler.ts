// Utilitário para tratamento de erros específicos do navegador Chrome
// Criado para resolver o erro "Application error: a client-side exception has occurred"

interface ErrorInfo {
  message: string;
  stack?: string;
  userAgent: string;
  timestamp: string;
  url: string;
  lineNumber?: number;
  columnNumber?: number;
}

interface BrowserInfo {
  isChrome: boolean;
  isMobile: boolean;
  version: string;
  platform: string;
  cookieEnabled: boolean;
  onLine: boolean;
}

class ChromeErrorHandler {
  private static instance: ChromeErrorHandler;
  private errorLog: ErrorInfo[] = [];

  private constructor() {
    this.setupGlobalErrorHandlers();
  }

  public static getInstance(): ChromeErrorHandler {
    if (!ChromeErrorHandler.instance) {
      ChromeErrorHandler.instance = new ChromeErrorHandler();
    }
    return ChromeErrorHandler.instance;
  }

  // Configurar handlers globais de erro
  private setupGlobalErrorHandlers(): void {
    // Handler para erros JavaScript não capturados
    window.addEventListener('error', (event) => {
      console.error('🚨 [ERROR HANDLER] Erro JavaScript capturado:', event);
      this.logError({
        message: event.message || 'Erro JavaScript desconhecido',
        stack: event.error?.stack,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        url: event.filename || window.location.href,
        lineNumber: event.lineno,
        columnNumber: event.colno
      });
    });

    // Handler para promises rejeitadas não capturadas
    window.addEventListener('unhandledrejection', (event) => {
      console.error('🚨 [ERROR HANDLER] Promise rejeitada não capturada:', event);
      this.logError({
        message: `Promise rejeitada: ${event.reason}`,
        stack: event.reason?.stack,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
    });
  }

  // Registrar erro no log
  private logError(errorInfo: ErrorInfo): void {
    this.errorLog.push(errorInfo);
    
    // Manter apenas os últimos 10 erros
    if (this.errorLog.length > 10) {
      this.errorLog = this.errorLog.slice(-10);
    }

    // Salvar no localStorage para análise posterior
    try {
      localStorage.setItem('chromeErrorLog', JSON.stringify(this.errorLog));
    } catch (e) {
      console.warn('⚠️ [ERROR HANDLER] Não foi possível salvar log de erros no localStorage');
    }
  }

  // Obter informações do navegador
  public getBrowserInfo(): BrowserInfo {
    const userAgent = navigator.userAgent.toLowerCase();
    
    return {
      isChrome: /chrome/.test(userAgent) && !/edge|edg/.test(userAgent),
      isMobile: /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent),
      version: this.extractChromeVersion(userAgent),
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  }

  // Extrair versão do Chrome
  private extractChromeVersion(userAgent: string): string {
    const match = userAgent.match(/chrome\/(\d+\.\d+\.\d+\.\d+)/);
    return match ? match[1] : 'desconhecida';
  }

  // Verificar se há problemas conhecidos do Chrome
  public checkChromeIssues(): string[] {
    const issues: string[] = [];
    const browserInfo = this.getBrowserInfo();

    if (!browserInfo.isChrome) {
      return issues;
    }

    // Verificar se cookies estão habilitados
    if (!browserInfo.cookieEnabled) {
      issues.push('Cookies desabilitados - pode causar problemas com localStorage');
    }

    // Verificar se está offline
    if (!browserInfo.onLine) {
      issues.push('Navegador offline - APIs podem falhar');
    }

    // Verificar versões problemáticas do Chrome
    const version = parseInt(browserInfo.version.split('.')[0]);
    if (version < 90) {
      issues.push('Versão antiga do Chrome - pode ter problemas de compatibilidade');
    }

    return issues;
  }

  // Executar diagnóstico completo
  public runDiagnostics(): void {
    console.log('🔧 [DIAGNOSTICS] Iniciando diagnóstico do Chrome...');
    
    const browserInfo = this.getBrowserInfo();
    console.log('🔧 [DIAGNOSTICS] Informações do navegador:', browserInfo);
    
    const issues = this.checkChromeIssues();
    if (issues.length > 0) {
      console.warn('⚠️ [DIAGNOSTICS] Problemas detectados:', issues);
    } else {
      console.log('✅ [DIAGNOSTICS] Nenhum problema conhecido detectado');
    }

    // Testar localStorage
    try {
      const testKey = 'chrome_test_' + Date.now();
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      console.log('✅ [DIAGNOSTICS] localStorage funcionando corretamente');
    } catch (e) {
      console.error('❌ [DIAGNOSTICS] Problema com localStorage:', e);
    }

    // Testar sessionStorage
    try {
      const testKey = 'chrome_session_test_' + Date.now();
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      console.log('✅ [DIAGNOSTICS] sessionStorage funcionando corretamente');
    } catch (e) {
      console.error('❌ [DIAGNOSTICS] Problema com sessionStorage:', e);
    }

    // Testar JSON.parse/stringify
    try {
      const testObj = { test: 'value', number: 123, array: [1, 2, 3] };
      const jsonString = JSON.stringify(testObj);
      const parsedObj = JSON.parse(jsonString);
      console.log('✅ [DIAGNOSTICS] JSON.parse/stringify funcionando corretamente');
    } catch (e) {
      console.error('❌ [DIAGNOSTICS] Problema com JSON:', e);
    }

    console.log('🔧 [DIAGNOSTICS] Diagnóstico concluído');
  }

  // Obter log de erros
  public getErrorLog(): ErrorInfo[] {
    return [...this.errorLog];
  }

  // Limpar log de erros
  public clearErrorLog(): void {
    this.errorLog = [];
    try {
      localStorage.removeItem('chromeErrorLog');
    } catch (e) {
      console.warn('⚠️ [ERROR HANDLER] Não foi possível limpar log de erros do localStorage');
    }
  }

  // Wrapper seguro para operações que podem falhar
  public safeExecute<T>(
    operation: () => T,
    fallback: T,
    operationName: string = 'operação desconhecida'
  ): T {
    try {
      console.log(`🔧 [SAFE EXECUTE] Executando: ${operationName}`);
      const result = operation();
      console.log(`✅ [SAFE EXECUTE] Sucesso: ${operationName}`);
      return result;
    } catch (error) {
      console.error(`❌ [SAFE EXECUTE] Erro em ${operationName}:`, error);
      this.logError({
        message: `Erro em ${operationName}: ${error}`,
        stack: error instanceof Error ? error.stack : undefined,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
      return fallback;
    }
  }

  // Wrapper seguro para operações assíncronas
  public async safeExecuteAsync<T>(
    operation: () => Promise<T>,
    fallback: T,
    operationName: string = 'operação assíncrona desconhecida'
  ): Promise<T> {
    try {
      console.log(`🔧 [SAFE EXECUTE ASYNC] Executando: ${operationName}`);
      const result = await operation();
      console.log(`✅ [SAFE EXECUTE ASYNC] Sucesso: ${operationName}`);
      return result;
    } catch (error) {
      console.error(`❌ [SAFE EXECUTE ASYNC] Erro em ${operationName}:`, error);
      this.logError({
        message: `Erro assíncrono em ${operationName}: ${error}`,
        stack: error instanceof Error ? error.stack : undefined,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
      return fallback;
    }
  }
}

// Exportar instância singleton
export const chromeErrorHandler = ChromeErrorHandler.getInstance();

// Exportar função para inicializar o handler
export const initializeErrorHandler = (): void => {
  console.log('🔧 [ERROR HANDLER] Inicializando sistema de tratamento de erros...');
  chromeErrorHandler.runDiagnostics();
};

// Exportar tipos para uso externo
export type { ErrorInfo, BrowserInfo };
