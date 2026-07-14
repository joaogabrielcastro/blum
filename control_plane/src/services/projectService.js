const { pool } = require("../config/database");
const { createIngestToken, sha256 } = require("./fingerprint");

async function findProjectByIngestToken(token) {
  if (!token) return null;
  const hash = sha256(token);
  const { rows } = await pool.query(
    `SELECT * FROM projects WHERE ingest_token_hash = $1 AND active = true`,
    [hash],
  );
  return rows[0] || null;
}

async function findProjectBySlug(slug) {
  const { rows } = await pool.query(
    `SELECT id, tenant_id, slug, name, repo_full_name, default_branch,
            stack, ingest_token_prefix, active, created_at, updated_at
     FROM projects WHERE slug = $1`,
    [slug],
  );
  return rows[0] || null;
}

async function listProjects() {
  const { rows } = await pool.query(
    `SELECT id, tenant_id, slug, name, repo_full_name, default_branch,
            stack, ingest_token_prefix, active, created_at, updated_at
     FROM projects
     ORDER BY name ASC`,
  );
  return rows;
}

async function createProject({
  tenantId,
  slug,
  name,
  repoFullName,
  defaultBranch = "main",
  stack = {},
}) {
  const token = createIngestToken();
  const { rows } = await pool.query(
    `INSERT INTO projects (
       tenant_id, slug, name, repo_full_name, default_branch, stack,
       ingest_token_hash, ingest_token_prefix
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, tenant_id, slug, name, repo_full_name, default_branch,
               stack, ingest_token_prefix, active, created_at, updated_at`,
    [
      tenantId,
      slug,
      name,
      repoFullName || null,
      defaultBranch,
      JSON.stringify(stack),
      token.hash,
      token.prefix,
    ],
  );

  return {
    project: rows[0],
    ingestToken: token.token,
  };
}

async function rotateIngestToken(projectId) {
  const token = createIngestToken();
  const { rows } = await pool.query(
    `UPDATE projects SET
       ingest_token_hash = $2,
       ingest_token_prefix = $3,
       updated_at = now()
     WHERE id = $1
     RETURNING id, slug, ingest_token_prefix`,
    [projectId, token.hash, token.prefix],
  );
  if (!rows[0]) return null;
  return { project: rows[0], ingestToken: token.token };
}

async function ensureDefaultTenant() {
  const existing = await pool.query(
    `SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1`,
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const inserted = await pool.query(
    `INSERT INTO tenants (name) VALUES ($1) RETURNING id`,
    ["Default"],
  );
  return inserted.rows[0].id;
}

async function seedProjectFromEnv() {
  const slug = process.env.SEED_PROJECT_SLUG;
  if (!slug) return null;

  const existing = await findProjectBySlug(slug);
  if (existing) {
    return { project: existing, ingestToken: null, seeded: false };
  }

  const tenantId = await ensureDefaultTenant();
  const created = await createProject({
    tenantId,
    slug,
    name: process.env.SEED_PROJECT_NAME || slug,
    repoFullName: process.env.SEED_PROJECT_REPO || null,
    stack: {
      backend: "express",
      frontend: "react",
      db: "postgresql",
    },
  });

  console.log(
    JSON.stringify({
      level: "info",
      message: "project_seeded",
      slug,
      ingestTokenPrefix: created.project.ingest_token_prefix,
      ingestToken: created.ingestToken,
    }),
  );

  return { ...created, seeded: true };
}

module.exports = {
  findProjectByIngestToken,
  findProjectBySlug,
  listProjects,
  createProject,
  rotateIngestToken,
  ensureDefaultTenant,
  seedProjectFromEnv,
};
