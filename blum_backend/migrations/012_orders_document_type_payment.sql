-- Orçamento → Pedido; forma de pagamento; representadas agregadas na listagem (via SELECT na app)

ALTER TABLE orders ADD COLUMN IF NOT EXISTS document_type VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30);

UPDATE orders SET document_type = 'pedido' WHERE document_type IS NULL;

ALTER TABLE orders ALTER COLUMN document_type SET DEFAULT 'orcamento';
ALTER TABLE orders ALTER COLUMN document_type SET NOT NULL;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_document_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_document_type_check
  CHECK (document_type IN ('orcamento', 'pedido'));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (
    payment_method IS NULL
    OR payment_method IN ('carteira', 'boleto', 'pix', 'cheque', 'dinheiro')
  );
