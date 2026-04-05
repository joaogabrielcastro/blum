/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/*.test.js"],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/**/*.test.js",
    "!src/db/migrate.js",
  ],
  coveragePathIgnorePatterns: ["/node_modules/"],
  clearMocks: true,
};
