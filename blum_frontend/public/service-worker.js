const CACHE_NAME = 'blum-cache-v2';

self.addEventListener('install', event => {
  console.log('Service Worker: Instalação');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker: Ativação');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Limpando cache antigo');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Se a requisição for bem-sucedida, armazene a resposta no cache e a retorne.
        const resClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, resClone);
        });
        return response;
      })
      .catch(() => {
        // Em caso de falha na rede, tente encontrar a requisição no cache.
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Se não houver nada no cache, responda com um erro de rede.
          return new Response(null, { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});