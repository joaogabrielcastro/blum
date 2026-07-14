const { pool } = require("../config/database");

async function upsertIncident(projectId, normalized) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT id, event_count FROM incidents
       WHERE project_id = $1 AND fingerprint = $2
       FOR UPDATE`,
      [projectId, normalized.fingerprint],
    );

    let incident;
    let created = false;

    if (existing.rows.length === 0) {
      created = true;
      const inserted = await client.query(
        `INSERT INTO incidents (
           project_id, fingerprint, title, severity, status, culprit,
           release, environment, last_message, metadata
         ) VALUES ($1,$2,$3,$4,'open',$5,$6,$7,$8,$9)
         RETURNING *`,
        [
          projectId,
          normalized.fingerprint,
          normalized.title,
          normalized.severity,
          normalized.culprit,
          normalized.release,
          normalized.environment,
          normalized.message,
          JSON.stringify(normalized.metadata || {}),
        ],
      );
      incident = inserted.rows[0];
    } else {
      const updated = await client.query(
        `UPDATE incidents SET
           title = $2,
           severity = $3,
           culprit = COALESCE($4, culprit),
           release = COALESCE($5, release),
           environment = COALESCE($6, environment),
           last_seen = now(),
           event_count = event_count + 1,
           last_message = $7,
           metadata = metadata || $8::jsonb,
           status = CASE WHEN status = 'resolved' THEN 'open' ELSE status END
         WHERE id = $1
         RETURNING *`,
        [
          existing.rows[0].id,
          normalized.title,
          normalized.severity,
          normalized.culprit,
          normalized.release,
          normalized.environment,
          normalized.message,
          JSON.stringify(normalized.metadata || {}),
        ],
      );
      incident = updated.rows[0];
    }

    await client.query(
      `INSERT INTO incident_events (incident_id, source, payload_excerpt)
       VALUES ($1, $2, $3)`,
      [
        incident.id,
        normalized.source || "generic",
        JSON.stringify(normalized.payloadExcerpt || {}),
      ],
    );

    await client.query("COMMIT");
    return { incident, created };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function listIncidents({ projectId, status, limit = 50, offset = 0 }) {
  const params = [];
  const where = [];

  if (projectId) {
    params.push(projectId);
    where.push(`i.project_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    where.push(`i.status = $${params.length}`);
  }

  params.push(Math.min(Number(limit) || 50, 200));
  const limitIdx = params.length;
  params.push(Math.max(Number(offset) || 0, 0));
  const offsetIdx = params.length;

  const sql = `
    SELECT i.*, p.slug AS project_slug, p.name AS project_name,
           d.hypothesis AS diagnosis_hypothesis,
           d.confidence AS diagnosis_confidence,
           d.status AS diagnosis_row_status,
           d.root_cause_category AS diagnosis_category
    FROM incidents i
    JOIN projects p ON p.id = i.project_id
    LEFT JOIN LATERAL (
      SELECT hypothesis, confidence, status, root_cause_category
      FROM diagnoses
      WHERE incident_id = i.id
      ORDER BY created_at DESC
      LIMIT 1
    ) d ON true
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY i.last_seen DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const { rows } = await pool.query(sql, params);
  return rows;
}

async function getIncidentById(id) {
  const { rows } = await pool.query(
    `SELECT i.*, p.slug AS project_slug, p.name AS project_name
     FROM incidents i
     JOIN projects p ON p.id = i.project_id
     WHERE i.id = $1`,
    [id],
  );
  if (!rows[0]) return null;

  const events = await pool.query(
    `SELECT id, source, received_at, payload_excerpt, raw_ref
     FROM incident_events
     WHERE incident_id = $1
     ORDER BY received_at DESC
     LIMIT 50`,
    [id],
  );

  return { ...rows[0], events: events.rows };
}

async function updateIncidentStatus(id, status) {
  const allowed = ["open", "acknowledged", "resolved", "ignored"];
  if (!allowed.includes(status)) {
    const err = new Error(`Status inválido: ${status}`);
    err.status = 400;
    throw err;
  }
  const { rows } = await pool.query(
    `UPDATE incidents SET status = $2 WHERE id = $1 RETURNING *`,
    [id, status],
  );
  return rows[0] || null;
}

module.exports = {
  upsertIncident,
  listIncidents,
  getIncidentById,
  updateIncidentStatus,
};
