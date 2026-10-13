-- Chave gerada pelo cliente para tornar a criação de pedidos idempotente.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS client_request_id VARCHAR(120);

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_tenant_client_request
  ON orders (tenant_id, client_request_id)
  WHERE client_request_id IS NOT NULL AND BTRIM(client_request_id) <> '';
