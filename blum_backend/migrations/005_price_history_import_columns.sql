-- Compatibilidade com importações (colunas usadas por purchaseFinalizeImportService)
-- Bases legadas: 000_core_schema usa productid; esta migração adiciona product_id (snake_case).
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2);
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS quantity INTEGER;
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMPTZ;
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Copiar productid -> product_id só se a coluna legada existir (evita erro em bases que já só têm product_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_history' AND column_name = 'productid'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_history' AND column_name = 'product_id'
  ) THEN
    UPDATE price_history
    SET product_id = productid
    WHERE product_id IS NULL AND productid IS NOT NULL;
  END IF;
END $$;
