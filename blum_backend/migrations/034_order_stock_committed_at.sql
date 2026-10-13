ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS stock_committed_at TIMESTAMPTZ;

-- Preserva os saldos históricos: pedidos existentes são considerados conciliados.
-- A baixa na confirmação passa a valer para novos pedidos após esta migração.
UPDATE orders
SET stock_committed_at = COALESCE(finishedat, createdat, NOW())
WHERE document_type = 'pedido'
  AND stock_committed_at IS NULL;
