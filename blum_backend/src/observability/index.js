const { initSentry, isSentryConfigured } = require("./sentry");
const { startOpenTelemetry, isOtelConfigured } = require("./otel");
const { initObservability, getObservabilityStatus } = require("./instrument");
const { getRelease, getEnvironment } = require("./release");
const {
  setupSentryExpress,
  captureRequestContext,
  getActiveTraceId,
  Sentry,
} = require("./sentry");

module.exports = {
  initObservability,
  getObservabilityStatus,
  initSentry,
  startOpenTelemetry,
  setupSentryExpress,
  captureRequestContext,
  getActiveTraceId,
  isSentryConfigured,
  isOtelConfigured,
  getRelease,
  getEnvironment,
  Sentry,
};
