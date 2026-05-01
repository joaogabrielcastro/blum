const { sql } = require("../config/database");

async function findBrandByIdAndTenant(brandId, tenantId) {
  return sql`SELECT id, name FROM brands WHERE id = ${brandId} AND tenant_id = ${tenantId}`;
}

async function findPriceHistoryByProductAndTenant(productId, tenantId) {
  return sql`
    SELECT 
      ph.id,
      ph.purchase_price,
      ph.quantity,
      ph.purchase_date,
      ph.created_at,
      p.name as product_name,
      p.productcode,
      p.subcode
    FROM price_history ph
    JOIN products p ON COALESCE(ph.product_id, ph.productid) = p.id
    WHERE COALESCE(ph.product_id, ph.productid) = ${productId}
      AND ph.tenant_id = ${tenantId}
      AND p.tenant_id = ${tenantId}
    ORDER BY ph.purchase_date DESC
  `;
}

module.exports = {
  findBrandByIdAndTenant,
  findPriceHistoryByProductAndTenant,
};
