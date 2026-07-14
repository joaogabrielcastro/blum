-- Fase 4 — propostas de correção + aprovação humana (sem PR automático)

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS proposal_status TEXT NOT NULL DEFAULT 'none';

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  diagnosis_id UUID REFERENCES diagnoses(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  -- draft|pending|awaiting_approval|approved|rejected|superseded|failed
  summary TEXT NOT NULL DEFAULT '',
  rationale TEXT NOT NULL DEFAULT '',
  test_plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence REAL NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  policy_mode TEXT NOT NULL DEFAULT 'propose_require_approve',
  risk_tier TEXT NOT NULL DEFAULT 'MEDIUM',
  model TEXT,
  token_input INT,
  token_output INT,
  context_pack JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_response JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposals_incident_created
  ON proposals (incident_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proposals_status
  ON proposals (status);

CREATE TABLE IF NOT EXISTS proposal_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  change_type TEXT NOT NULL DEFAULT 'modify',
  diff_unified TEXT NOT NULL DEFAULT '',
  risk_tier TEXT NOT NULL DEFAULT 'MEDIUM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_files_proposal
  ON proposal_files (proposal_id);

CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  -- approve|reject|revise
  comment TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  actor TEXT NOT NULL DEFAULT 'admin',
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approvals_proposal
  ON approvals (proposal_id, decided_at DESC);
