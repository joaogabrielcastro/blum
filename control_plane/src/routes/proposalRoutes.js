const express = require("express");
const { requireAdmin } = require("../middleware/adminAuth");
const {
  listProposals,
  getProposalById,
  recordApproval,
} = require("../services/proposalService");
const { enqueuePropose } = require("../queue/proposeQueue");
const { enqueueOpenPr } = require("../queue/openPrQueue");
const { getIncidentById } = require("../services/incidentService");
const { pool } = require("../config/database");
const {
  updateCiStatus,
  isPrOnApproveEnabled,
} = require("../services/prService");
const {
  pollPullRequestChecks,
  parseRepoFullName,
  parsePrUrl,
} = require("../services/githubPr");

const router = express.Router();

router.use(requireAdmin);

router.get("/", async (req, res, next) => {
  try {
    const proposals = await listProposals({
      incidentId: req.query.incidentId || null,
      status: req.query.status || null,
      limit: req.query.limit,
    });
    res.json({ proposals });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const proposal = await getProposalById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ error: "Proposta não encontrada" });
    }
    res.json({ proposal });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/approve", async (req, res, next) => {
  try {
    const proposal = await recordApproval({
      proposalId: req.params.id,
      decision: "approve",
      comment: req.body?.comment,
      tags: req.body?.tags,
      actor: "admin",
    });

    let pr = null;
    if (isPrOnApproveEnabled()) {
      pr = await enqueueOpenPr({ proposalId: proposal.id });
    }

    const refreshed = await getProposalById(proposal.id);
    res.json({
      proposal: refreshed,
      pr: pr
        ? {
            queued: Boolean(pr.queued),
            skipped: Boolean(pr.skipped),
            jobId: pr.jobId || null,
            prUrl: pr.prUrl || pr.proposal?.pr_url || null,
            prStatus: pr.proposal?.pr_status || refreshed.pr_status,
          }
        : { queued: false, skipped: true, reason: "PR_ON_APPROVE=false" },
      note: isPrOnApproveEnabled()
        ? "Aprovado. Abrindo PR (Fase 5) — sem merge automático."
        : "Aprovado. Abertura de PR desabilitada (PR_ON_APPROVE=false).",
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/reject", async (req, res, next) => {
  try {
    const proposal = await recordApproval({
      proposalId: req.params.id,
      decision: "reject",
      comment: req.body?.comment,
      tags: req.body?.tags,
      actor: "admin",
    });
    res.json({ proposal });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/revise", async (req, res, next) => {
  try {
    const proposal = await recordApproval({
      proposalId: req.params.id,
      decision: "revise",
      comment: req.body?.comment,
      tags: req.body?.tags,
      actor: "admin",
    });
    res.json({ proposal });
  } catch (err) {
    next(err);
  }
});

/** Re-tenta abrir PR após approve (ou falha anterior). */
router.post("/:id/open-pr", async (req, res, next) => {
  try {
    const proposal = await getProposalById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ error: "Proposta não encontrada" });
    }
    if (proposal.status !== "approved") {
      return res
        .status(409)
        .json({ error: "Só é possível abrir PR de proposta approved" });
    }
    const result = await enqueueOpenPr({ proposalId: proposal.id });
    if (result.queued) {
      return res.status(202).json({
        accepted: true,
        queued: true,
        jobId: result.jobId,
      });
    }
    res.json({
      accepted: true,
      queued: false,
      skipped: Boolean(result.skipped),
      proposal: result.proposal,
    });
  } catch (err) {
    next(err);
  }
});

/** Atualiza status de CI (check runs) da PR aberta. */
router.post("/:id/refresh-ci", async (req, res, next) => {
  try {
    const proposal = await getProposalById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ error: "Proposta não encontrada" });
    }
    if (!proposal.pr_url && !proposal.pr_number) {
      return res.status(409).json({ error: "Proposta ainda sem PR" });
    }

    const parsed = parsePrUrl(proposal.pr_url);
    let repo = parsed?.repoFullName || null;
    let prNumber = proposal.pr_number || parsed?.prNumber || null;

    if (!repo) {
      const incident = await getIncidentById(proposal.incident_id);
      if (incident) {
        const { rows } = await pool.query(
          `SELECT repo_full_name FROM projects WHERE id = $1`,
          [incident.project_id],
        );
        repo = parseRepoFullName(rows[0]?.repo_full_name);
      }
    }

    const ci = await pollPullRequestChecks({
      repoFullName: repo,
      prNumber,
    });
    await updateCiStatus(proposal.id, {
      status: ci.status,
      summary: ci.summary,
    });

    res.json({
      proposal: await getProposalById(proposal.id),
      ci,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Helper: criar proposta a partir de incidentId no body
 * (também exposto em POST /incidents/:id/propose)
 */
router.post("/", async (req, res, next) => {
  try {
    const incidentId = req.body?.incidentId;
    if (!incidentId) {
      return res.status(400).json({ error: "incidentId é obrigatório" });
    }
    const incident = await getIncidentById(incidentId);
    if (!incident) {
      return res.status(404).json({ error: "Incidente não encontrado" });
    }
    const result = await enqueuePropose({ incidentId });
    if (result.queued) {
      return res
        .status(202)
        .json({ accepted: true, queued: true, jobId: result.jobId });
    }
    res
      .status(201)
      .json({ accepted: true, queued: false, proposal: result.proposal });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
