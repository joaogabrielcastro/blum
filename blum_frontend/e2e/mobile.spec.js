const path = require("path");
const { test, expect } = require("@playwright/test");
const { loginAsAdmin } = require("./helpers");

const runE2e = process.env.RUN_E2E === "1";

const routes = [
  ["dashboard", "Painel"],
  ["pedidos", "Pedidos"],
  ["compras", "Compras"],
  ["clientes", "Clientes"],
  ["produtos", "Produtos"],
  ["relatorios", "Relatórios"],
  ["equipe", "Equipe"],
  ["assinatura", "Assinatura"],
];

async function expectNoPageOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect.soft(
    dimensions.document,
    `${label}: documento ultrapassou a largura da tela (${JSON.stringify(dimensions)})`,
  ).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect.soft(
    dimensions.body,
    `${label}: body ultrapassou a largura da tela (${JSON.stringify(dimensions)})`,
  ).toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function navigateFromMobileMenu(page, linkName) {
  await page.getByRole("button", { name: "Abrir menu" }).click();
  const sidebar = page.getByRole("complementary", { name: "Navegação principal" });
  await expect(sidebar).toBeVisible();
  await sidebar.getByRole("link", { name: linkName, exact: true }).click();
  await expect(sidebar).toHaveClass(/-translate-x-full/);
  await page.waitForTimeout(350);
  await expect(page.getByRole("button", { name: "Abrir menu" })).toBeVisible();
  await expect(page.locator("main")).toBeVisible();
}

(runE2e ? test.describe : test.describe.skip)("auditoria mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  for (const [label, linkName] of routes) {
    test(`${label} cabe na viewport`, async ({ page }, testInfo) => {
      if (linkName !== "Painel") await navigateFromMobileMenu(page, linkName);
      await expectNoPageOverflow(page, label);
      await page.screenshot({ path: testInfo.outputPath(`${label}.png`), fullPage: false });
    });
  }

  test("novo pedido cabe na viewport", async ({ page }, testInfo) => {
    await page.getByRole("button", { name: "Novo orçamento" }).first().click();
    await expect(page).toHaveURL(/\/orders\/new/);
    await expect(page.getByRole("heading", { name: "Novo orçamento" })).toBeVisible();
    await expectNoPageOverflow(page, "novo pedido");
    await page.screenshot({ path: testInfo.outputPath("novo-pedido.png"), fullPage: false });
  });

  test("menu lateral abre e fecha sem cobrir controles", async ({ page }) => {
    await page.getByRole("button", { name: "Abrir menu" }).click();
    const navigation = page.getByRole("complementary", { name: "Navegação principal" });
    await expect(navigation).toBeVisible();
    await expect(page.getByRole("link", { name: "Produtos", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Produtos", exact: true }).click();
    await expect(page).toHaveURL(/\/products/);
    await expect(page.getByRole("button", { name: "Abrir menu" })).toBeVisible();
    await expectNoPageOverflow(page, "menu lateral");
  });

  test("importação de produtos permanece utilizável no celular", async ({ page }, testInfo) => {
    await page.route("**/api/v2/brands", async (route) => {
      await route.fulfill({ json: [{ id: 999999, name: "Representada de teste" }] });
    });
    await page.route("**/api/v2/products/lookup-by-codes", async (route) => {
      await route.fulfill({ json: { products: {} } });
    });
    await page.route("**/api/v2/products?*", async (route) => {
      await route.fulfill({
        json: { products: [], pagination: { page: 1, totalPages: 1, total: 0, limit: 200 } },
      });
    });
    await page.reload({ waitUntil: "networkidle" });
    await loginAsAdmin(page);
    await navigateFromMobileMenu(page, "Produtos");
    await page.getByRole("button", { name: /^Importar/ }).click();

    const dialog = page.getByRole("dialog", { name: "Importar produtos" });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.width).toBeLessThanOrEqual(390);

    await dialog.locator('input[type="file"]').setInputFiles(
      path.join(__dirname, "fixtures", "catalog-mobile.csv"),
    );
    await dialog.getByRole("button", { name: "Enviar PLANILHA" }).click();
    await expect(dialog.getByText("Planilha processada")).toBeVisible({ timeout: 30_000 });
    await expect(dialog.getByText("2 produto(s) encontrados", { exact: false })).toBeVisible();
    await expect(dialog.getByText("1 preço(s) zerado(s)")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Confirmar importação" })).toBeVisible();
    await expectNoPageOverflow(page, "painel de importação");
    await page.screenshot({
      path: testInfo.outputPath("importacao-preview.png"),
      fullPage: false,
    });
  });
});
