# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.js >> login → dashboard >> login com slug default via campo empresa
- Location: e2e\login.spec.js:19:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/dashboard/
Received string:  "http://127.0.0.1:3000/login"
Timeout: 30000ms

Call log:
  - Expect "toHaveURL" with timeout 30000ms
    33 × unexpected value "http://127.0.0.1:3000/login"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e9]:
      - paragraph [ref=e10]: Blum
      - paragraph [ref=e11]: Gestão comercial
    - generic [ref=e12]:
      - heading "Vendas, clientes e equipe no mesmo lugar." [level=2] [ref=e13]
      - paragraph [ref=e14]: Plataforma para representantes comerciais que precisam de agilidade no campo e controle na operação.
      - list [ref=e15]:
        - listitem [ref=e16]:
          - img [ref=e18]
          - text: Orçamentos e pedidos em tempo real
        - listitem [ref=e20]:
          - img [ref=e22]
          - text: Gestão de clientes e representadas
        - listitem [ref=e24]:
          - img [ref=e26]
          - text: Relatórios e equipe comercial integrados
    - paragraph [ref=e28]: © 2026 JW Soluções · Blum
  - generic [ref=e32]:
    - generic [ref=e33]:
      - heading "Entrar" [level=2] [ref=e34]
      - paragraph [ref=e35]: Use suas credenciais para acessar o sistema.
    - alert [ref=e36]:
      - img [ref=e37]
      - generic [ref=e39]: A API não foi alcançada (504). Reveja o proxy/Nginx ou a variável BACKEND_PROXY_HOST; não indica senha errada.
    - generic [ref=e40]:
      - generic [ref=e41]:
        - generic [ref=e42]: Identificador da empresa
        - textbox "Identificador da empresa" [ref=e43]:
          - /placeholder: "ex.: minha-empresa"
          - text: default
        - paragraph [ref=e44]:
          - text: "Código da sua empresa no Blum. Ambiente legado:"
          - button "default" [ref=e45] [cursor=pointer]
      - generic [ref=e46]:
        - generic [ref=e47]: E-mail ou usuário
        - generic [ref=e48]:
          - generic:
            - img
          - textbox "E-mail ou usuário" [ref=e49]:
            - /placeholder: seu@email.com
            - text: admin@jwsoftware.com.br
      - generic [ref=e50]:
        - generic [ref=e51]: Senha
        - generic [ref=e52]:
          - generic:
            - img
          - textbox "Senha" [ref=e53]:
            - /placeholder: Sua senha
            - text: BlumAdmin2025!
          - button "Mostrar senha" [ref=e54] [cursor=pointer]:
            - img [ref=e55]
      - button "Entrar" [ref=e57] [cursor=pointer]
    - paragraph [ref=e59]:
      - text: Primeira vez no Blum?
      - link "Criar empresa" [ref=e60] [cursor=pointer]:
        - /url: /signup
```

# Test source

```ts
  1  | const { test, expect } = require("@playwright/test");
  2  | 
  3  | const runE2e = process.env.RUN_E2E === "1";
  4  | 
  5  | /** Requer backend + frontend; credenciais alinhadas ao seed local (INTEGRATION_* no backend). */
  6  | (runE2e ? test.describe : test.describe.skip)("login → dashboard", () => {
  7  |   test("admin entra e vai para /dashboard", async ({ page }) => {
  8  |     const user = process.env.E2E_USER || "admin@jwsoftware.com.br";
  9  |     const password = process.env.E2E_PASSWORD || "BlumAdmin2025!";
  10 | 
  11 |     await page.goto("/login");
  12 |     await page.locator("#username").waitFor({ state: "visible" });
  13 |     await page.fill("#username", user);
  14 |     await page.fill("#password", password);
  15 |     await page.getByRole("button", { name: "Entrar" }).click();
  16 |     await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  17 |   });
  18 | 
  19 |   test("login com slug default via campo empresa", async ({ page }) => {
  20 |     const user = process.env.E2E_USER || "admin@jwsoftware.com.br";
  21 |     const password = process.env.E2E_PASSWORD || "BlumAdmin2025!";
  22 | 
  23 |     await page.goto("/login");
  24 |     const expandCompany = page.getByRole("button", { name: /acessar outra empresa/i });
  25 |     if (await expandCompany.isVisible()) {
  26 |       await expandCompany.click();
  27 |     }
  28 |     const slugInput = page.locator("#tenantSlug:not([type='hidden'])");
  29 |     if (await slugInput.count()) {
  30 |       await slugInput.fill("default");
  31 |     }
  32 |     await page.fill("#username", user);
  33 |     await page.fill("#password", password);
  34 |     await page.getByRole("button", { name: "Entrar" }).click();
> 35 |     await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  36 |   });
  37 | });
  38 | 
  39 | (runE2e ? test.describe : test.describe.skip)("multi-tenant slug", () => {
  40 |   test("página de signup carrega", async ({ page }) => {
  41 |     await page.goto("/signup");
  42 |     await expect(page.getByRole("heading", { name: /criar|empresa|cadastro/i })).toBeVisible({
  43 |       timeout: 15_000,
  44 |     });
  45 |   });
  46 | });
  47 | 
```