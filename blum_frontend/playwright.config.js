// @ts-check
const { defineConfig, devices } = require("@playwright/test");

/**
 * E2E: suba o backend (PORT 3011) e o frontend com API local, por exemplo:
 *   set REACT_APP_API_URL=http://127.0.0.1:3011/api/v2 && npm start
 * Depois:
 *   npm run test:e2e --prefix blum_frontend
 *
 * PLAYWRIGHT_BASE_URL — URL do CRA (default http://127.0.0.1:3000)
 */
module.exports = defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
