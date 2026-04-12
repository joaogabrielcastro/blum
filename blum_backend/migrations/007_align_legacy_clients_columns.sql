-- Idempotente: alinha nomes legados e garante índices em clients sem falhar se a coluna não existir.
-- Útil quando a 002 já estava aplicada antes do rename de company_name ou em bases importadas.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'company_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'companyname'
  ) THEN
    ALTER TABLE clients RENAME COLUMN company_name TO companyname;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'companyname'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_clients_companyname ON clients(companyname);
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'cnpj'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON clients(cnpj);
  END IF;
END $$;
