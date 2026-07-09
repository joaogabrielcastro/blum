/**
 * Configura produtos, preços e (opcionalmente) webhook no Stripe para o Blum.
 *
 * Uso:
 *   1. Coloque STRIPE_SECRET_KEY no blum_backend/.env
 *   2. npm run stripe:setup
 *
 * Opcional no .env:
 *   STRIPE_WEBHOOK_URL=https://api-blum.jwsoftware.com.br/api/v2/billing/webhook
 *   STRIPE_SETUP_CURRENCY=brl
 *   STRIPE_PRICE_STARTER_AMOUNT=9900   (centavos, ex: R$ 99,00)
 *   STRIPE_PRICE_PROFESSIONAL_AMOUNT=19900
 *   STRIPE_PRICE_ENTERPRISE_AMOUNT=39900
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const Stripe = require("stripe");
const { PLAN_DEFINITIONS } = require("../src/config/plans");

const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.finalized",
  "invoice.payment_action_required",
];

const DEFAULT_AMOUNTS = {
  STRIPE_PRICE_STARTER: 9900,
  STRIPE_PRICE_PROFESSIONAL: 19900,
  STRIPE_PRICE_ENTERPRISE: 39900,
};

function getSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY || process.argv.find((a) => a.startsWith("sk_"));
  if (!key || !String(key).startsWith("sk_")) {
    console.error(`
❌ STRIPE_SECRET_KEY não encontrada.

1. Acesse https://dashboard.stripe.com/test/apikeys
2. Copie a "Secret key" (sk_test_...)
3. Crie o arquivo blum_backend/.env com:

   STRIPE_SECRET_KEY=sk_test_sua_chave_aqui
   FRONTEND_URL=http://localhost:3000
   BILLING_ENFORCE=false

4. Execute novamente: npm run stripe:setup
`);
    process.exit(1);
  }
  return key;
}

async function findProductByPlanSlug(stripe, planSlug) {
  const products = await stripe.products.list({ limit: 100, active: true });
  return (
    products.data.find((p) => p.metadata?.blum_plan_slug === planSlug) || null
  );
}

async function findActivePriceForProduct(stripe, productId) {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 20,
  });
  return (
    prices.data.find(
      (p) => p.type === "recurring" && p.recurring?.interval === "month",
    ) || prices.data[0] || null
  );
}

async function ensurePlan(stripe, plan, currency) {
  const amountEnv = process.env[`${plan.envPriceKey}_AMOUNT`];
  const amount =
    parseInt(amountEnv, 10) ||
    DEFAULT_AMOUNTS[plan.envPriceKey] ||
    9900;

  const existingPriceId = process.env[plan.envPriceKey];
  if (existingPriceId && existingPriceId.startsWith("price_")) {
    try {
      const price = await stripe.prices.retrieve(existingPriceId);
      if (price.active) {
        console.log(`✓ ${plan.name}: price já configurado (${existingPriceId})`);
        return { envKey: plan.envPriceKey, priceId: existingPriceId };
      }
    } catch {
      /* recria abaixo */
    }
  }

  let product = await findProductByPlanSlug(stripe, plan.slug);
  if (!product) {
    product = await stripe.products.create({
      name: `Blum — ${plan.name}`,
      description: plan.description,
      metadata: { blum_plan_slug: plan.slug, app: "blum" },
    });
    console.log(`+ Produto criado: ${product.name} (${product.id})`);
  } else {
    console.log(`✓ Produto existente: ${product.name} (${product.id})`);
  }

  let price = await findActivePriceForProduct(stripe, product.id);
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      currency,
      unit_amount: amount,
      recurring: { interval: "month" },
      metadata: { blum_plan_slug: plan.slug, app: "blum" },
    });
    const formatted = (amount / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: currency.toUpperCase(),
    });
    console.log(`+ Preço criado: ${formatted}/mês (${price.id})`);
  } else {
    console.log(`✓ Preço existente: ${price.id}`);
  }

  return { envKey: plan.envPriceKey, priceId: price.id };
}

function isWebhookSigningSecret(value) {
  return typeof value === "string" && value.startsWith("whsec_");
}

function readWebhookSecretFromEnv() {
  const secret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  return isWebhookSigningSecret(secret) ? secret : null;
}

async function syncWebhookEvents(stripe, endpointId) {
  await stripe.webhookEndpoints.update(endpointId, {
    enabled_events: WEBHOOK_EVENTS,
    description: "Blum SaaS billing",
    metadata: { app: "blum" },
  });
}

