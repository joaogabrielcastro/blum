-- Tenant onboarding: índices e campos para multi-tenant SaaS

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN tenants.onboarding_completed_at IS
  'Quando o tenant concluiu signup (admin criado + workspace ativo)';
