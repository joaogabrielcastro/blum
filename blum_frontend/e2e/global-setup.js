/**
 * Garante que a API está acessível antes dos testes E2E.
 * Requer backend em :3011 (docker compose up -d ou npm run dev em blum_backend).
 */
async function globalSetup() {
  const apiBase =
    process.env.E2E_API_URL || "http://127.0.0.1:3011";
  const healthUrl = `${apiBase.replace(/\/$/, "")}/health`;
  const maxAttempts = 30;
  const delayMs = 1000;

  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetch(healthUrl);
      if (res.ok) {
        return;
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(
    `Backend indisponível em ${healthUrl} após ${maxAttempts}s. ` +
      "Suba a API: `docker compose up -d` na raiz ou `npm run dev` em blum_backend.",
    { cause: lastError },
  );
}

module.exports = globalSetup;
