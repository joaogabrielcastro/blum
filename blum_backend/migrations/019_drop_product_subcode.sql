-- Remove coluna subcode e índices associados (não usada mais no app).

DROP INDEX IF EXISTS idx_products_subcode_trgm;
DROP INDEX IF EXISTS idx_products_subcode;
DROP INDEX IF EXISTS idx_products_tenant_subcode;

ALTER TABLE products DROP COLUMN IF EXISTS subcode;
