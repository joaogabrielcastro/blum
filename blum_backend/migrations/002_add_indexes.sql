-- Migration: Adicionar índices para melhorar performance das consultas
-- Data: 2025-12-09

-- Índices na tabela products
CREATE INDEX IF NOT EXISTS idx_products_productcode ON products(productcode);
CREATE INDEX IF NOT EXISTS idx_products_subcode ON products(subcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_createdat ON products(createdat DESC);

-- Índices na tabela clients
CREATE INDEX IF NOT EXISTS idx_clients_companyname ON clients(companyname);
CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON clients(cnpj);

-- Índices na tabela orders (verificar nomes de colunas)
CREATE INDEX IF NOT EXISTS idx_orders_clientid ON orders(clientid);
CREATE INDEX IF NOT EXISTS idx_orders_createdat ON orders(createdat DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Índice composto para buscas por cliente e data
CREATE INDEX IF NOT EXISTS idx_orders_client_date ON orders(clientid, createdat DESC);

-- Índice para busca de produtos por marca e data
CREATE INDEX IF NOT EXISTS idx_products_brand_date ON products(brand, createdat DESC);
