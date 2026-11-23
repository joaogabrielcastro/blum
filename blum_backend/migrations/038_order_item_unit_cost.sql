-- C4: custo do produto no momento da venda (snapshot por item de pedido).
-- Pedidos anteriores ficam com NULL ("sem custo"): nada é inventado.
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12,4);
