/**
 * Só em `npm start`: encaminha /api/* para o backend local.
 * Com REACT_APP_API_URL=/api/v2 no .env, o telefone na rede pode abrir http://<IP>:3000
 * e o browser fala com o mesmo host (sem localhost:3011 no celular).
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
    }),
  );
};
