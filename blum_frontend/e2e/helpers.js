const { expect } = require("@playwright/test");

const DEFAULT_USER = process.env.E2E_USER || "admin@jwsoftware.com.br";
const DEFAULT_PASSWORD = process.env.E2E_PASSWORD || "BlumAdmin2025!";

async function clearSession(page) {
  await page.goto("/login");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
}

async function submitLogin(page, { user, password } = {}) {
  const email = user || DEFAULT_USER;
  const pass = password || DEFAULT_PASSWORD;

  await page.locator("#username").fill(email);
  await page.locator("#password").fill(pass);
  await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled();
  await page.getByRole("button", { name: "Entrar" }).click();
}

async function loginAsAdmin(page, options = {}) {
  await clearSession(page);
  await submitLogin(page, options);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
}

async function openSidebarNav(page, label) {
  const nav = page.getByRole("button", { name: label, exact: true });
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
