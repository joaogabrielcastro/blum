const { test, expect } = require("@playwright/test");

const runE2e = process.env.RUN_E2E === "1";

/** Requer backend + frontend; credenciais alinhadas ao seed local (INTEGRATION_* no backend). */
(runE2e ? test.describe : test.describe.skip)("login → dashboard", () => {
  test("admin entra e vai para /dashboard", async ({ page }) => {
    const user = process.env.E2E_USER || "admin";
    const password = process.env.E2E_PASSWORD || "BlumAdmin2025!";

    await page.goto("/login");
    await page.locator("#username").waitFor({ state: "visible" });
    await page.fill("#username", user);
    await page.fill("#password", password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  });
});
