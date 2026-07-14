const { pool } = require("../config/database");

/**
 * Monta o briefing do incidente para o agente (sempre read-only).
 */
async function buildIncidentContext(incidentId) {
  const { rows } = await pool.query(
    `SELECT i.*,
            p.slug AS project_slug,
            p.name AS project_name,
            p.repo_full_name AS project_repo_full_name,
            p.default_branch AS project_default_branch,
            p.stack AS project_stack
     FROM incidents i
     JOIN projects p ON p.id = i.project_id
     WHERE i.id = $1`,
    [incidentId],
  );
  const incident = rows[0];
  if (!incident) {
    const err = new Error("Incidente não encontrado");
    err.status = 404;
    throw err;
  }

  const events = await pool.query(
    `SELECT source, received_at, payload_excerpt
     FROM incident_events
     WHERE incident_id = $1
     ORDER BY received_at DESC
     LIMIT 10`,
    [incidentId],
  );

  const similar = await pool.query(
    `SELECT id, title, fingerprint, severity, status, event_count, last_seen,
            culprit, diagnosis_status
     FROM incidents
     WHERE project_id = $1
       AND id <> $2
       AND (
         culprit = $3
         OR title ILIKE '%' || split_part($4, ':', 1) || '%'
       )
     ORDER BY last_seen DESC
     LIMIT 5`,
    [
      incident.project_id,
      incident.id,
      incident.culprit || "",
      incident.title || "",
    ],
  );

  const metadata =
    typeof incident.metadata === "string"
      ? JSON.parse(incident.metadata)
      : incident.metadata || {};

  const suspectPaths = extractSuspectPaths({
    culprit: incident.culprit,
    stack: metadata.stack,
    exceptionType: metadata.exceptionType,
  });

  return {
    incident: {
      id: incident.id,
      fingerprint: incident.fingerprint,
      title: incident.title,
      severity: incident.severity,
      status: incident.status,
      culprit: incident.culprit,
      release: incident.release,
      environment: incident.environment,
      eventCount: incident.event_count,
      firstSeen: incident.first_seen,
      lastSeen: incident.last_seen,
      message: incident.last_message,
      metadata,
    },
    project: {
      slug: incident.project_slug,
      name: incident.project_name,
      repoFullName: incident.project_repo_full_name,
      defaultBranch: incident.project_default_branch || "main",
      stack: incident.project_stack,
    },
    recentEvents: events.rows,
    similarIncidents: similar.rows,
    suspectPaths,
    builtAt: new Date().toISOString(),
  };
}

function extractSuspectPaths({ culprit, stack, exceptionType }) {
  const paths = new Set();

  if (culprit && /\.[a-zA-Z0-9]+$/.test(culprit) && !culprit.startsWith("/api")) {
    paths.add(culprit.split(":").at(0));
  }

  if (stack) {
    String(stack)
      .split("\n")
      .forEach((line) => {
        const m =
          line.match(/([A-Za-z0-9_./\\-]+\.(?:js|jsx|ts|tsx|mjs|cjs)):(\d+)/) ||
          line.match(/in ([A-Za-z0-9_./\\-]+\.(?:js|jsx|ts|tsx))/);
        if (m?.[1]) {
          const p = m[1].replace(/\\/g, "/");
          if (!p.includes("node_modules")) paths.add(p);
        }
      });
  }

  // Heurísticas Blum
  if (exceptionType === "JsonWebTokenError" || /jwt|token/i.test(String(culprit))) {
    paths.add("blum_backend/src/middleware/authMiddleware.js");
  }
  if (/stripe|billing|webhook/i.test(`${culprit || ""} ${exceptionType || ""}`)) {
    paths.add("blum_backend/src/services/stripe");
    paths.add("blum_backend/src/controllers/stripeWebhookController.js");
  }

  return [...paths].slice(0, 8);
}

module.exports = { buildIncidentContext, extractSuspectPaths };
