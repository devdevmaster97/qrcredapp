const CACHE_VERSION = 'v1.0.4';
const CACHE_NAME = `qrcred-cache-${CACHE_VERSION}`;
const CACHE_TIMESTAMP = Date.now();
const urlsToCache = [
  '/',
  '/index.html',
  '/dashboard',
  '/convenio/dashboard',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/workbox-4754cb34.js',
  '/sw.js',
  '/next.svg',
  '/vercel.svg',
  '/file.svg',
  '/globe.svg',
  '/window.svg',
  '/offline.html'
];
// atualizado
// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log(`[Service Worker] Instalando nova versão ${CACHE_VERSION}`);
  
  // Ativa o service worker imediatamente sem esperar que o anterior termine
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[Service Worker] Erro ao adicionar ao cache:', error);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log(`[Service Worker] Ativando nova versão ${CACHE_VERSION}`);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('qrcred-cache-') && cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Assume o controle imediatamente
      return self.clients.claim();
    }).then(() => {
      // Após ativação, notifica todos os clientes sobre a atualização
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'UPDATE_AVAILABLE',
            version: CACHE_VERSION,
            timestamp: CACHE_TIMESTAMP
          });
        });
      });
    })
  );
});

// Função para verificar atualizações
const checkForUpdates = async () => {
  try {
    // Verificar se já notificou sobre esta versão recentemente
    const lastNotificationTime = self.lastUpdateNotification || 0;
    const now = Date.now();
    
    // Evita notificações duplicadas em curto período de tempo (5 minutos)
    if (now - lastNotificationTime < 5 * 60 * 1000) {
      console.log('[Service Worker] Ignorando verificação, notificação recente enviada');
      return;
    }
    
    // Adiciona um timestamp para evitar cache
    const response = await fetch('/version.json?t=' + now, { 
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Se a versão atual for diferente da versão no arquivo
      if (data.version !== CACHE_VERSION || data.timestamp > CACHE_TIMESTAMP) {
        console.log('[Service Worker] Nova versão disponível:', data.version);
        
        // Armazena que notificou sobre esta versão
        self.lastUpdateNotification = now;
        self.lastNotifiedVersion = data.version;
        
        // Envia apenas uma mensagem para o cliente principal (evita duplicatas)
        const clients = await self.clients.matchAll();
        if (clients.length > 0) {
          // Enviar apenas para o cliente mais recente
          clients[0].postMessage({
            type: 'UPDATE_AVAILABLE',
            version: data.version,
            notes: data.notes || 'Nova versão disponível!'
          });
          
          console.log('[Service Worker] Notificação enviada para o cliente');
        }
        
        // Força o service worker a atualizar
        self.registration.update();
      }
    }
  } catch (error) {
    console.error('[Service Worker] Erro ao verificar atualizações:', error);
  }
};

// Escuta mensagens dos clientes
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Mensagem recebida:', event.data);
  
  if (event.data && event.data.type === 'CHECK_UPDATES') {
    checkForUpdates();
  }
});

// Configura verificação periódica
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-updates') {
    event.waitUntil(checkForUpdates());
  }
});

// Implementa verificação regular (a cada 30 minutos)
setInterval(checkForUpdates, 30 * 60 * 1000);

// Fetch event - estratégia de cache para navegação e recursos
self.addEventListener('fetch', (event) => {
  // Ignorar solicitações para outros domínios
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Ignorar solicitações POST, PUT, DELETE, etc., pois não podem ser armazenadas em cache
  if (event.request.method !== 'GET') {
    return fetch(event.request);
  }

  // Verifique se é uma solicitação de navegação
  if (event.request.mode === 'navigate') {
    event.respondWith(
      // Primeiro tenta rede
      fetch(event.request)
        .then((networkResponse) => {
          // Se a resposta for bem-sucedida, armazena em cache
          if (networkResponse.ok) {
            const clonedResponse = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clonedResponse);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          console.log('[Service Worker] Falha de rede, usando cache ou fallback');
          
          // Tentar obter do cache
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Fallback para página principal
          const fallbackResponse = await caches.match('/');
          if (fallbackResponse) {
            return fallbackResponse;
          }
          
          // Ou para página offline se existir
          return caches.match('/offline.html') || new Response('Você está offline e o recurso não está em cache.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        })
    );
    
    // Após uma navegação, verificar por atualizações
    event.waitUntil(checkForUpdates());
    return;
  }
  
  // Para outros recursos (imagens, scripts, etc.), use cache-first
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          // Retorna do cache se disponível
          return response;
        }
        
        // Caso contrário, busca na rede
        return fetch(event.request).then((networkResponse) => {
          // Armazena em cache para uso futuro
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((error) => {
          console.error('[Service Worker] Erro ao buscar recurso:', error);
          
          // Para solicitações de imagem, retorne uma imagem de fallback
          if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
            return caches.match('/logo192.png');
          }
          
          // Para outros recursos, retorne um erro
          return new Response('Recurso não disponível offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

// Evento de sincronização em segundo plano
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-updates') {
    event.waitUntil(checkForUpdates());
  }
});

// Evento de notificação push
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  // Mostra notificação push
  const options = {
    body: data.body || 'Nova notificação disponível',
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'QR Cred App', options)
  );
});

// Manipula cliques em notificações
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Verifica se já existe uma janela/aba aberta
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Caso contrário, abre uma nova
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
}); 