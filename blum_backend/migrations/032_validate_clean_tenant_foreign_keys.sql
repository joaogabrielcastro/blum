-- Valida as relações cujo inventário legado já está consistente.
-- orders_user_tenant_fk permanece NOT VALID até os pedidos históricos
-- com vendedor de outro tenant serem atribuídos pelo responsável do negócio.

-- A migração multitenant original atribuiu linhas antigas de price_history
-- ao tenant `default`, pois ainda não reconciliava o tenant pelo produto.
-- Preserva esses históricos corrigindo o tenant a partir do produto real e
-- registra cada movimentação antes de validar a FK composta.
INSERT INTO audit_logs (
  tenant_id,
  actor_user_id,
  action,
  resource_type,
  resource_id,
  metadata
)
SELECT
  p.tenant_id,
  NULL,
  'migration.price_history_tenant_reconcile',
  'price_history',
  ph.id::text,
  jsonb_build_object(
    'migration', '032_validate_clean_tenant_foreign_keys.sql',
    'oldTenantId', ph.tenant_id,
    'newTenantId', p.tenant_id,
    'productId', ph.product_id
  )
FROM price_history ph
JOIN products p ON p.id = ph.product_id
WHERE ph.tenant_id IS DISTINCT FROM p.tenant_id;

UPDATE price_history ph
SET tenant_id = p.tenant_id
FROM products p
WHERE p.id = ph.product_id
  AND ph.tenant_id IS DISTINCT FROM p.tenant_id;

ALTER TABLE orders VALIDATE CONSTRAINT orders_client_tenant_fk;
ALTER TABLE order_items VALIDATE CONSTRAINT order_items_order_tenant_fk;
ALTER TABLE order_items VALIDATE CONSTRAINT order_items_product_tenant_fk;
ALTER TABLE order_items VALIDATE CONSTRAINT order_items_brand_tenant_fk;
ALTER TABLE price_history VALIDATE CONSTRAINT price_history_product_tenant_fk;
ALTER TABLE user_allowed_brands VALIDATE CONSTRAINT uab_user_tenant_fk;
ALTER TABLE user_allowed_brands VALIDATE CONSTRAINT uab_brand_tenant_fk;
