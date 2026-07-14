const { Queue, Worker } = require("bullmq");
const { getRedisConnection, isRedisEnabled } = require("./redis");
const { getProposalById } = require("../services/proposalService");
const { getIncidentById } = require("../services/incidentService");
const { pool } = require("../config/database");
const { openPrWithCursor } = require("../services/openPrAgent");
const {
  markPrQueued,
  markPrOpening,
  markPrOpened,
  markPrFailed,
  markPrSkipped,
  updateCiStatus,
  isPrOnApproveEnabled,
} = require("../services/prService");
const { pollPullRequestChecks, parseRepoFullName } = require("../services/githubPr");
const { notifyAfterPrResult } = require("../services/notifyHooks");

const QUEUE_NAME = "incident-open-pr";

let queue = null;
let worker = null;

function getQueue() {
  if (!isRedisEnabled()) return null;
  if (queue) return queue;
  queue = new Queue(QUEUE_NAME, { connection: getRedisConnection() });
  return queue;
}

async function loadProject(projectId) {
  const { rows } = await pool.query(`SELECT * FROM projects WHERE id = $1`, [
    projectId,
  ]);
  return rows[0] || null;
}

async function processOpenPrJob({ proposalId }) {
  const proposal = await getProposalById(proposalId);
  if (!proposal) {
    const err = new Error("Proposta não encontrada");
    err.status = 404;
    throw err;
  }
  if (proposal.status !== "approved") {
    const err = new Error(
      `Proposta precisa estar approved (status=${proposal.status})`,
    );
    err.status = 409;
    throw err;
  }

  const files = proposal.files || [];
  if (!files.length) {
    const skipped = await markPrSkipped(
      proposalId,
      "Sem arquivos no diff — nada a abrir como PR (ex.: incidente sintético).",
    );
    const proposalOut = await getProposalById(proposalId);
    await notifyAfterPrResult(proposalOut, { kind: "skipped" });
    return { proposal: proposalOut, skipped: true, row: skipped };
  }

  await markPrOpening(proposalId);

  try {
    const incident = await getIncidentById(proposal.incident_id);
    const project = incident ? await loadProject(incident.project_id) : null;
    const diagnosis = proposal.diagnosis_id
      ? (
          await pool.query(`SELECT * FROM diagnoses WHERE id = $1`, [
            proposal.diagnosis_id,
          ])
        ).rows[0]
      : null;

    const opened = await openPrWithCursor({
      proposal,
      files,
      incident,
      project,
      diagnosis,
    });

    if (!opened.prUrl) {
      await markPrFailed(
        proposalId,
        "Cursor finalizou sem prUrl — verifique o dashboard Cursor / integração GitHub",
      );
      const failed = await getProposalById(proposalId);
      await notifyAfterPrResult(failed, { kind: "failed" });
      return { proposal: failed, opened: false };
    }

    await markPrOpened(proposalId, {
      prUrl: opened.prUrl,
      prNumber: opened.prNumber,
      prBranch: opened.prBranch,
      agentId: opened.agentId || opened.runId,
      ciStatus: "pending",
    });

    const repo =
      opened.raw?.repoFullName ||
      parseRepoFullName(project?.repo_full_name) ||
      null;

    if (opened.prNumber && repo) {
      try {
        const ci = await pollPullRequestChecks({
          repoFullName: repo,
          prNumber: opened.prNumber,
        });
        await updateCiStatus(proposalId, {
          status: ci.status,
          summary: ci.summary,
        });
      } catch (ciErr) {
        await updateCiStatus(proposalId, {
          status: "unknown",
          summary: { error: ciErr.message },
        });
      }
    }

    const finalProposal = await getProposalById(proposalId);
    await notifyAfterPrResult(finalProposal, { kind: "opened" });
    return {
      proposal: finalProposal,
      opened: true,
      prUrl: opened.prUrl,
    };
  } catch (err) {
    await markPrFailed(proposalId, err.message);
    const failed = await getProposalById(proposalId).catch(() => null);
    if (failed) await notifyAfterPrResult(failed, { kind: "failed" });
    throw err;
  }
}

async function enqueueOpenPr({ proposalId }) {
  if (!isPrOnApproveEnabled()) {
    const skipped = await markPrSkipped(
      proposalId,
      "PR_ON_APPROVE desabilitado",
    );
    return {
      queued: false,
      skipped: true,
      proposal: await getProposalById(proposalId),
      row: skipped,
    };
  }

  await markPrQueued(proposalId);

  const q = getQueue();
  if (!q) {
    return processOpenPrJob({ proposalId });
  }

  const job = await q.add(
    "open-pr",
    { proposalId },
    {
      removeOnComplete: 500,
      removeOnFail: 1000,
      attempts: 2,
      backoff: { type: "exponential", delay: 5000 },
    },
  );
  return { queued: true, jobId: job.id };
}

function startOpenPrWorker() {
  if (!isRedisEnabled() || worker) {
    return { enabled: isRedisEnabled() };
  }

  worker = new Worker(
    QUEUE_NAME,
    async (job) => processOpenPrJob(job.data),
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on("failed", (job, err) => {
    console.error(
      JSON.stringify({
        level: "error",
        message: "open_pr_job_failed",
        jobId: job?.id,
        error: err.message,
      }),
    );
  });

  worker.on("completed", (job, result) => {
    console.log(
      JSON.stringify({
        level: "info",
        message: "open_pr_job_completed",
        jobId: job.id,
        proposalId: result?.proposal?.id,
        prStatus: result?.proposal?.pr_status,
        prUrl: result?.prUrl || result?.proposal?.pr_url || null,
      }),
    );
  });

  console.log(
    JSON.stringify({
      level: "info",
      message: "open_pr_worker_started",
      queue: QUEUE_NAME,
    }),
  );

  return { enabled: true };
}

async function shutdownOpenPrQueue() {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (queue) {
    await queue.close();
    queue = null;
  }
}

module.exports = {
  enqueueOpenPr,
  processOpenPrJob,
  startOpenPrWorker,
  shutdownOpenPrQueue,
};
