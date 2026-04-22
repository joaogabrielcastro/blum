-- Permite quantidades fracionadas (ex.: toneladas) em pedidos.
ALTER TABLE order_items
  ALTER COLUMN quantity TYPE DECIMAL(12,3) USING quantity::DECIMAL(12,3);
