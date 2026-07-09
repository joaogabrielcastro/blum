-- CNPJ/CPF do tenant (empresa ou representante autônomo)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS tax_id VARCHAR(14),
  ADD COLUMN IF NOT EXISTS tax_id_type VARCHAR(4);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_tax_id_unique
  ON tenants (tax_id)
  WHERE tax_id IS NOT NULL AND BTRIM(tax_id) <> '';
