const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const projectRoutes = require("./routes/projectRoutes");
const incidentRoutes = require("./routes/incidentRoutes");
const ingestRoutes = require("./routes/ingestRoutes");
const proposalRoutes = require("./routes/proposalRoutes");
const { isQueueEnabled } = require("./queue/ingestQueue");
const { isLlmConfigured } = require("./services/llmClient");
const { isCursorConfigured, getDiagnosisProvider } = require("./services/diagnoseAgent");
const { isTelegramConfigured } = require("./services/telegramNotify");

function createApp() {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      service: "control-plane",
      queue: isQueueEnabled(),
      llm: isLlmConfigured(),
      cursor: isCursorConfigured(),
      telegram: isTelegramConfigured(),
      diagnosisProvider: getDiagnosisProvider(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/v1/status", (req, res) => {
    res.json({
      status: "online",
      phase: 5,
      queueEnabled: isQueueEnabled(),
      llmEnabled: isLlmConfigured(),
      cursorEnabled: isCursorConfigured(),
      telegramEnabled: isTelegramConfigured(),
      diagnosisProvider: getDiagnosisProvider(),
      uptime: process.uptime(),
    });
  });
  app.use("/api/v1/projects", projectRoutes);
  app.use("/api/v1/incidents", incidentRoutes);
  app.use("/api/v1/ingest", ingestRoutes);
  app.use("/api/v1/proposals", proposalRoutes);
  app.use("/api/v1/notifications", require("./routes/notifyRoutes"));

  const publicDir = path.join(__dirname, "..", "public");
  app.use(express.static(publicDir));
  app.get("/", (req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });

  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    console.error(
      JSON.stringify({
        level: "error",
        message: err.message,
        stack: err.stack,
      }),
    );
    const status = Number(err.status || err.statusCode) || 500;
    res.status(status).json({
      error: status >= 500 ? "Erro interno" : err.message || "Erro",
    });
  });

  return app;
}

module.exports = { createApp };
