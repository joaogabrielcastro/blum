function maybeStripLegacy(obj, legacyKeys, options = {}) {
  if (!options.camelOnly || !obj || typeof obj !== "object") return obj;
  const clone = { ...obj };
  for (const key of legacyKeys) {
    delete clone[key];
  }
  return clone;
}

function mapProductResponse(product, options = {}) {
  if (!product || typeof product !== "object") return product;
  const mapped = {
    ...product,
    tenantId: product.tenantId ?? product.tenant_id ?? null,
    brandId: product.brandId ?? product.brand_id ?? null,
    productCode: product.productcode ?? product.productCode ?? "",
    subCode: product.subcode ?? product.subCode ?? "",
    minStock: product.minstock ?? product.minStock ?? 0,
    createdAt: product.createdat ?? product.createdAt ?? null,
  };
  return maybeStripLegacy(
    mapped,
    [
      "tenant_id",
      "brand_id",
      "productcode",
      "subcode",
      "minstock",
      "createdat",
    ],
    options,
  );
}

function mapProductsPayload(payload, options = {}) {
  if (!payload || typeof payload !== "object") return payload;
  if (!Array.isArray(payload.data)) return payload;
  return {
    ...payload,
    data: payload.data.map((item) => mapProductResponse(item, options)),
  };
}

function mapClientResponse(client, options = {}) {
  if (!client || typeof client !== "object") return client;
  const mapped = {
    ...client,
    tenantId: client.tenantId ?? client.tenant_id ?? null,
    companyName: client.companyName ?? client.companyname ?? "",
    contactPerson: client.contactPerson ?? client.contactperson ?? "",
    createdAt: client.createdAt ?? client.createdat ?? null,
  };
  return maybeStripLegacy(
    mapped,
    ["tenant_id", "companyname", "contactperson", "createdat"],
    options,
  );
}

function mapClientsPayload(clients, options = {}) {
  if (!Array.isArray(clients)) return clients;
  return clients.map((item) => mapClientResponse(item, options));
}

function mapOrderItemResponse(item, options = {}) {
  if (!item || typeof item !== "object") return item;
  const mapped = {
    ...item,
    tenantId: item.tenantId ?? item.tenant_id ?? null,
    productId: item.productId ?? item.product_id ?? null,
    productName: item.productName ?? item.product_name ?? "",
    unitPrice: item.unitPrice ?? item.unit_price ?? 0,
    lineTotal: item.lineTotal ?? item.line_total ?? 0,
    lineDiscount: item.lineDiscount ?? item.line_discount ?? 0,
    commissionRate: item.commissionRate ?? item.commission_rate ?? 0,
    commissionAmount: item.commissionAmount ?? item.commission_amount ?? 0,
    productCode: item.productCode ?? item.productcode ?? "",
    subCode: item.subCode ?? item.subcode ?? "",
  };
  return maybeStripLegacy(
    mapped,
    [
      "tenant_id",
      "product_id",
      "product_name",
      "unit_price",
      "line_total",
      "line_discount",
      "commission_rate",
      "commission_amount",
      "productcode",
      "subcode",
    ],
    options,
  );
}

function mapOrderResponse(order, options = {}) {
  if (!order || typeof order !== "object") return order;
  const mapped = {
    ...order,
    tenantId: order.tenantId ?? order.tenant_id ?? null,
    userId: order.userId ?? order.userid ?? null,
    clientId: order.clientId ?? order.clientid ?? order.client_id ?? null,
    userRef: order.userRef ?? order.user_ref ?? null,
    totalPrice: order.totalPrice ?? order.totalprice ?? 0,
    totalCommission: order.totalCommission ?? order.total_commission ?? 0,
    createdAt: order.createdAt ?? order.createdat ?? null,
    finishedAt: order.finishedAt ?? order.finishedat ?? null,
    documentType: order.documentType ?? order.document_type ?? "orcamento",
    paymentMethod: order.paymentMethod ?? order.payment_method ?? null,
    sellerName: order.sellerName ?? order.seller_name ?? "",
    sellerUsername: order.sellerUsername ?? order.seller_username ?? "",
    itemsCount: order.itemsCount ?? order.items_count ?? 0,
    representedBrands: order.representedBrands ?? order.representadas ?? "",
    items: Array.isArray(order.items)
      ? order.items.map((item) => mapOrderItemResponse(item, options))
      : order.items,
  };
  return maybeStripLegacy(
    mapped,
    [
      "tenant_id",
      "userid",
      "clientid",
      "client_id",
      "user_ref",
      "totalprice",
      "total_commission",
      "createdat",
      "finishedat",
      "document_type",
      "payment_method",
      "seller_name",
      "seller_username",
      "items_count",
      "representadas",
    ],
    options,
  );
}

