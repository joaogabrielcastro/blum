-- Executar após sanear pedidos históricos ligados a usuário de outro tenant.
-- A constraint já bloqueia novos vínculos inválidos desde a migration 031.
ALTER TABLE orders VALIDATE CONSTRAINT orders_user_tenant_fk;
