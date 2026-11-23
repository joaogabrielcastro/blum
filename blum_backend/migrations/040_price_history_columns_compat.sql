-- Compatibilidade: bases criadas fora do 000_core_schema podem não ter todas
-- as colunas de price_history usadas pela ficha do produto e pelo histórico.
-- Só adiciona o que faltar (idempotente, sem perda).
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS product_id INTEGER;
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS old_price DECIMAL(10,2);
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS new_price DECIMAL(10,2);
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS changed_by VARCHAR(255);
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS changedat TIMESTAMPTZ;
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2);
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS quantity INTEGER;
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMPTZ;
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Linhas legadas gravadas só em productid passam a ter product_id.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_history' AND column_name = 'productid'
  ) THEN
    UPDATE price_history SET product_id = productid
    WHERE product_id IS NULL AND productid IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_price_history_tenant_product
  ON price_history (tenant_id, product_id);
