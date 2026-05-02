/* eslint-disable no-console */
const DEFAULT_BASE_URL = process.env.CONTRACT_BASE_URL || "http://localhost:3011/api";
const DEFAULT_USER = process.env.CONTRACT_USER || "admin";
const DEFAULT_PASSWORD = process.env.CONTRACT_PASSWORD || "BlumAdmin2025!";
const DEFAULT_TENANT = process.env.CONTRACT_TENANT_SLUG || "default";

const LEGACY_KEYS = new Set([
  "userid",
  "clientid",
  "representadas",
  "subcode",
]);

function findLegacyKeysDeep(value, path = "root", acc = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      findLegacyKeysDeep(item, `${path}[${index}]`, acc),
    );
    return acc;
  }
  if (!value || typeof value !== "object") {
    return acc;
  }

  for (const key of Object.keys(value)) {
    if (key.includes("_") || LEGACY_KEYS.has(key)) {
      acc.push(`${path}.${key}`);
    }
    findLegacyKeysDeep(value[key], `${path}.${key}`, acc);
  }
  return acc;
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
}

async function main() {
  const loginRes = await fetch(`${DEFAULT_BASE_URL}/v2/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: DEFAULT_USER,
      password: DEFAULT_PASSWORD,
      tenantSlug: DEFAULT_TENANT,
    }),
  });
  const loginBody = await parseJsonSafe(loginRes);
  if (!loginRes.ok || !loginBody?.token) {
    throw new Error(
      `Falha no login v2: status=${loginRes.status} body=${JSON.stringify(loginBody)}`,
    );
  }

  const token = loginBody.token;
  const refreshToken = loginBody.refreshToken;
  const authHeaders = { authorization: `Bearer ${token}` };
  const checks = [
    ["auth-verify", "/v2/auth/verify"],
    ["auth-users", "/v2/auth/users"],
    ["brands", "/v2/brands"],
    ["clients", "/v2/clients"],
    ["products", "/v2/products?limit=10"],
    ["orders", "/v2/orders"],
    ["reports-stats", "/v2/reports/stats"],
    ["reports-sales-by-rep", "/v2/reports/sales-by-rep"],
    ["reports-commissions", "/v2/reports/commissions"],
    ["reports-commissions-by-brand", "/v2/reports/commissions/by-brand"],
  ];
  const failures = [];

  for (const [name, route] of checks) {
    const res = await fetch(`${DEFAULT_BASE_URL}${route}`, { headers: authHeaders });
    const body = await parseJsonSafe(res);
    if (!res.ok) {
      failures.push(
        `[${name}] status=${res.status} body=${JSON.stringify(body)}`,
      );
      continue;
    }
    const snakePaths = findLegacyKeysDeep(body);
    if (snakePaths.length > 0) {
      failures.push(
        `[${name}] encontrou chaves legadas: ${snakePaths.slice(0, 30).join(", ")}`,
      );
    } else {
      console.log(`OK ${name}`);
    }
  }

  try {
    const ordersRes = await fetch(`${DEFAULT_BASE_URL}/v2/orders`, {
      headers: authHeaders,
    });
    const orders = await parseJsonSafe(ordersRes);
    const firstOrderId = Array.isArray(orders) ? orders[0]?.id : null;
    if (firstOrderId) {
      const orderByIdRes = await fetch(
        `${DEFAULT_BASE_URL}/v2/orders/${firstOrderId}`,
        {
          headers: authHeaders,
        },
      );
      const orderById = await parseJsonSafe(orderByIdRes);
      const orderByIdSnake = findLegacyKeysDeep(orderById);
      if (orderByIdSnake.length > 0) {
        failures.push(
          `[order-by-id] encontrou chaves legadas: ${orderByIdSnake
            .slice(0, 30)
            .join(", ")}`,
        );
      } else {
        console.log("OK order-by-id");
      }

      const productId = orderById?.items?.[0]?.productId;
      const clientId = orderById?.clientId;
      if (productId && clientId) {
        const orderHistoryRes = await fetch(
          `${DEFAULT_BASE_URL}/v2/orders/clients/${clientId}/products/${productId}/price-history`,
          { headers: authHeaders },
        );
        const orderHistory = await parseJsonSafe(orderHistoryRes);
        const orderHistorySnake = findLegacyKeysDeep(orderHistory);
        if (orderHistorySnake.length > 0) {
          failures.push(
            `[order-price-history] encontrou chaves legadas: ${orderHistorySnake
              .slice(0, 30)
              .join(", ")}`,
          );
        } else {
          console.log("OK order-price-history");
        }

        const purchaseHistoryRes = await fetch(
          `${DEFAULT_BASE_URL}/v2/purchases/price-history/${productId}`,
          { headers: authHeaders },
        );
        const purchaseHistory = await parseJsonSafe(purchaseHistoryRes);
        const purchaseHistorySnake = findLegacyKeysDeep(purchaseHistory);
        if (purchaseHistorySnake.length > 0) {
          failures.push(
            `[purchase-price-history] encontrou chaves legadas: ${purchaseHistorySnake
              .slice(0, 30)
              .join(", ")}`,
          );
        } else {
          console.log("OK purchase-price-history");
        }

        const lastPriceRes = await fetch(
          `${DEFAULT_BASE_URL}/v2/purchases/last-price/${productId}`,
          { headers: authHeaders },
        );
        const lastPrice = await parseJsonSafe(lastPriceRes);
        const lastPriceSnake = findLegacyKeysDeep(lastPrice);
        if (lastPriceSnake.length > 0) {
          failures.push(
            `[last-purchase-price] encontrou chaves legadas: ${lastPriceSnake
              .slice(0, 30)
              .join(", ")}`,
          );
        } else {
          console.log("OK last-purchase-price");
        }
      }
    }
  } finally {
    if (refreshToken) {
      await fetch(`${DEFAULT_BASE_URL}/v2/auth/logout`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });
    }
  }

  if (failures.length > 0) {
    console.error("Falhas de contrato v2 detectadas:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log("Contrato v2 validado: sem chaves legadas detectadas.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
