const { pool } = require("../config/database");

async function setIncidentDiagnosisStatus(incidentId, status) {
  await pool.query(
    `UPDATE incidents SET diagnosis_status = $2 WHERE id = $1`,
    [incidentId, status],
  );
}

async function createPendingDiagnosis(incidentId) {
  const { rows } = await pool.query(
    `INSERT INTO diagnoses (incident_id, status, hypothesis)
     VALUES ($1, 'pending', '')
     RETURNING *`,
    [incidentId],
  );
  await setIncidentDiagnosisStatus(incidentId, "pending");
  return rows[0];
}

async function completeDiagnosis(diagnosisId, payload) {
  const { rows } = await pool.query(
    `UPDATE diagnoses SET
       status = 'completed',
       hypothesis = $2,
       evidence = $3::jsonb,
       confidence = $4,
       suspect_files = $5::jsonb,
       root_cause_category = $6,
       recommended_next_steps = $7::jsonb,
       model = $8,
       token_input = $9,
       token_output = $10,
       context_pack = $11::jsonb,
       raw_response = $12::jsonb,
       error_message = NULL
     WHERE id = $1
     RETURNING *`,
    [
      diagnosisId,
      payload.hypothesis,
      JSON.stringify(payload.evidence || []),
      payload.confidence,
      JSON.stringify(payload.suspectFiles || []),
      payload.rootCauseCategory || null,
      JSON.stringify(payload.recommendedNextSteps || []),
      payload.model || null,
      payload.tokenInput ?? null,
      payload.tokenOutput ?? null,
      JSON.stringify(payload.contextPack || {}),
      JSON.stringify(payload.rawResponse || null),
    ],
  );

  if (rows[0]) {
    await setIncidentDiagnosisStatus(rows[0].incident_id, "ready");
  }
  return rows[0];
}

async function failDiagnosis(diagnosisId, errorMessage, contextPack = {}) {
  const { rows } = await pool.query(
    `UPDATE diagnoses SET
       status = 'failed',
       hypothesis = COALESCE(NULLIF(hypothesis, ''), 'Diagnóstico falhou'),
       error_message = $2,
       context_pack = $3::jsonb
     WHERE id = $1
     RETURNING *`,
    [diagnosisId, String(errorMessage).slice(0, 2000), JSON.stringify(contextPack)],
  );
  if (rows[0]) {
    await setIncidentDiagnosisStatus(rows[0].incident_id, "failed");
  }
  return rows[0];
}

async function getLatestDiagnosis(incidentId) {
  const { rows } = await pool.query(
    `SELECT * FROM diagnoses
     WHERE incident_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [incidentId],
  );
  return rows[0] || null;
}

async function listDiagnosesForIncident(incidentId, limit = 10) {
  const { rows } = await pool.query(
    `SELECT * FROM diagnoses
     WHERE incident_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [incidentId, Math.min(Number(limit) || 10, 50)],
  );
  return rows;
}

/**
 * Evita re-diagnóstico excessivo: true se pode rodar agora.
 */
async function shouldAutoDiagnose(incidentId, { force = false, created = false } = {}) {
  if (force || created) return true;

  const latest = await getLatestDiagnosis(incidentId);
  if (!latest) return true;

  if (latest.status === "pending") return false;

  const cooldownMin = Number(process.env.DIAGNOSIS_COOLDOWN_MINUTES || 30);
  const ageMs = Date.now() - new Date(latest.created_at).getTime();
  return ageMs >= cooldownMin * 60 * 1000;
}

module.exports = {
  setIncidentDiagnosisStatus,
  createPendingDiagnosis,
  completeDiagnosis,
  failDiagnosis,
  getLatestDiagnosis,
  listDiagnosesForIncident,
  shouldAutoDiagnose,
};
