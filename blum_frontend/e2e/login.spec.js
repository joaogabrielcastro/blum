const { test, expect } = require("@playwright/test");
const {
  clearSession,
  submitLogin,
  loginAsAdmin,
  openSidebarNav,
} = require("./helpers");

const runE2e = process.env.RUN_E2E === "1";

/** Requer backend (:3011) + frontend; credenciais alinhadas ao seed (SEED_ADMIN_* / E2E_*). */
(runE2e ? test.describe : test.describe.skip)("login → dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page);
  });

  test("admin entra e vai para /dashboard", async ({ page }) => {
    await submitLogin(page);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  });

  test("login só com e-mail e senha, sem campo de empresa", async ({ page }) => {
    await expect(
      page.getByLabel("Identificador da empresa"),
    ).toHaveCount(0);
    await submitLogin(page);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  });
});

(runE2e ? test.describe : test.describe.skip)("multi-tenant slug", () => {
  test("página de signup carrega", async ({ page }) => {
    await page.goto("/signup");
    await expect(
      page.getByRole("heading", { name: /criar|empresa|cadastro/i }),
    ).toBeVisible({
      timeout: 15_000,
    });
  });
});
