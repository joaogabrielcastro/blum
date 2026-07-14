/**
 * Normaliza payloads de ingestão genérica e webhooks Sentry (issue/event).
 */
const { buildFingerprint, normalizeSeverity } = require("./fingerprint");

function truncate(str, max = 2000) {
  if (str == null) return null;
  const s = String(str);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function fromGeneric(body = {}) {
  const title =
    body.title ||
    body.message ||
    body.culprit ||
    "Untitled incident";

  const fingerprint = buildFingerprint({
    fingerprint: Array.isArray(body.fingerprint)
      ? body.fingerprint.join(":")
      : body.fingerprint,
    exceptionType: body.exceptionType || body.type,
    transaction: body.transaction,
    culprit: body.culprit,
    filename: body.filename,
    functionName: body.functionName,
    environment: body.environment,
    title,
    message: body.message,
  });

  return {
    source: body.source || "generic",
    title: truncate(title, 500),
    severity: normalizeSeverity(body.severity || body.level),
    culprit: truncate(body.culprit || body.transaction, 500),
    release: truncate(body.release, 200),
    environment: truncate(body.environment, 100),
    message: truncate(body.message || body.title, 2000),
    fingerprint,
    metadata: {
      exceptionType: body.exceptionType || body.type || null,
      stack: truncate(body.stack, 4000),
      requestId: body.requestId || body.request_id || null,
      traceId: body.traceId || body.trace_id || null,
      url: body.url || null,
      extra: body.extra && typeof body.extra === "object" ? body.extra : undefined,
    },
    payloadExcerpt: {
      title,
      message: truncate(body.message, 500),
      culprit: body.culprit || null,
      release: body.release || null,
    },
  };
}

/**
 * Sentry webhook (issue / event_alert) — formatos variam; extraímos o essencial.
 */
function fromSentryWebhook(body = {}) {
  const data = body.data || body;
  const event = data.event || data;
  const issue = data.issue || event?.issue || body.issue || {};

  const exceptionValues =
    event?.exception?.values ||
    event?.entries?.find?.((e) => e.type === "exception")?.data?.values ||
    [];
  const firstEx = exceptionValues[0] || {};
  const frames =
    firstEx.stacktrace?.frames ||
    firstEx.stackTrace?.frames ||
    [];
  const topAppFrame =
    [...frames].reverse().find((f) => f.in_app) || frames[frames.length - 1] || {};

  const title =
    issue.title ||
    event.title ||
    firstEx.type ||
    body.action ||
    "Sentry incident";

  const message =
    firstEx.value ||
    event.message ||
    issue.metadata?.value ||
    title;

  const sentryFp = issue.culprit
    ? null
    : Array.isArray(event.fingerprint)
      ? event.fingerprint.join(":")
      : event.fingerprint || issue.id || null;

  const normalized = fromGeneric({
    source: "sentry",
    title,
    message,
    severity: issue.level || event.level || "error",
    culprit: issue.culprit || event.transaction || event.culprit,
    release: event.release || issue.firstRelease || null,
    environment: event.environment || issue.environment || null,
    exceptionType: firstEx.type || issue.metadata?.type,
    filename: topAppFrame.filename || topAppFrame.abs_path,
    functionName: topAppFrame.function,
    fingerprint: sentryFp || (issue.id ? `sentry:${issue.id}` : null),
    requestId: event.tags?.request_id || event.contexts?.trace?.request_id,
    traceId: event.contexts?.trace?.trace_id,
    url: event.request?.url,
    stack: frames
      .slice(-8)
      .map(
        (f) =>
          `${f.filename || f.abs_path || "?"}:${f.lineno || "?"} in ${f.function || "?"}`,
      )
      .join("\n"),
    extra: {
      sentryAction: body.action || null,
      issueId: issue.id || null,
      eventId: event.event_id || event.id || null,
      webUrl: issue.permalink || issue.web_url || null,
    },
  });

  return normalized;
}

function normalizeIngestPayload(sourceHint, body) {
  if (sourceHint === "sentry" || body?.action || body?.data?.event || body?.data?.issue) {
    return fromSentryWebhook(body);
  }
  return fromGeneric({ ...body, source: sourceHint || body.source || "generic" });
}

module.exports = {
  fromGeneric,
  fromSentryWebhook,
  normalizeIngestPayload,
};
