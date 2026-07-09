const { test, expect } = require("@playwright/test");
const { loginAsAdmin, openSidebarNav } = require("./helpers");

const runE2e = process.env.RUN_E2E === "1";

(runE2e ? test.describe : test.describe.skip)("sessão", () => {
  test("logout volta para tela de login", async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Entrar" }),
    ).toBeVisible();
  });

  test("tokens permanecem ao navegar entre páginas", async ({ page }) => {
    await loginAsAdmin(page);

    await openSidebarNav(page, "Clientes");
    await openSidebarNav(page, "Produtos");

    const session = await page.evaluate(() => ({
      token: localStorage.getItem("token"),
      user: localStorage.getItem("user"),
    }));
    expect(session.token).toBeTruthy();
    expect(session.user).toBeTruthy();
    await expect(page).toHaveURL(/\/products/);
  });
});
