-- Bases antigas / importadas sem estas colunas (o import Excel adapta-se, mas a API espera-as).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contactperson VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email VARCHAR(255);
