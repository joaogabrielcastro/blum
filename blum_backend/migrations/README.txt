Ordem das migrações (ficheiros .sql por nome):
  000_core_schema.sql
  001_create_users_table.sql   (redundante com 000; idempotente)
  002_add_indexes.sql
  003_extensions_relations.sql   (requer extensão pg_trgm — em alguns VPS só superuser)
  005_price_history_import_columns.sql
  006_orders_seller_and_line_items_cleanup.sql
  007_align_legacy_clients_columns.sql
  008_add_clients_email.sql

Antes do deploy em produção: execute scripts/preflight_check.sql (só leitura) e guarde o resultado.
Utilizadores: 006 falha se users estiver vazia — crie contas (create-users.js) antes se for necessário.
