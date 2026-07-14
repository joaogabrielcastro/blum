const crypto = require("crypto");

function sha256(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

function createIngestToken() {
  const token = `icp_${crypto.randomBytes(24).toString("hex")}`;
  return {
    token,
    hash: sha256(token),
    prefix: token.slice(0, 12),
  };
}

/**
 * Fingerprint estável para deduplicação.
 * Preferência: fingerprint explícito > Sentry-like keys > hash do título+culprit.
 */
function buildFingerprint(parts) {
  if (parts.fingerprint) {
    return String(parts.fingerprint).slice(0, 256);
  }

  const material = [
    parts.exceptionType || "",
    parts.transaction || parts.culprit || "",
    parts.filename || "",
    parts.functionName || "",
    parts.environment || "",
  ]
    .map((s) => String(s).trim().toLowerCase())
    .join("|");

  if (!material.replace(/\|/g, "")) {
    return sha256(parts.title || parts.message || "unknown").slice(0, 32);
  }

  return sha256(material).slice(0, 32);
}

function normalizeSeverity(value) {
  const raw = String(value || "error").toLowerCase();
  if (["fatal", "critical"].includes(raw)) return "critical";
  if (["error", "err"].includes(raw)) return "error";
  if (["warning", "warn"].includes(raw)) return "warning";
  if (["info", "information"].includes(raw)) return "info";
  return "error";
}

module.exports = {
  sha256,
  createIngestToken,
  buildFingerprint,
  normalizeSeverity,
};
