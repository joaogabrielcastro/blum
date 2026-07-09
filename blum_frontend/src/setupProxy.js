/**
 * Só em `npm start`: encaminha /api/* para o backend local.
 * Com REACT_APP_API_URL=/api/v2 no .env, o telefone na rede pode abrir http://<IP>:3000
 * e o browser fala com o mesmo host (sem localhost:3011 no celular).
 *
 * Requer API em :3011 — na raiz: `docker compose up -d` ou `cd blum_backend && npm run dev`.
 */
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function setupProxy(app) {
  const target =
    process.env.REACT_APP_DEV_PROXY_TARGET || "http://127.0.0.1:3011";

  app.use(
    "/api",
    createProxyMiddleware({
      target,
      changeOrigin: true,
      proxyTimeout: 15_000,
      timeout: 15_000,
      onError(err, _req, res) {
        if (res.headersSent) return;
        const hint =
          "Suba a API em :3011 (docker compose up -d na raiz ou npm run dev em blum_backend).";
        res.writeHead(504, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: `Backend indisponível em ${target}. ${hint}`,
          }),
        );
      },
    }),
  );
};
