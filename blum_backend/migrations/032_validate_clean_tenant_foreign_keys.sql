-- Valida as relações cujo inventário legado já está consistente.
-- orders_user_tenant_fk permanece NOT VALID até os pedidos históricos
-- com vendedor de outro tenant serem atribuídos pelo responsável do negócio.

ALTER TABLE orders VALIDATE CONSTRAINT orders_client_tenant_fk;
ALTER TABLE order_items VALIDATE CONSTRAINT order_items_order_tenant_fk;
ALTER TABLE order_items VALIDATE CONSTRAINT order_items_product_tenant_fk;
ALTER TABLE order_items VALIDATE CONSTRAINT order_items_brand_tenant_fk;
ALTER TABLE price_history VALIDATE CONSTRAINT price_history_product_tenant_fk;
ALTER TABLE user_allowed_brands VALIDATE CONSTRAINT uab_user_tenant_fk;
ALTER TABLE user_allowed_brands VALIDATE CONSTRAINT uab_brand_tenant_fk;
