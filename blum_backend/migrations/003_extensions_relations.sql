-- pg_trgm para buscas ILIKE; linhas de pedido; FK opcional users; brand_id em produtos

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_productcode_trgm ON products USING gin (productcode gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_subcode_trgm ON products USING gin (subcode gin_trgm_ops);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(500),
  brand VARCHAR(255),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_rate DECIMAL(5,2) DEFAULT 0,
  commission_amount DECIMAL(12,2) DEFAULT 0,
  line_total DECIMAL(12,2) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_userid ON orders(userid);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_ref INTEGER REFERENCES users(id);

UPDATE orders o
SET user_ref = u.id
FROM users u
WHERE o.user_ref IS NULL
  AND o.userid ~ '^[0-9]+$'
  AND u.id::text = trim(o.userid);

ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brands(id);

UPDATE products p
SET brand_id = b.id
FROM brands b
WHERE p.brand_id IS NULL
  AND p.brand IS NOT NULL
  AND trim(p.brand) <> ''
  AND b.name = p.brand;
