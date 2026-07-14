const Sentry = require("@sentry/node");
const { getRelease, getEnvironment } = require("./release");

let initialized = false;

function isSentryConfigured() {
  return Boolean(
    process.env.SENTRY_DSN && String(process.env.SENTRY_DSN).trim(),
  );
}

/**
 * Inicializa Sentry. Sem SENTRY_DSN, no-op (dev/test seguro).
 */
function initSentry() {
  if (initialized) {
    return { enabled: isSentryConfigured() };
  }
  initialized = true;

  if (!isSentryConfigured()) {
    return { enabled: false };
  }

  const tracesSampleRate = Number.parseFloat(
    process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1",
  );

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: getEnvironment(),
    release: getRelease(),
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.headers) {
        const headers = { ...event.request.headers };
        delete headers.authorization;
        delete headers.cookie;
        event.request.headers = headers;
      }
      return event;
    },
  });

  console.log(
    JSON.stringify({
      level: "info",
      message: "sentry_initialized",
      environment: getEnvironment(),
      release: getRelease(),
    }),
  );

  return { enabled: true };
}

function setupSentryExpress(app) {
  if (!isSentryConfigured()) return;
  Sentry.setupExpressErrorHandler(app);
}

function captureRequestContext(req) {
  if (!isSentryConfigured()) return;

  const scope = Sentry.getCurrentScope();
  if (req.requestId) {
    scope.setTag("request_id", req.requestId);
  }
  if (req.user?.userId != null) {
    scope.setUser({
      id: String(req.user.userId),
      username: req.user.username || undefined,
    });
  }
  if (req.user?.tenantId != null) {
    scope.setTag("tenant_id", String(req.user.tenantId));
  } else if (req.tenantId != null) {
    scope.setTag("tenant_id", String(req.tenantId));
  }
}

function getActiveTraceId() {
  if (!isSentryConfigured()) return null;
  try {
    const span = Sentry.getActiveSpan();
    if (!span) return null;
    const traceId = span.spanContext?.()?.traceId;
    return traceId || null;
  } catch {
    return null;
  }
}

module.exports = {
  Sentry,
  initSentry,
  setupSentryExpress,
  captureRequestContext,
  getActiveTraceId,
  isSentryConfigured,
};
