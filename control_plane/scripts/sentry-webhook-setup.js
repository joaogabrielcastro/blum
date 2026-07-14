/**
 * Gera a URL do webhook Sentry + testa ingest local.
 *
 * Uso (Control Plane precisa estar em :3020):
 *   cd control_plane
 *   npm run sentry:webhook
 *
 * Depois:
 *   1) Copie a URL impressa
 *   2) Cole no Sentry (Internal Integration)
 *   3) Se o Control Plane só estiver no PC, rode um túnel (cloudflared/ngrok)
 *      e troque localhost pelo host HTTPS do túnel.
 */
const ADMIN =
  process.env.CONTROL_PLANE_ADMIN_TOKEN || "dev-admin-token-change-me";
const BASE = (
  process.env.CONTROL_PLANE_PUBLIC_URL || "http://localhost:3020"
).replace(/\/+$/, "");
const SLUG = process.env.SEED_PROJECT_SLUG || "blum";

async function main() {
  console.log("");
  console.log("=== Webhook Sentry → Control Plane ===");
  console.log(`Painel/API: ${BASE}`);
  console.log(`Projeto:    ${SLUG}`);
  console.log("");

  const rotate = await fetch(`${BASE}/api/v1/projects/${SLUG}/rotate-token`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ADMIN}` },
  });
  const body = await rotate.json().catch(() => ({}));
  if (!rotate.ok) {
    throw new Error(body.error || `rotate-token HTTP ${rotate.status}`);
  }

  const token = body.ingestToken;
  if (!token) throw new Error("Resposta sem ingestToken");

  const path = `/api/v1/ingest/${SLUG}/sentry?token=${token}`;
  const localUrl = `http://localhost:3020${path}`;
  const publicUrl = `${BASE}${path}`;

  console.log("1) Guarde este token (não aparece de novo):");
  console.log(`   ${token}`);
  console.log("");
  console.log("2) URL para colar no Sentry (Webhook URL):");
  if (BASE.includes("localhost")) {
    console.log(`   ${localUrl}`);
    console.log("");
    console.log("   ⚠ Sentry NA NUVEM não alcança localhost.");
    console.log("   Opções:");
    console.log("   a) Hospedar Control Plane no Coolify e use a URL pública");
    console.log("   b) Túnel local, ex:");
    console.log("      cloudflared tunnel --url http://localhost:3020");
    console.log("      Depois troque http://localhost:3020 pelo https://....trycloudflare.com");
    console.log(`      Exemplo: https://xxxxx.trycloudflare.com${path}`);
  } else {
    console.log(`   ${publicUrl}`);
  }

  console.log("");
  console.log("3) No Sentry.io:");
  console.log("   Settings → Developer Settings → Custom Integrations");
  console.log("   → Create New Integration → Internal Integration");
  console.log("   Name: Blum Control Plane");
  console.log("   Webhook URL: (cole a URL acima)");
  console.log("   Permissions: Issue & Event = Read");
  console.log("   Webhooks: marque issue  (e error, se aparecer)");
  console.log("   Save Changes");
  console.log("");
  console.log("4) Teste ingest local (sem Sentry):");

  const smoke = await fetch(
    `http://localhost:3020/api/v1/ingest/${SLUG}/sentry?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Webhook setup smoke",
        message: "local ingest test",
        exceptionType: "Error",
        culprit: "/api/v2/status",
        severity: "error",
        environment: "development",
      }),
    },
  );
  const smokeBody = await smoke.json().catch(() => ({}));
  if (!smoke.ok) {
    console.log("   Falhou:", smokeBody.error || smoke.status);
  } else {
    console.log(
      "   OK — incidente:",
      smokeBody.incidentId || smokeBody.incident?.id || "(queued)",
    );
    console.log("   Abra http://localhost:3020 e atualize a lista.");
  }
  console.log("");
}

main().catch((err) => {
  console.error("Erro:", err.message);
  console.error("O Control Plane está rodando em :3020?");
  process.exit(1);
});
