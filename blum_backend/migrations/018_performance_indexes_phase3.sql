-- Índices compostos para consultas multi-tenant e relatórios.

CREATE INDEX IF NOT EXISTS idx_orders_tenant_createdat_desc
  ON orders(tenant_id, createdat DESC);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_user_createdat_desc
  ON orders(tenant_id, user_ref, createdat DESC);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_client_createdat_desc
  ON orders(tenant_id, clientid, createdat DESC);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_status_createdat_desc
  ON orders(tenant_id, status, createdat DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_tenant_order
  ON order_items(tenant_id, order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id_id
  ON order_items(order_id, id);

CREATE INDEX IF NOT EXISTS idx_products_tenant_productcode
  ON products(tenant_id, productcode);

CREATE INDEX IF NOT EXISTS idx_products_tenant_subcode
  ON products(tenant_id, subcode);

CREATE INDEX IF NOT EXISTS idx_price_history_tenant_product_date_desc
  ON price_history(tenant_id, product_id, purchase_date DESC);