function mapOrdersPayload(orders, options = {}) {
  if (!Array.isArray(orders)) return orders;
  return orders.map((item) => mapOrderResponse(item, options));
}

function mapSalesByRepRow(row, options = {}) {
  if (!row || typeof row !== "object") return row;
  const mapped = {
    ...row,
    userId: row.userId ?? row.user_id ?? null,
    sellerName: row.sellerName ?? row.seller_name ?? "",
    totalSales: Number(row.totalSales ?? row.total_sales ?? 0),
  };
  return maybeStripLegacy(
    mapped,
    ["user_id", "seller_name", "total_sales"],
    options,
  );
}

function mapSalesByRepPayload(rows, options = {}) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((item) => mapSalesByRepRow(item, options));
}

function mapCommissionReportRow(row, options = {}) {
  if (!row || typeof row !== "object") return row;
  const mapped = {
    ...row,
    tenantId: row.tenantId ?? row.tenant_id ?? null,
    userRef: row.userRef ?? row.user_ref ?? null,
    sellerName: row.sellerName ?? row.seller_name ?? "",
    totalOrders: Number(row.totalOrders ?? row.total_orders ?? 0),
    totalSales: Number(row.totalSales ?? row.total_sales ?? 0),
    totalCommission: Number(row.totalCommission ?? row.total_commission ?? 0),
  };
  return maybeStripLegacy(
    mapped,
    [
      "tenant_id",
      "user_ref",
      "seller_name",
      "total_orders",
      "total_sales",
      "total_commission",
    ],
    options,
  );
}

function mapCommissionReportPayload(rows, options = {}) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((item) => mapCommissionReportRow(item, options));
}

function mapCommissionByBrandRow(row, options = {}) {
  if (!row || typeof row !== "object") return row;
  const mappedItems = Array.isArray(row.items)
    ? row.items.map((item) =>
        maybeStripLegacy(
          {
            ...item,
            commissionAmount:
              item.commissionAmount ?? item.commission_amount ?? 0,
            unitPrice: item.unitPrice ?? item.unit_price ?? 0,
            lineTotal: item.lineTotal ?? item.line_total ?? 0,
          },
          ["commission_amount", "unit_price", "line_total"],
          options,
        ),
      )
    : row.items;
  const mapped = {
    ...row,
    tenantId: row.tenantId ?? row.tenant_id ?? null,
    userRef: row.userRef ?? row.user_ref ?? null,
    sellerUsername: row.sellerUsername ?? row.seller_username ?? "",
    sellerName: row.sellerName ?? row.seller_name ?? "",
    orderId: row.orderId ?? row.order_id ?? null,
    createdAt: row.createdAt ?? row.createdat ?? null,
    totalPrice: Number(row.totalPrice ?? row.totalprice ?? 0),
    totalCommission: Number(row.totalCommission ?? row.total_commission ?? 0),
    items: mappedItems,
  };
  return maybeStripLegacy(
    mapped,
    [
      "tenant_id",
      "user_ref",
      "seller_username",
      "seller_name",
      "order_id",
      "createdat",
      "totalprice",
      "total_commission",
    ],
    options,
  );
}

function mapCommissionByBrandPayload(rows, options = {}) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((item) => mapCommissionByBrandRow(item, options));
}

