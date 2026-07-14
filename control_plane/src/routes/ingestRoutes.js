const express = require("express");
const { requireIngestAuth } = require("../middleware/ingestAuth");
const { enqueueIngest, isQueueEnabled } = require("../queue/ingestQueue");

const router = express.Router();

/**
 * POST /api/v1/ingest/:projectSlug
 * Body genérico OU payload Sentry webhook.
 */
router.post("/:projectSlug", requireIngestAuth, async (req, res, next) => {
  try {
    const sourceHint =
      req.query.source ||
      req.headers["x-ingest-source"] ||
      (req.body?.action || req.body?.data?.event ? "sentry" : "generic");

    const result = await enqueueIngest({
      projectId: req.project.id,
      sourceHint,
      body: req.body || {},
    });

    if (result.queued) {
      return res.status(202).json({
        accepted: true,
        queued: true,
        jobId: result.jobId,
        queueEnabled: isQueueEnabled(),
      });
    }

    res.status(result.created ? 201 : 200).json({
      accepted: true,
      queued: false,
      created: result.created,
      incident: {
        id: result.incident.id,
        fingerprint: result.incident.fingerprint,
        title: result.incident.title,
        severity: result.incident.severity,
        status: result.incident.status,
        eventCount: result.incident.event_count,
        lastSeen: result.incident.last_seen,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Atalho Sentry: POST /api/v1/ingest/:projectSlug/sentry
 */
router.post(
  "/:projectSlug/sentry",
  requireIngestAuth,
  async (req, res, next) => {
    try {
      const result = await enqueueIngest({
        projectId: req.project.id,
        sourceHint: "sentry",
        body: req.body || {},
      });

      if (result.queued) {
        return res.status(202).json({ accepted: true, queued: true });
      }

      res.status(result.created ? 201 : 200).json({
        accepted: true,
        created: result.created,
        incidentId: result.incident.id,
      });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
