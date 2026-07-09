-- Row Level Security: isolamento por tenant_id nas tabelas multi-tenant.
-- O backend define set_config('app.tenant_id', ...) ou set_config('app.bypass_rls', 'true', true) por request.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users',
    'clients',
    'products',
    'brands',
    'orders',
    'order_items',
    'price_history',
    'user_allowed_brands',
    'auth_refresh_tokens',
    'audit_logs',
    'sales_targets',
    'monthly_sales_summary'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
       USING (
         current_setting(''app.bypass_rls'', true) = ''true''
         OR tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::int
       )
       WITH CHECK (
         current_setting(''app.bypass_rls'', true) = ''true''
         OR tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::int
       )',
      tbl
    );
  END LOOP;
END $$;
