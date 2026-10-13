-- As linhas históricas mantêm o nome textual da representada. O identificador
-- pode ser limpo quando o cadastro da representada for removido.
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_brand_id_fkey;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_brand_id_fkey
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL;

-- Produtos ativos continuam impedindo a exclusão no controller. Esta regra
-- evita bloqueio residual caso existam dados legados inconsistentes.
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_brand_id_fkey;

ALTER TABLE products
  ADD CONSTRAINT products_brand_id_fkey
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL;
