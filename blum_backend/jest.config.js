/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/*.test.js"],
  testPathIgnorePatterns:
    process.env.RUN_INTEGRATION === "1" ? [] : ["/tests/integration/"],
  collectCoverageFrom: [
    "src/utils/**/*.js",
    "src/config/cache.js",
    "src/config/env.js",
    "src/config/plans.js",
    "src/config/stripe.js",
    "src/middleware/authMiddleware.js",
    "src/middleware/platformAdminMiddleware.js",
    "src/middleware/subscriptionMiddleware.js",
    "src/middleware/tenantDbContextMiddleware.js",
    "src/mappers/**/*.js",
    "src/services/**/*.js",
    "!src/services/orderService.js",
    "!src/services/productService.js",
    "!src/services/clientService.js",
    "!src/services/reportService.js",
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 65,
      functions: 75,
      lines: 80,
    },
  },
  coveragePathIgnorePatterns: ["/node_modules/"],
  clearMocks: true,
};
