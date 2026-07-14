const { initSentry, isSentryConfigured } = require("./sentry");
const { startOpenTelemetry, isOtelConfigured } = require("./otel");

let bootstrapped = false;

/**
 * Bootstrap de observabilidade — chamar logo após dotenv, antes de createApp.
 */
async function initObservability() {
  if (bootstrapped) {
    return getObservabilityStatus();
  }
  bootstrapped = true;

  const sentry = initSentry();

  let otel = { enabled: false };
  try {
    otel = await startOpenTelemetry();
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "otel_start_failed",
        error: err.message,
      }),
    );
  }

  return {
    sentry: sentry.enabled,
    otel: otel.enabled,
  };
}

function getObservabilityStatus() {
  return {
    sentry: isSentryConfigured(),
    otel: isOtelConfigured(),
  };
}

module.exports = { initObservability, getObservabilityStatus };
