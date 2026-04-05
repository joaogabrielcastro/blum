-- Vendedor único: user_ref (FK users). Linhas de pedido só em order_items.
-- Remove colunas legadas orders.userid (texto) e orders.items (JSONB duplicado).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
    RAISE EXCEPTION 'Migração 006: users está vazia. Crie pelo menos um utilizador (ex.: node migrations/create-users.js) antes desta migração.';
  END IF;
END $$;

-- 1) Completar user_ref a partir de userid numérico legado
UPDATE orders o
SET user_ref = u.id
FROM users u
WHERE o.user_ref IS NULL
  AND o.userid IS NOT NULL
  AND trim(o.userid) ~ '^[0-9]+$'
  AND u.id = trim(o.userid)::integer;

-- Pedidos sem vínculo: preferir admin; senão qualquer utilizador (legado sem admin)
UPDATE orders
SET user_ref = COALESCE(
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  (SELECT id FROM users ORDER BY id LIMIT 1)
)
WHERE user_ref IS NULL;

-- 2) Copiar snapshot JSON para order_items quando ainda não existem linhas
INSERT INTO order_items (
  order_id, product_id, product_name, brand, quantity, unit_price,
  commission_rate, commission_amount, line_total
)
SELECT
  o.id,
  NULLIF(elem->>'productId', '')::integer,
  COALESCE(elem->>'productName', ''),
  COALESCE(elem->>'brand', ''),
  GREATEST(COALESCE((elem->>'quantity')::integer, 1), 1),
  COALESCE((elem->>'price')::numeric, 0),
  COALESCE((elem->>'commission_rate')::numeric, 0),
  COALESCE((elem->>'commission_amount')::numeric, 0),
  GREATEST(COALESCE((elem->>'quantity')::integer, 1), 1) * COALESCE((elem->>'price')::numeric, 0)
FROM orders o
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN o.items IS NULL THEN '[]'::jsonb
    WHEN jsonb_typeof(o.items::jsonb) = 'array' THEN o.items::jsonb
    ELSE '[]'::jsonb
  END
) AS elem
WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id)
  AND o.items IS NOT NULL
  AND trim(o.items::text) NOT IN ('null', '[]', '""');

-- Garantir que nenhum pedido ficou sem vendedor antes do NOT NULL
DO $$
DECLARE
  n int;
BEGIN
  SELECT COUNT(*) INTO n FROM orders WHERE user_ref IS NULL;
  IF n > 0 THEN
    RAISE EXCEPTION 'Migração 006: ainda existem % pedido(s) com user_ref nulo. Corrija users/orders antes de continuar.', n;
  END IF;
END $$;

-- 3) Índices e remoção de colunas legadas
DROP INDEX IF EXISTS idx_orders_userid;

ALTER TABLE orders DROP COLUMN IF EXISTS userid;
ALTER TABLE orders DROP COLUMN IF EXISTS items;

ALTER TABLE orders ALTER COLUMN user_ref SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_user_ref ON orders(user_ref);
