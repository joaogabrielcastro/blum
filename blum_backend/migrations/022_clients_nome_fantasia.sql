-- Nome fantasia separado da razão social (companyname).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS nome_fantasia VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_clients_nome_fantasia
  ON clients (tenant_id, nome_fantasia)
  WHERE nome_fantasia IS NOT NULL AND TRIM(nome_fantasia) <> '';
