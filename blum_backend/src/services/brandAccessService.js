const { sql } = require("../config/database");
const { requireTenantId } = require("../utils/tenantContext");

/**
 * Se o vendedor tem restrição explícita, devolve lista de nomes de marcas.
 * null = sem restrição (admin ou vendedor sem linhas em user_allowed_brands).
 */
async function getRestrictedBrandNamesOrNull(userId, role, tenantId) {
  tenantId = requireTenantId(tenantId);
  if (role === "admin") return null;

  const rows = await sql`
    SELECT b.name
    FROM user_allowed_brands uab
    INNER JOIN brands b ON b.id = uab.brand_id
    WHERE uab.user_id = ${userId}
      AND uab.tenant_id = ${tenantId}
      AND b.tenant_id = ${tenantId}
    ORDER BY b.name ASC
  `;

  if (!rows.length) return null;
  return rows.map((r) => r.name);
}

async function getAllowedBrandIdsForUser(userId, tenantId) {
  tenantId = requireTenantId(tenantId);
  const rows = await sql`
    SELECT brand_id FROM user_allowed_brands
    WHERE user_id = ${userId} AND tenant_id = ${tenantId}
  `;
  return rows.map((r) => r.brand_id);
}

async function setAllowedBrandIdsForUser(userId, brandIds, tenantId) {
  tenantId = requireTenantId(tenantId);
  const ids = Array.from(
    new Set(
      (brandIds || [])
        .map((id) => parseInt(id, 10))
        .filter((n) => Number.isInteger(n) && n > 0),
    ),
  );

  await sql`DELETE FROM user_allowed_brands WHERE user_id = ${userId} AND tenant_id = ${tenantId}`;

  for (const brandId of ids) {
    await sql`
      INSERT INTO user_allowed_brands (user_id, brand_id, tenant_id)
      VALUES (${userId}, ${brandId}, ${tenantId})
    `;
  }
}

module.exports = {
  getRestrictedBrandNamesOrNull,
  getAllowedBrandIdsForUser,
  setAllowedBrandIdsForUser,
};
