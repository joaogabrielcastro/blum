-- Fase 3 — diagnósticos automáticos (read-only)

CREATE TABLE IF NOT EXISTS diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'completed',
  hypothesis TEXT NOT NULL DEFAULT '',
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence REAL NOT NULL DEFAULT 0,
  suspect_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  root_cause_category TEXT,
  recommended_next_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  model TEXT,
  token_input INT,
  token_output INT,
  context_pack JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_response JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diagnoses_incident_created
  ON diagnoses (incident_id, created_at DESC);

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS diagnosis_status TEXT NOT NULL DEFAULT 'none';

CREATE INDEX IF NOT EXISTS idx_incidents_diagnosis_status
  ON incidents (diagnosis_status);
