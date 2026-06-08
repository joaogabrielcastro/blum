-- Alertas de ruptura de estoque em pedidos/orçamentos (snapshot no save).
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS stock_at_save INTEGER;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS stock_shortfall NUMERIC(12, 3) NOT NULL DEFAULT 0;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS has_stock_warning BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_has_stock_warning
  ON orders (tenant_id, has_stock_warning)
  WHERE has_stock_warning = true;
