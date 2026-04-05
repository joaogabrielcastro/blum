-- =============================================================================
-- PRÉ-DEPLOY: executar no PostgreSQL (psql ou cliente SQL) — NÃO altera dados.
-- Copie o resultado antes de subir uma nova imagem; ajuda a antecipar falhas.
-- (Não está em migrations/ para não ser executado pelo migrate.js no arranque.)
-- =============================================================================

\echo '--- 1) Migrações já registadas ---'
SELECT filename, applied_at
FROM schema_migrations
ORDER BY filename;

\echo '--- 2) Tabelas em public ---'
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

\echo '--- 3) Colunas relevantes: clients ---'
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'clients'
ORDER BY ordinal_position;

\echo '--- 4) Colunas relevantes: orders ---'
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders'
ORDER BY ordinal_position;

\echo '--- 5) Colunas relevantes: price_history ---'
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'price_history'
ORDER BY ordinal_position;

\echo '--- 6) Utilizadores (006 precisa de pelo menos 1 linha) ---'
SELECT COUNT(*) AS total_users FROM users;

\echo '--- 7) Pedidos sem user_ref (se a coluna existir; 006 exige 0 antes do NOT NULL) ---'
-- Se falhar com "column user_ref does not exist", a migração 003 ainda não criou a coluna.
SELECT COUNT(*) AS orders_sem_user_ref FROM orders WHERE user_ref IS NULL;

\echo '--- 8) Extensão pg_trgm (003) — em alguns hosts precisa superuser ---'
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_trgm';

\echo '--- 9) Amostra: há coluna userid em orders? (006 remove) ---'
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'userid'
) AS orders_tem_userid;
