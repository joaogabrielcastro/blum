-- Migration: Create users table and populate with default users
-- Execute este SQL no Neon Console ou via script de migração

-- 1. Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'salesperson')),
  name VARCHAR(255),
  createdat TIMESTAMP DEFAULT NOW()
);

-- 2. Criar índice para melhor performance em buscas
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 3. Inserir usuários padrão (EXECUTE ESTE BLOCO NO NODE.JS - veja script abaixo)
-- Não inserir diretamente pois as senhas precisam ser hashadas com bcrypt

-- 4. Para gerar os hashes, execute o script create-users.js que será criado:
-- node blum_backend/migrations/create-users.js
