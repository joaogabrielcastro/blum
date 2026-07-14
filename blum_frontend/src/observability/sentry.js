import * as Sentry from "@sentry/react";

function getRelease() {
  if (process.env.REACT_APP_SENTRY_RELEASE) {
    return process.env.REACT_APP_SENTRY_RELEASE;
  }
  if (process.env.REACT_APP_GIT_SHA) {
    return `blum-frontend@${String(process.env.REACT_APP_GIT_SHA).slice(0, 12)}`;
  }
  return undefined;
}

export function isSentryConfigured() {
  return Boolean(
    process.env.REACT_APP_SENTRY_DSN &&
      String(process.env.REACT_APP_SENTRY_DSN).trim(),
  );
}

/**
 * Inicializa Sentry no browser. Sem DSN, no-op.
 */
export function initFrontendSentry() {
  if (!isSentryConfigured()) {
    return { enabled: false };
  }

  const tracesSampleRate = Number.parseFloat(
    process.env.REACT_APP_SENTRY_TRACES_SAMPLE_RATE || "0.1",
  );

  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment:
      process.env.REACT_APP_SENTRY_ENVIRONMENT ||
      process.env.NODE_ENV ||
      "development",
    release: getRelease(),
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0.1,
    replaysSessionSampleRate: Number.parseFloat(
      process.env.REACT_APP_SENTRY_REPLAYS_SESSION_SAMPLE_RATE || "0",
    ),
    replaysOnErrorSampleRate: Number.parseFloat(
      process.env.REACT_APP_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE || "1",
    ),
    sendDefaultPii: false,
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/api-blum\.jwsoftware\.com\.br/,
      /^https:\/\/.*\.blum\.jwsoftware\.com\.br/,
      /^\//,
    ],
  });

  return { enabled: true };
}

export { Sentry };
