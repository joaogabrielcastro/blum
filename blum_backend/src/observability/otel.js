const { getRelease, getEnvironment } = require("./release");

let started = false;

/**
 * OpenTelemetry opcional: só inicia se OTEL_EXPORTER_OTLP_ENDPOINT estiver definido.
 * Sem collector (Grafana Tempo / OTel Collector), não faz nada.
 */
async function startOpenTelemetry() {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint || !String(endpoint).trim()) {
    return { enabled: false };
  }
  if (started) {
    return { enabled: true };
  }

  // @sentry/node (v8+) já registra OpenTelemetry. NodeSDK paralelo
  // costuma falhar com "duplicate TracerProvider" e derrubar o boot.
  if (
    process.env.SENTRY_DSN &&
    String(process.env.SENTRY_DSN).trim() &&
    process.env.OTEL_FORCE_WITH_SENTRY !== "true"
  ) {
    console.log(
      JSON.stringify({
        level: "info",
        message: "otel_skipped_sentry_active",
        hint: "Sentry já instrumenta traces. Use OTEL_FORCE_WITH_SENTRY=true só se souber o que faz.",
      }),
    );
    return { enabled: false, skipped: "sentry" };
  }

  const { NodeSDK } = require("@opentelemetry/sdk-node");
  const {
    getNodeAutoInstrumentations,
  } = require("@opentelemetry/auto-instrumentations-node");
  const {
    OTLPTraceExporter,
  } = require("@opentelemetry/exporter-trace-otlp-http");
  const { resourceFromAttributes } = require("@opentelemetry/resources");
  const {
    ATTR_SERVICE_NAME,
    ATTR_SERVICE_VERSION,
  } = require("@opentelemetry/semantic-conventions");

  const tracesUrl = endpoint.includes("/v1/traces")
    ? endpoint
    : `${String(endpoint).replace(/\/$/, "")}/v1/traces`;

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]:
        process.env.OTEL_SERVICE_NAME || "blum-backend",
      [ATTR_SERVICE_VERSION]: getRelease(),
      "deployment.environment": getEnvironment(),
    }),
    traceExporter: new OTLPTraceExporter({ url: tracesUrl }),
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  await sdk.start();
  started = true;

  const shutdown = async () => {
    try {
      await sdk.shutdown();
    } catch (err) {
      console.error(
        JSON.stringify({
          level: "error",
          message: "otel_shutdown_failed",
          error: err.message,
        }),
      );
    }
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);

  console.log(
    JSON.stringify({
      level: "info",
      message: "otel_started",
      endpoint: tracesUrl,
      service: process.env.OTEL_SERVICE_NAME || "blum-backend",
    }),
  );

  return { enabled: true };
}

function isOtelConfigured() {
  return Boolean(
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT &&
      String(process.env.OTEL_EXPORTER_OTLP_ENDPOINT).trim(),
  );
}

module.exports = { startOpenTelemetry, isOtelConfigured };
