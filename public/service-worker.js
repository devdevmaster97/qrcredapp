const CACHE_VERSION = 'v1.0.2';
const CACHE_NAME = `qrcred-${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/browserconfig.xml',
  '/robots.txt',
  '/workbox-4754cb34.js',
  '/sw.js',
  '/next.svg',
  '/vercel.svg',
  '/file.svg',
  '/globe.svg',
  '/window.svg'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Remove caches antigos quando houver uma nova versão
          if (cacheName.startsWith('qrcred-') && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Notifica todos os clientes sobre a atualização
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'UPDATE_AVAILABLE',
            version: CACHE_VERSION
          });
        });
      });
    })
  );
  self.clients.claim();
});

// Interceptação de requisições - Modificado para strategy: network-first, fallback para cache
self.addEventListener('fetch', (event) => {
  // Para navegação (HTML), sempre tente rede primeiro, depois cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request)
            .then(response => {
              if (response) {
                return response;
              }
              // Se não tiver no cache, tente a página inicial como fallback
              return caches.match('/');
            });
        })
    );
    return;
  }

  // Para outros recursos, use cache primeiro com fallback para rede (assets estáticos)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - retorna a resposta do cache
        if (response) {
          return response;
        }

        // Clone da requisição
        const fetchRequest = event.request.clone();

        // Faz a requisição para a rede
        return fetch(fetchRequest)
          .then(response => {
            // Verifica se recebemos uma resposta válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clona a resposta
            const responseToCache = response.clone();

            // Adiciona a resposta ao cache
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(error => {
            console.error('Fetch falhou:', error);
            throw error;
          });
      })
  );
});

// Sincronização em background
self.addEventListener('sync', (event) => {
  if (event.tag === 'syncData') {
    event.waitUntil(syncData());
  }
});

// Notificações push
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification('QRCred', {
        body: data.message,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        data: data.url,
        tag: data.tag,
        actions: [
          {
            action: 'explore',
            title: 'Ver mais'
          }
        ]
      })
    );
  }
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  }
}); 