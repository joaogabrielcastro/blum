function enrichOrder(row) {
  if (!row) return row;
  const uid = row.user_ref != null ? String(row.user_ref) : null;
  return {
    ...row,
    userid: uid,
    userId: row.user_ref,
  };
}

function representadasFromItems(items) {
  const set = new Set();
  for (const item of items || []) {
    const brand = String(item.brand ?? "").trim();
    if (brand) set.add(brand);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR")).join(", ");
}

function mapOrderItemsWithProducts(lines) {
  return lines.map((row) => ({
    productId: row.product_id,
    productName: row.product_name,
    brand: row.brand,
    quantity: row.quantity,
    price: parseFloat(row.unit_price),
    lineDiscount: parseFloat(row.line_discount) || 0,
    commission_rate: parseFloat(row.commission_rate) || 0,
    commission_amount: parseFloat(row.commission_amount) || 0,
    productcode: row.productcode || "",
    subcode: row.subcode || "",
  }));
}

module.exports = {
  enrichOrder,
  representadasFromItems,
  mapOrderItemsWithProducts,
};
