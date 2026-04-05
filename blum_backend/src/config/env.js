/**
 * Variáveis críticas: falha explícita em produção quando obrigatórias.
 */
const MIN_JWT_SECRET_LENGTH = 32;

function assertProductionConfig() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const jwt = process.env.JWT_SECRET;
  if (!jwt || jwt.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET é obrigatório em produção e deve ter pelo menos ${MIN_JWT_SECRET_LENGTH} caracteres`,
    );
  }

  if (!process.env.DATABASE_URL || !String(process.env.DATABASE_URL).trim()) {
    throw new Error("DATABASE_URL é obrigatório em produção");
  }
}

function getJwtSecret() {
  if (process.env.NODE_ENV === "production") {
    return process.env.JWT_SECRET;
  }
  return process.env.JWT_SECRET || "blum-dev-secret-change-me";
}

module.exports = { assertProductionConfig, getJwtSecret, MIN_JWT_SECRET_LENGTH };
