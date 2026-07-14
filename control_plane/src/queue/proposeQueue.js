const { Queue, Worker } = require("bullmq");
const { getRedisConnection, isRedisEnabled } = require("./redis");
const { getLatestDiagnosis } = require("../services/diagnosisService");
const {
  createPendingProposal,
  completeProposal,
  failProposal,
  getProposalById,
} = require("../services/proposalService");
const { runProposal } = require("../services/proposalAgent");
const { notifyAfterProposalReady } = require("../services/notifyHooks");

const QUEUE_NAME = "incident-propose";

let queue = null;
let worker = null;

function getQueue() {
  if (!isRedisEnabled()) return null;
  if (queue) return queue;
  queue = new Queue(QUEUE_NAME, { connection: getRedisConnection() });
  return queue;
}

async function processProposeJob({ incidentId }) {
  const diagnosis = await getLatestDiagnosis(incidentId);
  if (!diagnosis || diagnosis.status !== "completed") {
    const err = new Error(
      "É necessário um diagnóstico completed antes de propor correção",
    );
    err.status = 409;
    throw err;
  }

  const pending = await createPendingProposal({
    incidentId,
    diagnosisId: diagnosis.id,
  });

  try {
    const built = await runProposal({ incidentId, diagnosis });
    if (built.errorMessage && built.model?.includes("heuristic")) {
      // ainda grava proposta heurística utilizável
    }
    await completeProposal(pending.id, built);
    const proposal = await getProposalById(pending.id);
    await notifyAfterProposalReady(proposal);
    return { proposal };
  } catch (err) {
    await failProposal(pending.id, err.message);
    throw err;
  }
}

async function enqueuePropose({ incidentId }) {
  const q = getQueue();
  if (!q) {
    return processProposeJob({ incidentId });
  }

  const job = await q.add(
    "propose",
    { incidentId },
    {
      removeOnComplete: 500,
      removeOnFail: 1000,
      attempts: 2,
      backoff: { type: "exponential", delay: 2000 },
    },
  );
  return { queued: true, jobId: job.id };
}

function startProposeWorker() {
  if (!isRedisEnabled() || worker) {
    return { enabled: isRedisEnabled() };
  }

  worker = new Worker(
    QUEUE_NAME,
    async (job) => processProposeJob(job.data),
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on("failed", (job, err) => {
    console.error(
      JSON.stringify({
        level: "error",
        message: "propose_job_failed",
        jobId: job?.id,
        error: err.message,
      }),
    );
  });

  worker.on("completed", (job, result) => {
    console.log(
      JSON.stringify({
        level: "info",
        message: "propose_job_completed",
        jobId: job.id,
        proposalId: result?.proposal?.id,
        riskTier: result?.proposal?.risk_tier,
      }),
    );
  });

  console.log(
    JSON.stringify({
      level: "info",
      message: "propose_worker_started",
      queue: QUEUE_NAME,
    }),
  );

  return { enabled: true };
}

async function shutdownProposeQueue() {
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
  enqueuePropose,
  processProposeJob,
  startProposeWorker,
  shutdownProposeQueue,
};
