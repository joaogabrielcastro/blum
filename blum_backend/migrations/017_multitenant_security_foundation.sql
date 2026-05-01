-- Multi-tenant + auth hardening foundation

CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(120) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO tenants (slug, name)
VALUES ('default', 'Default Tenant')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
UPDATE users
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default' LIMIT 1)
WHERE tenant_id IS NULL;
ALTER TABLE users
  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE users
  ADD CONSTRAINT users_tenant_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
UPDATE clients
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default' LIMIT 1)
WHERE tenant_id IS NULL;
ALTER TABLE clients
  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE clients
  ADD CONSTRAINT clients_tenant_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients(tenant_id);

ALTER TABLE products ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
UPDATE products
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default' LIMIT 1)
WHERE tenant_id IS NULL;
ALTER TABLE products
  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE products
  ADD CONSTRAINT products_tenant_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);

ALTER TABLE brands ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
UPDATE brands
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default' LIMIT 1)
WHERE tenant_id IS NULL;
ALTER TABLE brands
  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE brands
  ADD CONSTRAINT brands_tenant_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_brands_tenant_id ON brands(tenant_id);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
UPDATE orders
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default' LIMIT 1)
WHERE tenant_id IS NULL;
ALTER TABLE orders
  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE orders
  ADD CONSTRAINT orders_tenant_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders(tenant_id);

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
UPDATE order_items oi
SET tenant_id = o.tenant_id
FROM orders o
WHERE oi.order_id = o.id
  AND oi.tenant_id IS NULL;
UPDATE order_items
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default' LIMIT 1)
WHERE tenant_id IS NULL;
ALTER TABLE order_items
  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE order_items
  ADD CONSTRAINT order_items_tenant_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_order_items_tenant_id ON order_items(tenant_id);

ALTER TABLE price_history ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
UPDATE price_history
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default' LIMIT 1)
WHERE tenant_id IS NULL;
ALTER TABLE price_history
  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE price_history
  ADD CONSTRAINT price_history_tenant_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_price_history_tenant_id ON price_history(tenant_id);

ALTER TABLE user_allowed_brands ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
UPDATE user_allowed_brands uab
SET tenant_id = u.tenant_id
FROM users u
WHERE uab.user_id = u.id
  AND uab.tenant_id IS NULL;
UPDATE user_allowed_brands
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default' LIMIT 1)
WHERE tenant_id IS NULL;
ALTER TABLE user_allowed_brands
  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE user_allowed_brands
  ADD CONSTRAINT user_allowed_brands_tenant_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_uab_tenant_id ON user_allowed_brands(tenant_id);

ALTER TABLE brands DROP CONSTRAINT IF EXISTS brands_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_brands_tenant_name ON brands(tenant_id, name);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_tenant_username ON users(tenant_id, username);

CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  token_jti VARCHAR(120) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  replaced_by_jti VARCHAR(120),
  user_agent TEXT,
  ip_address VARCHAR(120),
  CONSTRAINT uq_auth_refresh_tokens_tenant_jti UNIQUE (tenant_id, token_jti)
);
CREATE INDEX IF NOT EXISTS idx_refresh_user_tenant ON auth_refresh_tokens(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_expires ON auth_refresh_tokens(expires_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  resource_type VARCHAR(120),
  resource_id VARCHAR(120),
  request_id VARCHAR(120),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_user_id, created_at DESC);