function mapPurchaseHistoryRow(row, options = {}) {
  if (!row || typeof row !== "object") return row;
  const mapped = {
    ...row,
    tenantId: row.tenantId ?? row.tenant_id ?? null,
    purchasePrice: Number(row.purchasePrice ?? row.purchase_price ?? 0),
    purchaseDate: row.purchaseDate ?? row.purchase_date ?? null,
    createdAt: row.createdAt ?? row.created_at ?? null,
    productName: row.productName ?? row.product_name ?? "",
    productCode: row.productCode ?? row.productcode ?? "",
    subCode: row.subCode ?? row.subcode ?? "",
  };
  return maybeStripLegacy(
    mapped,
    [
      "tenant_id",
      "purchase_price",
      "purchase_date",
      "created_at",
      "product_name",
      "productcode",
      "subcode",
    ],
    options,
  );
}

function mapPurchaseHistoryPayload(rows, options = {}) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((item) => mapPurchaseHistoryRow(item, options));
}

function mapLastPurchasePriceRow(row, options = {}) {
  if (!row || typeof row !== "object") return row;
  const mapped = {
    ...row,
    tenantId: row.tenantId ?? row.tenant_id ?? null,
    purchasePrice: Number(row.purchasePrice ?? row.purchase_price ?? 0),
    purchaseDate: row.purchaseDate ?? row.purchase_date ?? null,
  };
  return maybeStripLegacy(
    mapped,
    ["tenant_id", "purchase_price", "purchase_date"],
    options,
  );
}

function mapAuthUserResponse(user, options = {}) {
  if (!user || typeof user !== "object") return user;
  const mapped = {
    ...user,
    tenantId: user.tenantId ?? user.tenant_id ?? null,
    createdAt: user.createdAt ?? user.createdat ?? null,
  };
  return maybeStripLegacy(mapped, ["tenant_id", "createdat"], options);
}

function mapAuthUsersPayload(users, options = {}) {
  if (!Array.isArray(users)) return users;
  return users.map((user) => mapAuthUserResponse(user, options));
}

function mapBrandResponse(brand, options = {}) {
  if (!brand || typeof brand !== "object") return brand;
  const mapped = {
    ...brand,
    commissionRate: brand.commissionRate ?? brand.commission_rate ?? 0,
    logoUrl: brand.logoUrl ?? brand.logo_url ?? null,
  };
  return maybeStripLegacy(mapped, ["commission_rate", "logo_url"], options);
}

function mapBrandsPayload(brands, options = {}) {
  if (!Array.isArray(brands)) return brands;
  return brands.map((brand) => mapBrandResponse(brand, options));
}

function mapUserAllowedBrandsPayload(payload, options = {}) {
  if (!payload || typeof payload !== "object") return payload;
  const mapped = {
    ...payload,
    userId: payload.userId ?? payload.user_id ?? null,
    brandIds: payload.brandIds ?? payload.brand_ids ?? [],
  };
  return maybeStripLegacy(mapped, ["user_id", "brand_ids"], options);
}

function mapClientItemPriceHistoryRow(row, options = {}) {
  if (!row || typeof row !== "object") return row;
  const mapped = {
    ...row,
    orderId: row.orderId ?? row.order_id ?? null,
    createdAt: row.createdAt ?? row.created_at ?? null,
    unitPrice: row.unitPrice ?? row.unit_price ?? 0,
    lineDiscount: row.lineDiscount ?? row.line_discount ?? 0,
    paymentMethod: row.paymentMethod ?? row.payment_method ?? null,
    sellerName: row.sellerName ?? row.seller_name ?? null,
  };
  return maybeStripLegacy(
    mapped,
    [
      "order_id",
      "created_at",
      "unit_price",
      "line_discount",
      "payment_method",
      "seller_name",
    ],
    options,
  );
}

function mapClientItemPriceHistoryPayload(rows, options = {}) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((row) => mapClientItemPriceHistoryRow(row, options));
}

module.exports = {
  mapProductResponse,
  mapProductsPayload,
  mapClientResponse,
  mapClientsPayload,
  mapOrderResponse,
  mapOrdersPayload,
  mapSalesByRepPayload,
  mapCommissionReportPayload,
  mapCommissionByBrandPayload,
  mapPurchaseHistoryPayload,
  mapLastPurchasePriceRow,
  mapAuthUserResponse,
  mapAuthUsersPayload,
  mapBrandResponse,
  mapBrandsPayload,
  mapUserAllowedBrandsPayload,
  mapClientItemPriceHistoryPayload,
};
