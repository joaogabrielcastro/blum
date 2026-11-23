-- C1: preço de custo do produto, tipo de evento no histórico de preços e
-- registro de movimentos de estoque. Só adiciona colunas/tabela (sem perda).

-- 1) Custo do produto ------------------------------------------------------
-- cost_price: custo médio ponderado (custo oficial para margem/lucro).
-- last_cost: custo unitário da última compra. NULL = ainda não informado.
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,4);
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_cost NUMERIC(12,4);
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_purchase_at TIMESTAMPTZ;

-- 2) Histórico de preços com tipo ------------------------------------------
-- custo    = entrada de compra (purchase_price/quantity/purchase_date)
-- venda    = alteração manual do preço de venda (old_price/new_price)
-- reajuste = reajuste em massa do preço de venda (old_price/new_price)
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS event_type VARCHAR(20);
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS old_cost NUMERIC(12,4);
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS new_cost NUMERIC(12,4);

UPDATE price_history
SET event_type = CASE
  WHEN purchase_price IS NOT NULL THEN 'custo'
  ELSE 'reajuste'
END
WHERE event_type IS NULL;

ALTER TABLE price_history ALTER COLUMN event_type SET DEFAULT 'custo';

-- 3) Movimentos de estoque -------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  -- entrada_compra | saida_pedido | estorno_pedido | ajuste | importacao | cadastro
  movement_type VARCHAR(30) NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,          -- positivo entra, negativo sai
  balance_after NUMERIC(12,3),
  unit_cost NUMERIC(12,4),
  reference_type VARCHAR(30),               -- order | purchase | manual
  reference_id INTEGER,
  reason TEXT,
  user_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product
  ON stock_movements (tenant_id, product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference
  ON stock_movements (tenant_id, reference_type, reference_id);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON stock_movements;
CREATE POLICY tenant_isolation ON stock_movements
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::int
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::int
  );
