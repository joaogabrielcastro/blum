require("dotenv").config({ override: false });

const { ensureDatabase } = require("./src/db/ensureDatabase");
const { runMigrations } = require("./src/db/migrate");
const { seedProjectFromEnv } = require("./src/services/projectService");
const {
  startWorker,
  shutdownQueue,
  quitRedis,
} = require("./src/queue/ingestQueue");
const {
  startDiagnoseWorker,
  shutdownDiagnoseQueue,
} = require("./src/queue/diagnoseQueue");
const {
  startProposeWorker,
  shutdownProposeQueue,
} = require("./src/queue/proposeQueue");
const {
  startOpenPrWorker,
  shutdownOpenPrQueue,
} = require("./src/queue/openPrQueue");
const { createApp } = require("./src/createApp");
const { isLlmConfigured, getLlmConfig } = require("./src/services/llmClient");
const {
  isCursorConfigured,
  getDiagnosisProvider,
} = require("./src/services/diagnoseAgent");
const { isPrOnApproveEnabled } = require("./src/services/prService");

const app = createApp();
const port = Number(process.env.PORT) || 3020;

async function start() {
  try {
    await ensureDatabase();
    await runMigrations();
    await seedProjectFromEnv();
    startWorker();
    startDiagnoseWorker();
    startProposeWorker();
    startOpenPrWorker();

    const llm = getLlmConfig();
    app.listen(port, "0.0.0.0", () => {
      console.log(
        JSON.stringify({
          level: "info",
          message: "control_plane_listening",
          port,
          phase: 5,
          diagnosisProvider: getDiagnosisProvider(),
          cursor: isCursorConfigured(),
          llm: isLlmConfigured(),
          llmProvider: llm.enabled ? llm.provider : null,
          prOnApprove: isPrOnApproveEnabled(),
        }),
      );
    });
  } catch (err) {
    console.error("Falha ao iniciar Control Plane:", err);
    process.exit(1);
  }
}

async function shutdown() {
  await shutdownOpenPrQueue();
  await shutdownProposeQueue();
  await shutdownDiagnoseQueue();
  await shutdownQueue();
  await quitRedis();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

start();

module.exports = app;
