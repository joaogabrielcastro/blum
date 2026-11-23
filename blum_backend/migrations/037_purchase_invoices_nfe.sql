-- C2: compras por XML de NF-e.
-- Notas importadas, itens com custo calculado, memória de vínculo
-- fornecedor → produto e CNPJ da representada. Só adiciona (sem perda).

ALTER TABLE brands ADD COLUMN IF NOT EXISTS cnpj VARCHAR(14);
CREATE INDEX IF NOT EXISTS idx_brands_tenant_cnpj ON brands (tenant_id, cnpj);

-- Código de barras (cEAN/GTIN da nota) para casar itens automaticamente.
ALTER TABLE products ADD COLUMN IF NOT EXISTS ean VARCHAR(14);
CREATE INDEX IF NOT EXISTS idx_products_tenant_ean ON products (tenant_id, ean)
  WHERE ean IS NOT NULL;

CREATE TABLE IF NOT EXISTS purchase_invoices (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  access_key VARCHAR(44) NOT NULL,
  number VARCHAR(20),
  series VARCHAR(5),
  issued_at TIMESTAMPTZ,
  emitter_cnpj VARCHAR(14),
  emitter_name VARCHAR(255),
  recipient_doc VARCHAR(14),
  brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
  brand_name VARCHAR(255),
  total_products NUMERIC(14,2),
  total_invoice NUMERIC(14,2),
  total_cost NUMERIC(14,2),
  items_count INTEGER NOT NULL DEFAULT 0,
  -- importada | estornada
  status VARCHAR(20) NOT NULL DEFAULT 'importada',
  xml TEXT NOT NULL,
  imported_by INTEGER,
  imported_by_name VARCHAR(255),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reversed_at TIMESTAMPTZ,
  reversed_by_name VARCHAR(255)
);

-- A mesma nota não entra duas vezes na mesma empresa (estornada pode voltar).
CREATE UNIQUE INDEX IF NOT EXISTS uq_purchase_invoices_active_key
  ON purchase_invoices (tenant_id, access_key)
  WHERE status <> 'estornada';
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_tenant_date
  ON purchase_invoices (tenant_id, imported_at DESC);

CREATE TABLE IF NOT EXISTS purchase_invoice_items (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id INTEGER NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  item_number INTEGER NOT NULL,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  supplier_code VARCHAR(60),
  ean VARCHAR(14),
  description VARCHAR(255),
  ncm VARCHAR(10),
  cfop VARCHAR(4),
  unit VARCHAR(10),
  quantity NUMERIC(14,4) NOT NULL,       -- quantidade na unidade da nota
  conversion_factor NUMERIC(12,4) NOT NULL DEFAULT 1,
  stock_quantity INTEGER NOT NULL,       -- quantidade que entrou no estoque
  unit_value NUMERIC(14,6),
  gross_value NUMERIC(14,2),
  discount NUMERIC(14,2) DEFAULT 0,
  freight NUMERIC(14,2) DEFAULT 0,
  insurance NUMERIC(14,2) DEFAULT 0,
  other_expenses NUMERIC(14,2) DEFAULT 0,
  ipi NUMERIC(14,2) DEFAULT 0,
  icms_st NUMERIC(14,2) DEFAULT 0,
  fcp_st NUMERIC(14,2) DEFAULT 0,
  total_cost NUMERIC(14,2) NOT NULL,
  unit_cost NUMERIC(12,4) NOT NULL,      -- custo por unidade de estoque
  previous_cost NUMERIC(12,4),
  previous_last_cost NUMERIC(12,4),
  previous_last_purchase_at TIMESTAMPTZ,
  new_average_cost NUMERIC(12,4),
  previous_price NUMERIC(10,2),
  new_price NUMERIC(10,2),
  created_product BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_invoice
  ON purchase_invoice_items (tenant_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_product
  ON purchase_invoice_items (tenant_id, product_id);

-- Memória: "o código X deste fornecedor é o produto Y, 1 CX = 12 UN".
CREATE TABLE IF NOT EXISTS supplier_product_links (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_cnpj VARCHAR(14) NOT NULL,
  supplier_code VARCHAR(60) NOT NULL,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  conversion_factor NUMERIC(12,4) NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, supplier_cnpj, supplier_code)
);

ALTER TABLE price_history ADD COLUMN IF NOT EXISTS purchase_invoice_id INTEGER
  REFERENCES purchase_invoices(id) ON DELETE SET NULL;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['purchase_invoices', 'purchase_invoice_items', 'supplier_product_links']
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
