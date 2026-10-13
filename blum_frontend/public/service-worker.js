// Alterar a versão em releases que mudam regras de exibição força a remoção
// do bundle anterior em instalações PWA/offline.
const CACHE_NAME = "blum-static-v7-empty-responses";

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/images/icon-192x192.png",
  "/images/icon-512x512.png",
  "/manifest.json",
];

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/static/") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".css") ||
    pathname.startsWith("/images/")
  );
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
  if (url.pathname.startsWith("/api/")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put("/index.html", clone);
            });
          }
          return response;
        })
        .catch(() =>
          caches.match("/index.html").then(
            (cached) => cached || caches.match("/"),
          ),
        ),
    );
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, clone);
              });
            }
            return response;
          }),
      ),
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      return cached || new Response("Recurso indisponível offline", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }),
  );
});
