-- Idempotente: bases importadas/ORM podem ter coluna duplicada "companyName" (camelCase)
-- além de companyname. O INSERT do backend preenche só companyname; a outra fica NULL e
-- estoura NOT NULL. Copia valores e remove a coluna duplicada.

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'clients'
      AND a.attname = 'companyName'
      AND a.attnum > 0
      AND NOT a.attisdropped
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clients'
      AND column_name = 'companyname'
  ) THEN
    EXECUTE $u$
      UPDATE clients
      SET companyname = COALESCE(
        NULLIF(BTRIM(companyname::text), ''),
        NULLIF(BTRIM("companyName"::text), '')
      )
    $u$;

    EXECUTE 'ALTER TABLE clients DROP COLUMN "companyName"';
  END IF;
END
$migration$;
