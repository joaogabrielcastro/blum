const { pool } = require("../config/database");

async function setIncidentProposalStatus(incidentId, status) {
  await pool.query(
    `UPDATE incidents SET proposal_status = $2 WHERE id = $1`,
    [incidentId, status],
  );
}

async function createPendingProposal({ incidentId, diagnosisId }) {
  const { rows } = await pool.query(
    `INSERT INTO proposals (incident_id, diagnosis_id, status, summary)
     VALUES ($1, $2, 'pending', '')
     RETURNING *`,
    [incidentId, diagnosisId || null],
  );
  await setIncidentProposalStatus(incidentId, "pending");
  return rows[0];
}

async function completeProposal(proposalId, payload) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query(
      `UPDATE proposals SET
         status = $2,
         summary = $3,
         rationale = $4,
         test_plan = $5::jsonb,
         confidence = $6,
         risk_level = $7,
         policy_mode = $8,
         risk_tier = $9,
         model = $10,
         token_input = $11,
         token_output = $12,
         context_pack = $13::jsonb,
         raw_response = $14::jsonb,
         error_message = NULL,
         updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        proposalId,
        payload.status || "awaiting_approval",
        payload.summary,
        payload.rationale,
        JSON.stringify(payload.testPlan || []),
        payload.confidence,
        payload.riskLevel,
        payload.policyMode,
        payload.riskTier,
        payload.model || null,
        payload.tokenInput ?? null,
        payload.tokenOutput ?? null,
        JSON.stringify(payload.contextPack || {}),
        JSON.stringify(payload.rawResponse || null),
      ],
    );

    await client.query(`DELETE FROM proposal_files WHERE proposal_id = $1`, [
      proposalId,
    ]);

    for (const file of payload.files || []) {
      await client.query(
        `INSERT INTO proposal_files (proposal_id, path, change_type, diff_unified, risk_tier)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          proposalId,
          file.path,
          file.changeType || "modify",
          file.diffUnified || "",
          file.riskTier || "MEDIUM",
        ],
      );
    }

    await client.query("COMMIT");
    const proposal = updated.rows[0];
    if (proposal) {
      await setIncidentProposalStatus(
        proposal.incident_id,
        proposal.status === "awaiting_approval" ? "awaiting_approval" : proposal.status,
      );
    }
    return proposal;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function failProposal(proposalId, errorMessage) {
  const { rows } = await pool.query(
    `UPDATE proposals SET
       status = 'failed',
       error_message = $2,
       summary = COALESCE(NULLIF(summary, ''), 'Proposta falhou'),
       updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [proposalId, String(errorMessage).slice(0, 2000)],
  );
  if (rows[0]) {
    await setIncidentProposalStatus(rows[0].incident_id, "failed");
  }
  return rows[0];
}

async function getProposalById(id) {
  const { rows } = await pool.query(`SELECT * FROM proposals WHERE id = $1`, [
    id,
  ]);
  if (!rows[0]) return null;
  const files = await pool.query(
    `SELECT * FROM proposal_files WHERE proposal_id = $1 ORDER BY path`,
    [id],
  );
  const approvals = await pool.query(
    `SELECT * FROM approvals WHERE proposal_id = $1 ORDER BY decided_at DESC`,
    [id],
  );
  return { ...rows[0], files: files.rows, approvals: approvals.rows };
}

async function getLatestProposal(incidentId) {
  const { rows } = await pool.query(
    `SELECT * FROM proposals WHERE incident_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [incidentId],
  );
  if (!rows[0]) return null;
  return getProposalById(rows[0].id);
}

async function listProposals({ incidentId, status, limit = 50 } = {}) {
  const params = [];
  const where = [];
  if (incidentId) {
    params.push(incidentId);
    where.push(`p.incident_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    where.push(`p.status = $${params.length}`);
  }
  params.push(Math.min(Number(limit) || 50, 200));
  const { rows } = await pool.query(
    `SELECT p.*, i.title AS incident_title, proj.slug AS project_slug
     FROM proposals p
     JOIN incidents i ON i.id = p.incident_id
     JOIN projects proj ON proj.id = i.project_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY p.created_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return rows;
}

async function recordApproval({ proposalId, decision, comment, tags, actor }) {
  const allowed = ["approve", "reject", "revise"];
  if (!allowed.includes(decision)) {
    const err = new Error(`Decisão inválida: ${decision}`);
    err.status = 400;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const proposal = await client.query(
      `SELECT * FROM proposals WHERE id = $1 FOR UPDATE`,
      [proposalId],
    );
    if (!proposal.rows[0]) {
      const err = new Error("Proposta não encontrada");
      err.status = 404;
      throw err;
    }
    if (!["awaiting_approval", "draft"].includes(proposal.rows[0].status)) {
      const err = new Error(
        `Proposta não está aguardando aprovação (status=${proposal.rows[0].status})`,
      );
      err.status = 409;
      throw err;
    }

    await client.query(
      `INSERT INTO approvals (proposal_id, decision, comment, tags, actor)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        proposalId,
        decision,
        comment || null,
        tags || [],
        actor || "admin",
      ],
    );

    const nextStatus =
      decision === "approve"
        ? "approved"
        : decision === "reject"
          ? "rejected"
          : "draft";

    const updated = await client.query(
      `UPDATE proposals SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`,
      [proposalId, nextStatus],
    );

    await client.query(
      `UPDATE incidents SET proposal_status = $2 WHERE id = $1`,
      [updated.rows[0].incident_id, nextStatus],
    );

    await client.query(
      `INSERT INTO audit_logs (actor_type, actor_id, action, project_id, payload)
       VALUES ('user', $1, $2, NULL, $3::jsonb)`,
      [
        actor || "admin",
        `proposal.${decision}`,
        JSON.stringify({
          proposalId,
          incidentId: updated.rows[0].incident_id,
          comment: comment || null,
        }),
      ],
    );

    await client.query("COMMIT");
    return getProposalById(proposalId);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createPendingProposal,
  completeProposal,
  failProposal,
  getProposalById,
  getLatestProposal,
  listProposals,
  recordApproval,
  setIncidentProposalStatus,
};
