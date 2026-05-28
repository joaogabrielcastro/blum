-- FK opcional de representada nas linhas de pedido (complementa brand texto)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brands(id);

UPDATE order_items oi
SET brand_id = b.id
FROM brands b
WHERE oi.brand_id IS NULL
  AND trim(COALESCE(oi.brand, '')) <> ''
  AND b.name = oi.brand;

CREATE INDEX IF NOT EXISTS idx_order_items_brand_id ON order_items(brand_id);
