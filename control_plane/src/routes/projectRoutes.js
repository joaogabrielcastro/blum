const express = require("express");
const { requireAdmin } = require("../middleware/adminAuth");
const {
  listProjects,
  createProject,
  ensureDefaultTenant,
  rotateIngestToken,
  findProjectBySlug,
} = require("../services/projectService");

const router = express.Router();

router.use(requireAdmin);

router.get("/", async (req, res, next) => {
  try {
    const projects = await listProjects();
    res.json({ projects });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { slug, name, repoFullName, defaultBranch, stack, tenantId } =
      req.body || {};
    if (!slug || !name) {
      return res.status(400).json({ error: "slug e name são obrigatórios" });
    }
    if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(slug)) {
      return res.status(400).json({
        error: "slug inválido (use a-z, 0-9, hífen; 2–63 chars)",
      });
    }

    const existing = await findProjectBySlug(slug);
    if (existing) {
      return res.status(409).json({ error: "slug já existe" });
    }

    const tid = tenantId || (await ensureDefaultTenant());
    const created = await createProject({
      tenantId: tid,
      slug,
      name,
      repoFullName,
      defaultBranch,
      stack,
    });

    res.status(201).json({
      project: created.project,
      ingestToken: created.ingestToken,
      warning:
        "Guarde o ingestToken agora — ele não será exibido novamente.",
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:slug/rotate-token", async (req, res, next) => {
  try {
    const project = await findProjectBySlug(req.params.slug);
    if (!project) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }
    const rotated = await rotateIngestToken(project.id);
    res.json({
      project: rotated.project,
      ingestToken: rotated.ingestToken,
      warning:
        "Guarde o ingestToken agora — ele não será exibido novamente.",
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
