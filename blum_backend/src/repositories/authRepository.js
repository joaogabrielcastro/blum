const { sql } = require("../config/database");

async function findUserByUsernameAndTenantSlug(username, tenantSlug = "default") {
  return sql`
    SELECT u.id, u.username, u.password_hash, u.role, u.name, u.tenant_id, t.slug AS tenant_slug
    FROM users u
    INNER JOIN tenants t ON t.id = u.tenant_id
    WHERE LOWER(TRIM(username)) = LOWER(${username})
      AND t.slug = ${tenantSlug}
  `;
}

async function findUserByIdAndTenant(userId, tenantId) {
  return sql`
    SELECT id, username, role, name, tenant_id, password_hash
    FROM users
    WHERE id = ${userId} AND tenant_id = ${tenantId}
    LIMIT 1
  `;
}

async function createUser({ username, passwordHash, role, name, tenantId }) {
  return sql`
    INSERT INTO users (username, password_hash, role, name, tenant_id)
    VALUES (${username}, ${passwordHash}, ${role}, ${name}, ${tenantId})
    RETURNING id, username, role, name, createdat, tenant_id
  `;
}

async function listUsersByTenant(tenantId) {
  return sql`
    SELECT id, username, role, name, createdat, tenant_id
    FROM users
    WHERE tenant_id = ${tenantId}
    ORDER BY username ASC
  `;
}

async function updateUserPassword(userId, tenantId, passwordHash) {
  return sql`
    UPDATE users
    SET password_hash = ${passwordHash}
    WHERE id = ${userId} AND tenant_id = ${tenantId}
  `;
}

async function countOrdersByUserRef(userId, tenantId) {
  const rows = await sql`
    SELECT COUNT(*)::int AS c
    FROM orders
    WHERE user_ref = ${userId} AND tenant_id = ${tenantId}
  `;
  return rows[0]?.c ?? 0;
}

async function deleteSalespersonById(userId, tenantId) {
  return sql`
    DELETE FROM users
    WHERE id = ${userId}
      AND tenant_id = ${tenantId}
      AND role = 'salesperson'
    RETURNING id, username
  `;
}

module.exports = {
  findUserByUsernameAndTenantSlug,
  findUserByIdAndTenant,
  createUser,
  listUsersByTenant,
  updateUserPassword,
  countOrdersByUserRef,
  deleteSalespersonById,
};