async function createWebhookEndpoint(stripe, webhookUrl) {
  const endpoint = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: WEBHOOK_EVENTS,
    description: "Blum SaaS billing",
    metadata: { app: "blum" },
  });

  console.log(`+ Webhook criado: ${endpoint.url}`);
  console.log(`  STRIPE_WEBHOOK_SECRET=${endpoint.secret}`);
  return endpoint.secret;
}

async function ensureWebhook(stripe, webhookUrl) {
  const existing = await stripe.webhookEndpoints.list({ limit: 100 });
  const found = existing.data.find((w) => w.url === webhookUrl);

  if (found) {
    console.log(`✓ Webhook já existe: ${found.url} (${found.id})`);
    await syncWebhookEvents(stripe, found.id);

    const envSecret = readWebhookSecretFromEnv();
    if (envSecret) {
      console.log("  ✓ STRIPE_WEBHOOK_SECRET já definido no .env");
      return envSecret;
    }

    console.log(
      "  ↻ STRIPE_WEBHOOK_SECRET ausente — recriando endpoint para obter whsec_...",
    );
    await stripe.webhookEndpoints.del(found.id);
    return createWebhookEndpoint(stripe, webhookUrl);
  }

  return createWebhookEndpoint(stripe, webhookUrl);
}

function updateEnvFile(updates) {
  const envPath = path.join(__dirname, "..", ".env");
  let content = "";

  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, "utf8");
  } else {
    content = fs.readFileSync(path.join(__dirname, "..", ".env.example"), "utf8");
  }

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    const line = `${key}=${value}`;
    if (regex.test(content)) {
      content = content.replace(regex, line);
    } else {
      content = `${content.trim()}\n${line}\n`;
    }
  }

  fs.writeFileSync(envPath, content, "utf8");
  console.log(`\n✓ Arquivo atualizado: ${envPath}`);
}

async function main() {
  const secretKey = getSecretKey();
  const stripe = new Stripe(secretKey);
  const currency = (process.env.STRIPE_SETUP_CURRENCY || "brl").toLowerCase();
  const webhookUrl = process.env.STRIPE_WEBHOOK_URL || "";

  const account = await stripe.accounts.retrieve();
  const mode = secretKey.includes("_test_") ? "TESTE" : "PRODUÇÃO";
  console.log(`\n🔗 Stripe conectado (${mode})`);
  console.log(`   Conta: ${account.settings?.dashboard?.display_name || account.id}`);
  console.log(`   Moeda dos planos: ${currency.toUpperCase()}\n`);

  const envUpdates = {};
  for (const plan of PLAN_DEFINITIONS) {
    const result = await ensurePlan(stripe, plan, currency);
    envUpdates[result.envKey] = result.priceId;
  }

  if (webhookUrl) {
    const secret = await ensureWebhook(stripe, webhookUrl);
    if (isWebhookSigningSecret(secret)) {
      envUpdates.STRIPE_WEBHOOK_SECRET = secret;
    } else {
      console.warn(
        "⚠ Não foi possível obter STRIPE_WEBHOOK_SECRET. Use `stripe listen` em dev ou recrie o endpoint no Dashboard.",
      );
    }
  } else {
    console.log(`
ℹ Webhook de produção não configurado.
  Para produção, adicione no .env:
  STRIPE_WEBHOOK_URL=https://api-blum.jwsoftware.com.br/api/v2/billing/webhook
  e execute npm run stripe:setup novamente.

  Para desenvolvimento local:
  npm install -g stripe
  stripe login
  stripe listen --forward-to localhost:3011/api/v2/billing/webhook
`);
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    envUpdates.STRIPE_SECRET_KEY = secretKey;
  }
  if (!process.env.FRONTEND_URL) {
    envUpdates.FRONTEND_URL = "http://localhost:3000";
  }
  if (!process.env.BILLING_ENFORCE) {
    envUpdates.BILLING_ENFORCE = "false";
  }

  updateEnvFile(envUpdates);

  console.log(`
✅ Setup concluído!

Próximos passos:
  1. Reinicie o backend: npm run dev
  2. Suba o frontend: cd ../blum_frontend && npm start
  3. Login como admin → menu Assinatura → testar com cartão 4242 4242 4242 4242
  4. Em produção (Coolify), copie as mesmas variáveis do .env para o backend
`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("❌ Erro:", err.message);
    if (err.type === "StripeAuthenticationError") {
      console.error("   Chave inválida. Verifique STRIPE_SECRET_KEY no .env");
    }
    process.exit(1);
  });
}

module.exports = {
  isWebhookSigningSecret,
  readWebhookSecretFromEnv,
  WEBHOOK_EVENTS,
};
