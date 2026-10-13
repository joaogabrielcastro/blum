-- Impede novas referências entre tenants sem apagar dados históricos.
-- As FKs começam NOT VALID: são aplicadas a novos writes e podem ser
-- validadas depois que eventuais inconsistências legadas forem saneadas.

CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_tenant_id_id ON clients(tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_tenant_id_id ON products(tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_brands_tenant_id_id ON brands(tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_tenant_id_id ON users(tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_tenant_id_id ON orders(tenant_id, id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_client_tenant_fk') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_client_tenant_fk
      FOREIGN KEY (tenant_id, clientid) REFERENCES clients(tenant_id, id)
      ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_user_tenant_fk') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_user_tenant_fk
      FOREIGN KEY (tenant_id, user_ref) REFERENCES users(tenant_id, id)
      NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_order_tenant_fk') THEN
    ALTER TABLE order_items ADD CONSTRAINT order_items_order_tenant_fk
      FOREIGN KEY (tenant_id, order_id) REFERENCES orders(tenant_id, id)
      ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_product_tenant_fk') THEN
    ALTER TABLE order_items ADD CONSTRAINT order_items_product_tenant_fk
      FOREIGN KEY (tenant_id, product_id) REFERENCES products(tenant_id, id)
      ON DELETE SET NULL (product_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_brand_tenant_fk') THEN
    ALTER TABLE order_items ADD CONSTRAINT order_items_brand_tenant_fk
      FOREIGN KEY (tenant_id, brand_id) REFERENCES brands(tenant_id, id)
      ON DELETE SET NULL (brand_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'price_history_product_tenant_fk') THEN
    -- Existem bancos legados com `productid` e bancos mais recentes apenas com
    -- `product_id`. A migração 005 normaliza para snake_case, mas instalações
    -- antigas podem ter removido a coluna original antes desta migração.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'price_history'
        AND column_name = 'product_id'
    ) THEN
      ALTER TABLE price_history ADD CONSTRAINT price_history_product_tenant_fk
        FOREIGN KEY (tenant_id, product_id) REFERENCES products(tenant_id, id)
        ON DELETE CASCADE NOT VALID;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'price_history'
        AND column_name = 'productid'
    ) THEN
      ALTER TABLE price_history ADD CONSTRAINT price_history_product_tenant_fk
        FOREIGN KEY (tenant_id, productid) REFERENCES products(tenant_id, id)
        ON DELETE CASCADE NOT VALID;
    ELSE
      RAISE EXCEPTION 'price_history não possui product_id nem productid; execute a migração 005 antes da 031';
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uab_user_tenant_fk') THEN
    ALTER TABLE user_allowed_brands ADD CONSTRAINT uab_user_tenant_fk
      FOREIGN KEY (tenant_id, user_id) REFERENCES users(tenant_id, id)
      ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uab_brand_tenant_fk') THEN
    ALTER TABLE user_allowed_brands ADD CONSTRAINT uab_brand_tenant_fk
      FOREIGN KEY (tenant_id, brand_id) REFERENCES brands(tenant_id, id)
      ON DELETE CASCADE NOT VALID;
  END IF;
END $$;
