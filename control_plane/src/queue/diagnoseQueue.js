const { Queue, Worker } = require("bullmq");
const { getRedisConnection, isRedisEnabled } = require("./redis");
const { buildIncidentContext } = require("../services/contextBuilder");
const { runDiagnosis } = require("../services/diagnoseAgent");
const {
  createPendingDiagnosis,
  completeDiagnosis,
  failDiagnosis,
  shouldAutoDiagnose,
} = require("../services/diagnosisService");

const QUEUE_NAME = "incident-diagnose";

let queue = null;
let worker = null;

function getQueue() {
  if (!isRedisEnabled()) return null;
  if (queue) return queue;
  queue = new Queue(QUEUE_NAME, { connection: getRedisConnection() });
  return queue;
}

async function processDiagnoseJob({ incidentId, force = false }) {
  const ok = await shouldAutoDiagnose(incidentId, { force, created: force });
  if (!ok && !force) {
    return { skipped: true, reason: "cooldown" };
  }

  const pending = await createPendingDiagnosis(incidentId);
  let contextPack;
  try {
    contextPack = await buildIncidentContext(incidentId);
    const result = await runDiagnosis(contextPack);
    const saved = await completeDiagnosis(pending.id, result);
    return { skipped: false, diagnosis: saved };
  } catch (err) {
    await failDiagnosis(pending.id, err.message, contextPack || {});
    throw err;
  }
}

async function enqueueDiagnose({ incidentId, force = false, created = false }) {
  const allowed = await shouldAutoDiagnose(incidentId, { force, created });
  if (!allowed) {
    return { skipped: true, reason: "cooldown" };
  }

  const q = getQueue();
  if (!q) {
    return processDiagnoseJob({ incidentId, force: force || created });
  }

  const job = await q.add(
    "diagnose",
    { incidentId, force: force || created },
    {
      removeOnComplete: 500,
      removeOnFail: 1000,
      attempts: 2,
      backoff: { type: "exponential", delay: 2000 },
    },
  );

  return { queued: true, jobId: job.id };
}

function startDiagnoseWorker() {
  if (!isRedisEnabled() || worker) {
    return { enabled: isRedisEnabled() };
  }

  worker = new Worker(
    QUEUE_NAME,
    async (job) => processDiagnoseJob(job.data),
    { connection: getRedisConnection(), concurrency: 2 },
  );

  worker.on("failed", (job, err) => {
    console.error(
      JSON.stringify({
        level: "error",
        message: "diagnose_job_failed",
        jobId: job?.id,
        error: err.message,
      }),
    );
  });

  worker.on("completed", (job, result) => {
    if (result?.skipped) return;
    console.log(
      JSON.stringify({
        level: "info",
        message: "diagnose_job_completed",
        jobId: job.id,
        diagnosisId: result?.diagnosis?.id,
        confidence: result?.diagnosis?.confidence,
      }),
    );
  });

  console.log(
    JSON.stringify({
      level: "info",
      message: "diagnose_worker_started",
      queue: QUEUE_NAME,
    }),
  );

  return { enabled: true };
}

async function shutdownDiagnoseQueue() {
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
  enqueueDiagnose,
  processDiagnoseJob,
  startDiagnoseWorker,
  shutdownDiagnoseQueue,
};
