const express = require("express");
const { requireAdmin } = require("../middleware/adminAuth");
const {
  listIncidents,
  getIncidentById,
  updateIncidentStatus,
} = require("../services/incidentService");
const { findProjectBySlug } = require("../services/projectService");
const {
  getLatestDiagnosis,
  listDiagnosesForIncident,
} = require("../services/diagnosisService");
const { enqueueDiagnose } = require("../queue/diagnoseQueue");
const { enqueuePropose } = require("../queue/proposeQueue");
const { getLatestProposal } = require("../services/proposalService");

const router = express.Router();

router.use(requireAdmin);

router.get("/", async (req, res, next) => {
  try {
    let projectId = req.query.projectId || null;
    if (req.query.projectSlug) {
      const project = await findProjectBySlug(String(req.query.projectSlug));
      if (!project) {
        return res.status(404).json({ error: "Projeto não encontrado" });
      }
      projectId = project.id;
    }

    const incidents = await listIncidents({
      projectId,
      status: req.query.status || null,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json({ incidents });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const incident = await getIncidentById(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: "Incidente não encontrado" });
    }
    const diagnosis = await getLatestDiagnosis(incident.id);
    const diagnoses = await listDiagnosesForIncident(incident.id, 5);
    const proposal = await getLatestProposal(incident.id);
    res.json({ incident, diagnosis, diagnoses, proposal });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/diagnosis", async (req, res, next) => {
  try {
    const diagnosis = await getLatestDiagnosis(req.params.id);
    if (!diagnosis) {
      return res.status(404).json({ error: "Diagnóstico não encontrado" });
    }
    res.json({ diagnosis });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/diagnose", async (req, res, next) => {
  try {
    const incident = await getIncidentById(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: "Incidente não encontrado" });
    }

    const result = await enqueueDiagnose({
      incidentId: incident.id,
      force: true,
    });

    if (result.queued) {
      return res.status(202).json({
        accepted: true,
        queued: true,
        jobId: result.jobId,
      });
    }

    res.status(200).json({
      accepted: true,
      queued: false,
      skipped: Boolean(result.skipped),
      diagnosis: result.diagnosis || null,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/propose", async (req, res, next) => {
  try {
    const incident = await getIncidentById(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: "Incidente não encontrado" });
    }
    const result = await enqueuePropose({ incidentId: incident.id });
    if (result.queued) {
      return res.status(202).json({
        accepted: true,
        queued: true,
        jobId: result.jobId,
      });
    }
    res.status(201).json({
      accepted: true,
      queued: false,
      proposal: result.proposal,
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!status) {
      return res.status(400).json({ error: "status é obrigatório" });
    }
    const incident = await updateIncidentStatus(req.params.id, status);
    if (!incident) {
      return res.status(404).json({ error: "Incidente não encontrado" });
    }
    res.json({ incident });
  } catch (err) {
    next(err);
  }
});

module.exports = router;