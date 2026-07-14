/**
 * Helper: carrega contexto mínimo e dispara notificação Telegram sem quebrar o job.
 */
const { getIncidentById } = require("./incidentService");
const { pool } = require("../config/database");
const {
  notifyProposalAwaitingApproval,
  notifyPrOpened,
  notifyPrOutcome,
} = require("./telegramNotify");

async function loadProjectSlug(projectId) {
  if (!projectId) return null;
  const { rows } = await pool.query(
    `SELECT slug FROM projects WHERE id = $1`,
    [projectId],
  );
  return rows[0]?.slug || null;
}

async function notifyAfterProposalReady(proposal) {
  if (!proposal || proposal.status !== "awaiting_approval") return;
  try {
    const incident = await getIncidentById(proposal.incident_id);
    const projectSlug = incident
      ? await loadProjectSlug(incident.project_id)
      : null;
    await notifyProposalAwaitingApproval({
      proposal,
      incident,
      projectSlug,
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "telegram_hook_failed",
        hook: "proposal_ready",
        error: err.message,
      }),
    );
  }
}

async function notifyAfterPrResult(proposal, { kind }) {
  if (!proposal) return;
  try {
    const incident = await getIncidentById(proposal.incident_id);
    const projectSlug = incident
      ? await loadProjectSlug(incident.project_id)
      : null;
    if (kind === "opened") {
      await notifyPrOpened({ proposal, incident, projectSlug });
    } else {
      await notifyPrOutcome({ proposal, incident, projectSlug, kind });
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "telegram_hook_failed",
        hook: `pr_${kind}`,
        error: err.message,
      }),
    );
  }
}

module.exports = {
  notifyAfterProposalReady,
  notifyAfterPrResult,
};
