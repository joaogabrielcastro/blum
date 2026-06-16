const CACHE_NAME = "blum-static-v4";

const PRECACHE_URLS = [
  "/images/icon-192x192.png",
  "/images/icon-512x512.png",
];

function shouldBypassCache(url) {
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname === "/" || url.pathname.endsWith(".html")) return true;
  if (url.pathname === "/service-worker.js" || url.pathname === "/manifest.json") {
    return true;
  }
  if (url.pathname.startsWith("/static/")) return true;
  if (url.pathname.endsWith(".js") || url.pathname.endsWith(".css")) return true;
  return false;
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (shouldBypassCache(url)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }),
  );
});
