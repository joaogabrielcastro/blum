-- FKs em tabelas com tenant_id sem referência a tenants (migration 023).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_targets_tenant_fk'
  ) THEN
    ALTER TABLE sales_targets
      ADD CONSTRAINT sales_targets_tenant_fk
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'monthly_sales_summary_tenant_fk'
  ) THEN
    ALTER TABLE monthly_sales_summary
      ADD CONSTRAINT monthly_sales_summary_tenant_fk
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
  END IF;
END $$;
