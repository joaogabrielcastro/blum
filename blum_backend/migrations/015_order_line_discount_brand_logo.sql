-- Desconto por linha em itens de pedido; logo opcional por representada

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS line_discount DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS logo_url VARCHAR(1024);
