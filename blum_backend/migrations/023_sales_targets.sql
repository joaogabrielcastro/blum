-- Metas de vendas mensais (seller_user_id NULL = meta da empresa; preenchido = meta do vendedor)
CREATE TABLE IF NOT EXISTS sales_targets (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL DEFAULT 1,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  seller_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  target_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_targets_company
  ON sales_targets (tenant_id, year, month)
  WHERE seller_user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_targets_seller
  ON sales_targets (tenant_id, year, month, seller_user_id)
  WHERE seller_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_targets_tenant_period
  ON sales_targets (tenant_id, year, month);

-- Resumo mensal persistido (atualizado a partir dos pedidos entregues)
CREATE TABLE IF NOT EXISTS monthly_sales_summary (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL DEFAULT 1,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  seller_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  total_sales DECIMAL(12, 2) NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_sales_company
  ON monthly_sales_summary (tenant_id, year, month)
  WHERE seller_user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_sales_seller
  ON monthly_sales_summary (tenant_id, year, month, seller_user_id)
  WHERE seller_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_monthly_sales_summary_tenant_period
  ON monthly_sales_summary (tenant_id, year, month);
