/**
 * Compat de bootstrap: Sentry síncrono + OTel assíncrono.
 * Mantém createApp() utilizável nos testes sem esperar OTel.
 */
const { initSentry, isSentryConfigured } = require("./sentry");
const { startOpenTelemetry, isOtelConfigured } = require("./otel");
const { getObservabilityStatus } = require("./instrument");

module.exports = {
  initSentry,
  startOpenTelemetry,
  isSentryConfigured,
  isOtelConfigured,
  getObservabilityStatus,
};
