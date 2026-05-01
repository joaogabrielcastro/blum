const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { sql } = require("../config/database");
const { getJwtSecret } = require("../config/env");

const REFRESH_TOKEN_TTL_DAYS = parseInt(
  process.env.REFRESH_TOKEN_TTL_DAYS || "15",
  10,
);

function getRefreshSecret() {
  return process.env.JWT_REFRESH_SECRET || `${getJwtSecret()}-refresh`;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getExpiresAt() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);
  return expiresAt;
}

async function issueRefreshToken({
  tenantId,
  userId,
  userAgent = null,
  ipAddress = null,
}) {
  const tokenJti = crypto.randomUUID();
  const expiresAt = getExpiresAt();
  const refreshToken = jwt.sign(
    {
      type: "refresh",
      tenantId,
      userId,
      jti: tokenJti,
    },
    getRefreshSecret(),
    { expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d` },
  );

  await sql`
    INSERT INTO auth_refresh_tokens (
      tenant_id, user_id, token_hash, token_jti, expires_at, user_agent, ip_address
    )
    VALUES (
      ${tenantId}, ${userId}, ${hashToken(refreshToken)}, ${tokenJti}, ${expiresAt}, ${userAgent}, ${ipAddress}
    )
  `;

  return refreshToken;
}

async function rotateRefreshToken({
  refreshToken,
  userAgent = null,
  ipAddress = null,
}) {
  const decoded = jwt.verify(refreshToken, getRefreshSecret());
  if (decoded.type !== "refresh") {
    const err = new Error("Refresh token inválido");
    err.statusCode = 401;
    throw err;
  }

  const rows = await sql`
    SELECT *
    FROM auth_refresh_tokens
    WHERE tenant_id = ${decoded.tenantId}
      AND user_id = ${decoded.userId}
      AND token_jti = ${decoded.jti}
      AND token_hash = ${hashToken(refreshToken)}
      AND revoked_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
  `;

  if (!rows.length) {
    const err = new Error("Refresh token expirado ou revogado");
    err.statusCode = 401;
    throw err;
  }

  const newToken = await issueRefreshToken({
    tenantId: decoded.tenantId,
    userId: decoded.userId,
    userAgent,
    ipAddress,
  });
  const newDecoded = jwt.verify(newToken, getRefreshSecret());

  await sql`
    UPDATE auth_refresh_tokens
    SET revoked_at = NOW(), replaced_by_jti = ${newDecoded.jti}
    WHERE id = ${rows[0].id}
  `;

  return {
    tenantId: decoded.tenantId,
    userId: decoded.userId,
    refreshToken: newToken,
  };
}

async function revokeRefreshToken(refreshToken) {
  const decoded = jwt.verify(refreshToken, getRefreshSecret());
  if (decoded.type !== "refresh") return;
  await sql`
    UPDATE auth_refresh_tokens
    SET revoked_at = NOW()
    WHERE tenant_id = ${decoded.tenantId}
      AND user_id = ${decoded.userId}
      AND token_jti = ${decoded.jti}
      AND token_hash = ${hashToken(refreshToken)}
      AND revoked_at IS NULL
  `;
}

module.exports = {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
};
