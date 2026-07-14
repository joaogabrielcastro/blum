const { Queue, Worker } = require("bullmq");
const { getRedisConnection, isRedisEnabled, quitRedis } = require("./redis");
const { normalizeIngestPayload } = require("../services/normalizers");
const { upsertIncident } = require("../services/incidentService");
const { enqueueDiagnose } = require("./diagnoseQueue");

const QUEUE_NAME = "incident-ingest";

let queue = null;
let worker = null;

function isQueueEnabled() {
  return isRedisEnabled();
}

function getQueue() {
  if (!isQueueEnabled()) return null;
  if (queue) return queue;
  queue = new Queue(QUEUE_NAME, { connection: getRedisConnection() });
  return queue;
}

async function processIngestJob(jobData) {
  const normalized = normalizeIngestPayload(jobData.sourceHint, jobData.body);
  const result = await upsertIncident(jobData.projectId, normalized);

  try {
    const diag = await enqueueDiagnose({
      incidentId: result.incident.id,
      created: result.created,
    });
    result.diagnosis = diag;
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "diagnose_enqueue_failed",
        incidentId: result.incident.id,
        error: err.message,
      }),
    );
  }

  return result;
}

async function enqueueIngest({ projectId, sourceHint, body }) {
  const q = getQueue();
  if (!q) {
    return processIngestJob({ projectId, sourceHint, body });
  }

  const job = await q.add(
    "ingest",
    { projectId, sourceHint, body },
    {
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    },
  );

  return { queued: true, jobId: job.id };
}

function startWorker() {
  if (!isQueueEnabled() || worker) {
    return { enabled: isQueueEnabled() };
  }

  worker = new Worker(
    QUEUE_NAME,
    async (job) => processIngestJob(job.data),
    { connection: getRedisConnection() },
  );

  worker.on("failed", (job, err) => {
    console.error(
      JSON.stringify({
        level: "error",
        message: "ingest_job_failed",
        jobId: job?.id,
        error: err.message,
      }),
    );
  });

  console.log(
    JSON.stringify({
      level: "info",
      message: "ingest_worker_started",
      queue: QUEUE_NAME,
    }),
  );

  return { enabled: true };
}

async function shutdownQueue() {
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
  enqueueIngest,
  processIngestJob,
  startWorker,
  shutdownQueue,
  isQueueEnabled,
  quitRedis,
};
