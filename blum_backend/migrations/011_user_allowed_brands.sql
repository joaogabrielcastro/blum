-- Representadas permitidas por vendedor. Sem linhas = acesso a todas (compatível com instalações antigas).

CREATE TABLE IF NOT EXISTS user_allowed_brands (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, brand_id)
);

CREATE INDEX IF NOT EXISTS idx_user_allowed_brands_user ON user_allowed_brands(user_id);
