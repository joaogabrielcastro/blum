-- C4: custo de itens de pedidos antigos preenchido a pedido do admin com o
-- custo atual do produto. Fica marcado como estimado (não é o custo da época).
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_cost_estimated BOOLEAN NOT NULL DEFAULT FALSE;
