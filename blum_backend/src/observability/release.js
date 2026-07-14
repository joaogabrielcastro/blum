/**
 * Identificador de release para correlacionar erros com deploys.
 * Preferência: SENTRY_RELEASE > git SHA de CI > package version.
 */
function getRelease() {
  if (process.env.SENTRY_RELEASE && String(process.env.SENTRY_RELEASE).trim()) {
    return String(process.env.SENTRY_RELEASE).trim();
  }
  if (process.env.GITHUB_SHA && String(process.env.GITHUB_SHA).trim()) {
    return `blum-backend@${String(process.env.GITHUB_SHA).trim().slice(0, 12)}`;
  }
  try {
    const pkg = require("../../package.json");
    return `blum-backend@${pkg.version || "0.0.0"}`;
  } catch {
    return "blum-backend@unknown";
  }
}

function getEnvironment() {
  return process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development";
}

module.exports = { getRelease, getEnvironment };
