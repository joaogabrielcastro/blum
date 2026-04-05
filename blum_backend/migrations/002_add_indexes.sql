-- Migration: Adicionar índices para melhorar performance das consultas
-- Idempotente e tolerante a esquemas legados (coluna de cliente com nomes diferentes).

-- Garantir coluna companyname em clients (sem abortar o restante do ficheiro)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'clients'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'companyname'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'company_name'
    ) THEN
      ALTER TABLE clients RENAME COLUMN company_name TO companyname;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'name'
    ) THEN
      ALTER TABLE clients RENAME COLUMN name TO companyname;
    ELSE
      ALTER TABLE clients ADD COLUMN companyname VARCHAR(255) NOT NULL DEFAULT '';
      ALTER TABLE clients ALTER COLUMN companyname DROP DEFAULT;
    END IF;
  END IF;
END $$;

-- Índices na tabela products
CREATE INDEX IF NOT EXISTS idx_products_productcode ON products(productcode);
CREATE INDEX IF NOT EXISTS idx_products_subcode ON products(subcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_createdat ON products(createdat DESC);

-- Índices na tabela clients (só se as colunas existirem)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'companyname'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_clients_companyname ON clients(companyname);
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'cnpj'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON clients(cnpj);
  END IF;
END $$;

-- Índices na tabela orders (verificar nomes de colunas)
CREATE INDEX IF NOT EXISTS idx_orders_clientid ON orders(clientid);
CREATE INDEX IF NOT EXISTS idx_orders_userid ON orders(userid);
CREATE INDEX IF NOT EXISTS idx_orders_createdat ON orders(createdat DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Índice composto para buscas por cliente e data
CREATE INDEX IF NOT EXISTS idx_orders_client_date ON orders(clientid, createdat DESC);

-- Índice para busca de produtos por marca e data
CREATE INDEX IF NOT EXISTS idx_products_brand_date ON products(brand, createdat DESC);
