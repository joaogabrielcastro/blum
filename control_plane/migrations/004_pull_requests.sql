-- Fase 5 — PR após aprovação humana + status de CI (sandbox)

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS pr_status TEXT NOT NULL DEFAULT 'none',
  -- none|queued|opening|opened|failed|skipped
  ADD COLUMN IF NOT EXISTS pr_url TEXT,
  ADD COLUMN IF NOT EXISTS pr_number INT,
  ADD COLUMN IF NOT EXISTS pr_branch TEXT,
  ADD COLUMN IF NOT EXISTS pr_agent_id TEXT,
  ADD COLUMN IF NOT EXISTS pr_error TEXT,
  ADD COLUMN IF NOT EXISTS ci_status TEXT NOT NULL DEFAULT 'none',
  -- none|pending|passing|failing|unknown|skipped
  ADD COLUMN IF NOT EXISTS ci_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ci_summary JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS pr_status TEXT NOT NULL DEFAULT 'none';
