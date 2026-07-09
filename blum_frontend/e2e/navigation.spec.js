const { test, expect } = require("@playwright/test");
const { loginAsAdmin, openSidebarNav } = require("./helpers");

const runE2e = process.env.RUN_E2E === "1";

(runE2e ? test.describe : test.describe.skip)("navegação autenticada", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("admin acessa clientes, produtos e relatórios", async ({ page }) => {
    await openSidebarNav(page, "Clientes");
    await expect(page).toHaveURL(/\/clients/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Clientes" }),
    ).toBeVisible();

    await openSidebarNav(page, "Produtos");
    await expect(page).toHaveURL(/\/products/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Produtos" }),
    ).toBeVisible();

    await openSidebarNav(page, "Relatórios");
    await expect(page).toHaveURL(/\/reports/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", {
        name: "Relatórios de Vendas e Comissões",
      }),
    ).toBeVisible();
  });

  test("relatórios exibe filtros de mês e resumo", async ({ page }) => {
    await openSidebarNav(page, "Relatórios");
    await expect(
      page.getByRole("heading", {
        name: "Relatórios de Vendas e Comissões",
      }),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("Mês calendário:")).toBeVisible();
    await expect(page.getByText("Total de Pedidos")).toBeVisible();
    await expect(page.getByText("Total de Comissões")).toBeVisible();
  });
});
