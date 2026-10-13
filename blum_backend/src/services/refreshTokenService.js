const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { sql, pool } = require("../config/database");
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

function createSignedRefreshToken({ tenantId, userId }) {
  const tokenJti = crypto.randomUUID();
  const expiresAt = getExpiresAt();
  const refreshToken = jwt.sign(
    { type: "refresh", tenantId, userId, jti: tokenJti },
    getRefreshSecret(),
    { expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d` },
  );
  return { tokenJti, expiresAt, refreshToken };
}

async function issueRefreshToken({
  tenantId,
  userId,
  userAgent = null,
  ipAddress = null,
}) {
  const { tokenJti, expiresAt, refreshToken } = createSignedRefreshToken({
    tenantId,
    userId,
  });

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

  const next = createSignedRefreshToken({
    tenantId: decoded.tenantId,
    userId: decoded.userId,
  });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [
      String(decoded.tenantId),
    ]);
    const current = await client.query(
      `SELECT id FROM auth_refresh_tokens
       WHERE tenant_id = $1 AND user_id = $2 AND token_jti = $3
         AND token_hash = $4 AND revoked_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [
        decoded.tenantId,
        decoded.userId,
        decoded.jti,
        hashToken(refreshToken),
      ],
    );
    if (!current.rows.length) {
      const err = new Error("Refresh token expirado ou revogado");
      err.statusCode = 401;
      throw err;
    }
    await client.query(
      `INSERT INTO auth_refresh_tokens
        (tenant_id, user_id, token_hash, token_jti, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        decoded.tenantId,
        decoded.userId,
        hashToken(next.refreshToken),
        next.tokenJti,
        next.expiresAt,
        userAgent,
        ipAddress,
      ],
    );
    await client.query(
      `UPDATE auth_refresh_tokens
       SET revoked_at = NOW(), replaced_by_jti = $1
       WHERE id = $2 AND revoked_at IS NULL`,
      [next.tokenJti, current.rows[0].id],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return {
    tenantId: decoded.tenantId,
    userId: decoded.userId,
    refreshToken: next.refreshToken,
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
