/**
 * Persistência de status de Pull Request / CI (Fase 5).
 */

const { pool } = require("../config/database");

async function setIncidentPrStatus(incidentId, status) {
  await pool.query(`UPDATE incidents SET pr_status = $2 WHERE id = $1`, [
    incidentId,
    status,
  ]);
}

async function markPrQueued(proposalId) {
  const { rows } = await pool.query(
    `UPDATE proposals SET
       pr_status = 'queued',
       pr_error = NULL,
       updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [proposalId],
  );
  if (rows[0]) {
    await setIncidentPrStatus(rows[0].incident_id, "queued");
  }
  return rows[0] || null;
}

async function markPrOpening(proposalId) {
  const { rows } = await pool.query(
    `UPDATE proposals SET
       pr_status = 'opening',
       updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [proposalId],
  );
  if (rows[0]) {
    await setIncidentPrStatus(rows[0].incident_id, "opening");
  }
  return rows[0] || null;
}

async function markPrOpened(proposalId, payload) {
  const { rows } = await pool.query(
    `UPDATE proposals SET
       pr_status = 'opened',
       pr_url = $2,
       pr_number = $3,
       pr_branch = $4,
       pr_agent_id = $5,
       pr_error = NULL,
       ci_status = COALESCE($6, ci_status),
       updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      proposalId,
      payload.prUrl || null,
      payload.prNumber ?? null,
      payload.prBranch || null,
      payload.agentId || null,
      payload.ciStatus || "pending",
    ],
  );
  if (rows[0]) {
    await setIncidentPrStatus(rows[0].incident_id, "opened");
  }
  return rows[0] || null;
}

async function markPrFailed(proposalId, errorMessage) {
  const { rows } = await pool.query(
    `UPDATE proposals SET
       pr_status = 'failed',
       pr_error = $2,
       updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [proposalId, String(errorMessage || "").slice(0, 2000)],
  );
  if (rows[0]) {
    await setIncidentPrStatus(rows[0].incident_id, "failed");
  }
  return rows[0] || null;
}

async function markPrSkipped(proposalId, reason) {
  const { rows } = await pool.query(
    `UPDATE proposals SET
       pr_status = 'skipped',
       pr_error = $2,
       ci_status = 'skipped',
       updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [proposalId, String(reason || "").slice(0, 2000)],
  );
  if (rows[0]) {
    await setIncidentPrStatus(rows[0].incident_id, "skipped");
  }
  return rows[0] || null;
}

async function updateCiStatus(proposalId, { status, summary }) {
  const { rows } = await pool.query(
    `UPDATE proposals SET
       ci_status = $2,
       ci_summary = $3::jsonb,
       ci_checked_at = now(),
       updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [proposalId, status, JSON.stringify(summary || {})],
  );
  return rows[0] || null;
}

function isPrOnApproveEnabled() {
  const raw = String(process.env.PR_ON_APPROVE || "true").toLowerCase();
  return !["0", "false", "no", "off"].includes(raw);
}

module.exports = {
  setIncidentPrStatus,
  markPrQueued,
  markPrOpening,
  markPrOpened,
  markPrFailed,
  markPrSkipped,
  updateCiStatus,
  isPrOnApproveEnabled,
};
