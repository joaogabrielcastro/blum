-- Compatibilidade com importações (colunas usadas por purchaseFinalizeImportService)
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2);
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS quantity INTEGER;
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMPTZ;
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE price_history
SET product_id = productid
WHERE product_id IS NULL AND productid IS NOT NULL;
