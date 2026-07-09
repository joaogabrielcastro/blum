-- Platform admin flag para gestão multi-tenant

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_platform_admin
  ON users(is_platform_admin)
  WHERE is_platform_admin = true;

-- Bootstrap: admin do tenant default (ajuste o e-mail se necessário)
UPDATE users u
SET is_platform_admin = true
FROM tenants t
WHERE u.tenant_id = t.id
  AND t.slug = 'default'
  AND u.role = 'admin'
  AND LOWER(TRIM(u.username)) = LOWER('admin@jwsoftware.com.br');
