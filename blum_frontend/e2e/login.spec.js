const { test, expect } = require("@playwright/test");

const runE2e = process.env.RUN_E2E === "1";

/** Requer backend + frontend; credenciais alinhadas ao seed local (INTEGRATION_* no backend). */
(runE2e ? test.describe : test.describe.skip)("login → dashboard", () => {
  test("admin entra e vai para /dashboard", async ({ page }) => {
    const user = process.env.E2E_USER || "admin@jwsoftware.com.br";
    const password = process.env.E2E_PASSWORD || "BlumAdmin2025!";

    await page.goto("/login");
    await page.locator("#username").waitFor({ state: "visible" });
    await page.fill("#username", user);
    await page.fill("#password", password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  });

  test("login com slug default via campo empresa", async ({ page }) => {
    const user = process.env.E2E_USER || "admin@jwsoftware.com.br";
    const password = process.env.E2E_PASSWORD || "BlumAdmin2025!";

    await page.goto("/login");
    const expandCompany = page.getByRole("button", { name: /acessar outra empresa/i });
    if (await expandCompany.isVisible()) {
      await expandCompany.click();
    }
    const slugInput = page.locator("#tenantSlug:not([type='hidden'])");
    if (await slugInput.count()) {
      await slugInput.fill("default");
    }
    await page.fill("#username", user);
    await page.fill("#password", password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  });
});

(runE2e ? test.describe : test.describe.skip)("multi-tenant slug", () => {
  test("página de signup carrega", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /criar|empresa|cadastro/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
