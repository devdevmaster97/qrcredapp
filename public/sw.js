importScripts('/workbox-4754cb34.js');

workbox.routing.registerRoute(
  ({request}) => request.mode === 'navigate',
  new workbox.strategies.NetworkFirst({
    cacheName: 'pages-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
      }),
    ],
    networkTimeoutSeconds: 5, // Timeout para fallback para o cache
  })
);

// Cache para recursos estáticos (JS, CSS, imagens)
workbox.routing.registerRoute(
  /\.(?:js|css|png|jpg|jpeg|svg|gif|ico|webp)$/,
  new workbox.strategies.CacheFirst({
    cacheName: 'assets-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
      }),
    ],
  })
);

// Cache para API (chamadas de dados dinâmicos, com atualização frequente)
// EXCETO antecipação que precisa sempre ir para o servidor para controle de duplicação
workbox.routing.registerRoute(
  /\/api\/(?!antecipacao).*$/,  // ← EXCLUI /api/antecipacao/* do cache
  new workbox.strategies.NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 1 dia
      }),
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Rota específica para antecipação - SEMPRE usar rede, NUNCA cache
workbox.routing.registerRoute(
  /\/api\/antecipacao\/.*$/,
  new workbox.strategies.NetworkOnly({
    networkTimeoutSeconds: 30,
  })
);

// Se alguma rota não for especificamente tratada, cache como fallback
workbox.routing.setCatchHandler(({event}) => {
  if (event.request.destination === 'document') {
    return caches.match('/');
  }
  return Response.error();
});

// Tratamento específico para navegação no aplicativo
self.addEventListener('fetch', event => {
  // Não interfere com as navegações tratadas pelo workbox
  if (workbox.routing.findMatchingRoute(event.request)) {
    return;
  }
  
  // Tratamento adicional para requests de navegação não manipuladas pelo workbox
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/') || caches.match(event.request);
      })
    );
  }
});
