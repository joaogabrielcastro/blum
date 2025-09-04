const CACHE_NAME = "blum-cache-v2";

self.addEventListener("install", (event) => {
  console.log("Service Worker: Instalação");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker: Ativação");
  // Remove caches antigos
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Service Worker: Limpando cache antigo");
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  // Estratégia de cache: Network First (primeiro a rede) para arquivos críticos
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a requisição for bem-sucedida, clone e armazene no cache
        const resClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, resClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request)) // Em caso de falha na rede, use o cache
  );
});
