const { expect } = require("@playwright/test");

const DEFAULT_USER = process.env.E2E_USER || "admin@jwsoftware.com.br";
const DEFAULT_PASSWORD = process.env.E2E_PASSWORD || "BlumAdmin2025!";

async function clearSession(page) {
  await page.addInitScript(() => {
    const marker = "blum.e2e.session-cleared";
    if (sessionStorage.getItem(marker) !== "1") {
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem(marker, "1");
    }
  });
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#username")).toBeVisible();
}

async function submitLogin(page, { user, password } = {}) {
  const email = user || DEFAULT_USER;
  const pass = password || DEFAULT_PASSWORD;
  const username = page.locator("#username");

  await expect(username).toBeFocused({ timeout: 2_000 });
  await username.fill(email);
  await page.locator("#password").fill(pass);
  await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled();
  await page.getByRole("button", { name: "Entrar" }).click();
}

/**
 * Idempotente: a limpeza de sessão só roda uma vez por aba (marcador em
 * sessionStorage). Se a aba já estiver autenticada, /login redireciona para o
 * painel — nesse caso não há formulário para preencher.
 */
async function loginAsAdmin(page, options = {}) {
  await page.addInitScript(() => {
    const marker = "blum.e2e.session-cleared";
    if (sessionStorage.getItem(marker) !== "1") {
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem(marker, "1");
    }
  });
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  const loginForm = page.locator("#username");
  await expect(loginForm.or(page.locator("main"))).toBeVisible();
  if (await loginForm.isVisible()) {
    await submitLogin(page, options);
  }
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
}

async function openSidebarNav(page, label) {
  const nav = page.getByRole("link", { name: label, exact: true });
  await expect(nav).toBeVisible({ timeout: 15_000 });
  await nav.click();
}

module.exports = {
  DEFAULT_USER,
  DEFAULT_PASSWORD,
  clearSession,
  submitLogin,
  loginAsAdmin,
  openSidebarNav,
};
