const { sql, pool } = require("../config/database");
const orderRepository = require("../repositories/orderRepository");
const { requireTenantId, tenantIdFromAuth } = require("../utils/tenantContext");
const {
  enrichOrder,
  representadasFromItems,
  mapOrderItemsWithProducts,
} = require("../mappers/orderMapper");

const REPRESENTADAS_SQL = `(
  SELECT COALESCE(string_agg(s.b, ', ' ORDER BY s.b), '')
  FROM (
    SELECT DISTINCT trim(oi.brand) AS b FROM order_items oi
    WHERE oi.order_id = o.id AND trim(COALESCE(oi.brand, '')) <> ''
  ) s
) AS representadas`;

const REPRESENTADAS_FRAGMENT = {
  __isSqlFragment: true,
  text: REPRESENTADAS_SQL,
  values: [],
};
const ALLOWED_PAYMENT_METHODS = [
  "carteira",
  "boleto",
  "pix",
  "cheque",
  "dinheiro",
];
const DECIMAL_QUANTITY_BRANDS = new Set(["solo fino", "colombocal"]);

function normalizeBrandName(name) {
  return String(name || "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function allowsDecimalQuantityByBrand(brand) {
  return DECIMAL_QUANTITY_BRANDS.has(normalizeBrandName(brand));
}

function controlsStockByBrand(brand) {
  return !allowsDecimalQuantityByBrand(brand);
}

function parseQuantityValue(rawValue, { brand, defaultValue = 0 } = {}) {
  const raw = String(rawValue ?? "")
    .trim()
    .replace(",", ".");
  const parsed = parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultValue;
  if (allowsDecimalQuantityByBrand(brand)) {
    return Math.round(parsed * 1000) / 1000;
  }
  return Math.max(1, Math.round(parsed));
}

function parseCreatedAt(rawValue) {
  if (rawValue == null || rawValue === "") return null;
  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Data de criação inválida");
  }
  return date;
}

function aggregateControlledStockQuantities(items = []) {
  const totals = new Map();
  for (const item of items) {
    if (!item?.productId || !controlsStockByBrand(item.brand)) continue;
    const qty = parseQuantityValue(item.quantity, {
      brand: item.brand,
      defaultValue: 0,
    });
    if (!qty) continue;
    const key = String(item.productId);
    totals.set(key, (totals.get(key) || 0) + qty);
  }
  return totals;
}

function stockShortfallValue(item) {
  const raw = item?.stock_shortfall ?? item?.stockShortfall ?? 0;
  const n = parseFloat(String(raw).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function computeHasStockWarning(items = []) {
  return items.some((item) => stockShortfallValue(item) > 0);
}

function isStockWarningConfirmed(orderData) {
  return (
    orderData?.confirmStockWarning === true ||
    orderData?.confirm_stock_warning === true
  );
}

function buildStockWarningError(message, items = []) {
  const err = new Error(message);
  err.statusCode = 400;
  err.code = "STOCK_WARNING_CONFIRM_REQUIRED";
  err.stockWarnings = items
    .filter((item) => stockShortfallValue(item) > 0)
    .map((item) => ({
      productId: item.productId,
      productName: item.productName || item.product_name || "",
      quantity: parseQuantityValue(item.quantity, {
        brand: item.brand,
        defaultValue: 0,
      }),
      availableStock: item.stock_at_save ?? item.stockAtSave ?? 0,
      shortfall: stockShortfallValue(item),
    }));
  return err;
}

class OrderService {
  async loadCommissionRatesByBrandNames(brandNames, tenantId) {
    tenantId = requireTenantId(tenantId);
    const unique = [...new Set((brandNames || []).filter(Boolean))];
    if (unique.length === 0) {
      return new Map();
    }
    const rows = await sql`
      SELECT name, commission_rate FROM brands
      WHERE name = ANY(${unique}) AND tenant_id = ${tenantId}
    `;
    const map = new Map();
    for (const r of rows) {
      map.set(r.name, parseFloat(r.commission_rate) || 0);
    }
    return map;
  }

  async loadProductStockMap(productIds, tenantId) {
    tenantId = requireTenantId(tenantId);
    const intIds = [
      ...new Set(
        (productIds || [])
          .map((id) => parseInt(String(id), 10))
          .filter((n) => Number.isFinite(n) && n > 0),
      ),
    ];
    if (!intIds.length) return new Map();

    const rows = await sql`
      SELECT id, stock, name, price, brand, brand_id FROM products
      WHERE id = ANY(${intIds}) AND tenant_id = ${tenantId}
    `;
    return new Map(
      rows.map((r) => [
        String(r.id),
        {
          stock: parseInt(r.stock, 10) || 0,
          name: r.name,
          price: parseFloat(r.price) || 0,
          brand: r.brand,
          brandId: r.brand_id ?? null,
        },
      ]),
    );
  }

  reconcileItemsWithCatalog(items, productMap, { canOverridePrice = false } = {}) {
    return (items || []).map((item) => {
      const productInfo = productMap.get(String(item.productId));
      if (!productInfo) {
        throw new Error(
          `Produto "${item.productName || item.productId}" não encontrado`,
        );
      }
      const submittedPrice = parseFloat(item.price);
      const price =
        canOverridePrice && Number.isFinite(submittedPrice) && submittedPrice >= 0
          ? submittedPrice
          : productInfo.price;
      return {
        ...item,
        productName: productInfo.name,
        brand: productInfo.brand,
        brandId: productInfo.brandId,
        price,
      };
    });
  }

  enrichItemsWithStockWarnings(
    items,
    stockMap,
    { previousControlledStock = new Map() } = {},
  ) {
    return (items || []).map((item) => {
      if (!item?.productId || !controlsStockByBrand(item.brand)) {
        return {
          ...item,
          stock_at_save: null,
          stock_shortfall: 0,
        };
      }

      const productInfo = stockMap.get(String(item.productId));
      if (!productInfo) {
        throw new Error(
          `Produto "${item.productName || item.productId}" não encontrado`,
        );
      }

      const availableStock = productInfo.stock;
      const requestedQuantity = parseQuantityValue(item.quantity, {
        brand: item.brand,
        defaultValue: 0,
      });
      const previousQuantity =
        previousControlledStock.get(String(item.productId)) || 0;
      const effectiveAvailable = availableStock + previousQuantity;
      const shortfall = Math.max(0, requestedQuantity - effectiveAvailable);

      return {
        ...item,
        stock_at_save: availableStock,
        stock_shortfall: shortfall,
      };
    });
  }

  enforceStockWarningConfirmation(docType, hasStockWarning, orderData) {
    if (!hasStockWarning || docType !== "pedido") return;
    if (!isStockWarningConfirmed(orderData)) {
      throw buildStockWarningError(
        "Confirme o aviso de estoque insuficiente para salvar este pedido.",
        orderData?.items || [],
      );
    }
  }

  async loadBrandIdsByNames(brandNames, tenantId) {
    tenantId = requireTenantId(tenantId);
    const unique = [...new Set((brandNames || []).filter(Boolean))];
    if (unique.length === 0) return new Map();
    const rows = await sql`
      SELECT id, name FROM brands
      WHERE name = ANY(${unique}) AND tenant_id = ${tenantId}
    `;
    return new Map(rows.map((r) => [r.name, r.id]));
  }

  lineDiscountPct(item) {
    const raw =
      item.lineDiscount ??
      item.line_discount ??
      item.lineDiscountPercent ??
      0;
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(100, Math.max(0, n));
  }

  async calculateItemsCommission(items, discount = 0, tenantId) {
    const rateMap = await this.loadCommissionRatesByBrandNames(
      items.map((i) => i.brand),
      tenantId,
    );
    const orderDiscPct = parseFloat(discount) || 0;
    const orderFactor = 1 - orderDiscPct / 100;

    let subtotalAfterLineDiscounts = 0;

    const itemsWithCommission = items.map((item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseQuantityValue(item.quantity, {
        brand: item.brand,
        defaultValue: 1,
      });
      const lineDiscPct = this.lineDiscountPct(item);
      const lineFactor = 1 - lineDiscPct / 100;
      const grossLine = price * quantity;
      const afterLineDiscount = grossLine * lineFactor;
      subtotalAfterLineDiscounts += afterLineDiscount;

      const commissionRate = rateMap.get(item.brand) ?? 0;
      const itemTotalAfterOrderDiscount = afterLineDiscount * orderFactor;
      const commissionAmount =
        (itemTotalAfterOrderDiscount * commissionRate) / 100;

      return {
        ...item,
        price,
        quantity,
        line_discount: lineDiscPct,
        commission_rate: commissionRate,
        commission_amount: parseFloat(commissionAmount.toFixed(2)),
      };
    });

    const discountAmount =
      subtotalAfterLineDiscounts * (orderDiscPct / 100);
    const finalTotal = subtotalAfterLineDiscounts - discountAmount;
    const totalCommission = itemsWithCommission.reduce(
      (total, item) => total + (item.commission_amount || 0),
      0,
    );

    return {
      items: itemsWithCommission,
      subtotal: subtotalAfterLineDiscounts,
      discountAmount,
      finalTotal,
      totalCommission,
    };
  }

  async persistOrderItemsWithClient(client, orderId, calculatedItems, tenantId) {
    tenantId = requireTenantId(tenantId);
    await client.query("DELETE FROM order_items WHERE order_id = $1", [orderId]);
    if (!calculatedItems?.length) {
      return;
    }

    const brandIdMap = await this.loadBrandIdsByNames(
      calculatedItems.map((it) => it.brand),
      tenantId,
    );

    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    for (const it of calculatedItems) {
      const qty = parseQuantityValue(it.quantity, {
        brand: it.brand,
        defaultValue: 1,
      });
      const price = parseFloat(it.price) || 0;
      const lineDisc = parseFloat(it.line_discount) || 0;
      const lineFactor = 1 - Math.min(100, Math.max(0, lineDisc)) / 100;
      const lineTotal = qty * price * lineFactor;

      const brandIdRaw =
        it.brand_id ?? it.brandId ?? brandIdMap.get(it.brand) ?? null;
      const brandIdNum =
        brandIdRaw != null && brandIdRaw !== ""
          ? parseInt(brandIdRaw, 10)
          : null;

      const stockAtSave =
        it.stock_at_save != null
          ? parseInt(String(it.stock_at_save), 10)
          : it.stockAtSave != null
            ? parseInt(String(it.stockAtSave), 10)
            : null;
      const stockShortfall = stockShortfallValue(it);

      values.push(
        orderId,
        it.productId != null ? it.productId : null,
        it.productName || "",
        it.brand || "",
        Number.isInteger(brandIdNum) ? brandIdNum : null,
        qty,
        price,
        lineDisc,
        it.commission_rate || 0,
        it.commission_amount || 0,
        lineTotal,
        tenantId,
        Number.isFinite(stockAtSave) ? stockAtSave : null,
        stockShortfall,
      );

      placeholders.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, $${paramIndex + 12}, $${paramIndex + 13})`,
      );
      paramIndex += 14;
    }

    const insertSql = `
      INSERT INTO order_items (
        order_id, product_id, product_name, brand, brand_id, quantity, unit_price,
        line_discount, commission_rate, commission_amount, line_total, tenant_id,
        stock_at_save, stock_shortfall
      ) VALUES ${placeholders.join(", ")}
    `;

    await client.query(insertSql, values);
  }

  async persistOrderItems(orderId, calculatedItems, tenantId) {
    tenantId = requireTenantId(tenantId);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await this.persistOrderItemsWithClient(
        client,
        orderId,
        calculatedItems,
        tenantId,
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("persistOrderItems:", err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  async findAll(filters = {}) {
    const { authUser, clientid } = filters;
    if (!authUser || !authUser.role) {
      throw new Error("Sessão inválida");
    }

    const { role, userId } = authUser;
    const tenantId = tenantIdFromAuth(authUser);

    if (role === "admin") {
      let rows;
      if (clientid) {
        rows = await sql(
          `SELECT o.*, u.name AS seller_name, u.username AS seller_username,
            (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS items_count,
            ${REPRESENTADAS_SQL}
           FROM orders o
           LEFT JOIN users u ON u.id = o.user_ref
           WHERE o.clientid = $1 AND o.tenant_id = $2
           ORDER BY o.createdat DESC`,
          [clientid, tenantId],
        );
      } else {
        rows = await sql(
          `SELECT o.*, u.name AS seller_name, u.username AS seller_username,
            (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS items_count,
            ${REPRESENTADAS_SQL}
           FROM orders o
           LEFT JOIN users u ON u.id = o.user_ref
           WHERE o.tenant_id = $1
           ORDER BY o.createdat DESC`,
          [tenantId],
        );
      }
      return rows.map(enrichOrder);
    }

    if (role === "salesperson") {
      const uid = userId;
      if (clientid) {
        const rows = await sql`
          SELECT o.*, u.name AS seller_name, u.username AS seller_username,
            (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS items_count,
            ${REPRESENTADAS_FRAGMENT}
          FROM orders o
          LEFT JOIN users u ON u.id = o.user_ref
          WHERE o.user_ref = ${uid} AND o.clientid = ${clientid} AND o.tenant_id = ${tenantId}
          ORDER BY o.createdat DESC
        `;
        return rows.map(enrichOrder);
      }
      const rows = await sql`
        SELECT o.*, u.name AS seller_name, u.username AS seller_username,
          (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS items_count,
          ${REPRESENTADAS_FRAGMENT}
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_ref
        WHERE o.user_ref = ${uid} AND o.tenant_id = ${tenantId}
        ORDER BY o.createdat DESC
      `;
      return rows.map(enrichOrder);
    }

    return [];
  }

  async findById(id, tenantId) {
    tenantId = requireTenantId(tenantId);
    const result = await sql`
      SELECT o.*, u.name AS seller_name, u.username AS seller_username
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_ref
      WHERE o.id = ${id} AND o.tenant_id = ${tenantId}
    `;

    if (result.length === 0) {
      throw new Error("Pedido não encontrado");
    }

    const order = result[0];
    const lines =
      await sql`
        SELECT oi.*, p.productcode
        FROM order_items oi
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ${id} AND oi.tenant_id = ${tenantId}
        ORDER BY oi.id
      `;

    order.items = mapOrderItemsWithProducts(lines);

    order.representadas = representadasFromItems(order.items);

    return enrichOrder(order);
  }

  async findBySeller(userId, tenantId) {
    tenantId = requireTenantId(tenantId);
    const rows = await sql`
      SELECT o.*, u.name AS seller_name, u.username AS seller_username,
        (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS items_count,
        ${REPRESENTADAS_FRAGMENT}
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_ref
      WHERE o.user_ref = ${userId} AND o.tenant_id = ${tenantId}
      ORDER BY o.createdat DESC
    `;
    return rows.map(enrichOrder);
  }

  normalizeDocumentAndPayment(orderData, existing = null) {
    let docType;
    const incomingDoc =
      orderData.document_type ?? orderData.documentType ?? null;
    if (incomingDoc != null) {
      docType = incomingDoc === "pedido" ? "pedido" : "orcamento";
    } else if (existing != null) {
      const exDoc =
        existing.document_type ?? existing.documentType ?? null;
      if (exDoc != null) {
        docType = exDoc === "pedido" ? "pedido" : "orcamento";
      } else {
        docType = "orcamento";
      }
    } else {
      docType = "orcamento";
    }
    let payment;
    if (orderData.payment_method !== undefined) {
      payment = orderData.payment_method || null;
    } else if (orderData.paymentMethod !== undefined) {
      payment = orderData.paymentMethod || null;
    } else {
      payment =
        existing?.payment_method ?? existing?.paymentMethod ?? null;
    }
    if (payment && !ALLOWED_PAYMENT_METHODS.includes(payment)) payment = null;
    return { docType, payment };
  }

  enforceDiscountRules(discountRaw, paymentMethod) {
    const discount = Number(discountRaw) || 0;
    const allowDiscount = paymentMethod === "pix" || paymentMethod === "dinheiro";
    if (!allowDiscount && discount > 0) {
      const err = new Error(
        "Desconto geral só é permitido para PIX ou dinheiro.",
      );
      err.statusCode = 400;
      throw err;
    }
    if (allowDiscount && discount > 2) {
      const err = new Error("Desconto geral máximo para PIX ou dinheiro é 2%.");
      err.statusCode = 400;
      throw err;
    }
  }

  resolveSellerUserId(orderData, authUser) {
    const adminPickedSeller =
      authUser.role === "admin" &&
      (orderData.userid != null || orderData.userId != null);
    const raw = adminPickedSeller
      ? orderData.userid ?? orderData.userId
      : authUser.userId;
    const sellerId = parseInt(String(raw), 10);
    if (!Number.isFinite(sellerId) || sellerId < 1) {
      throw new Error("ID do vendedor inválido");
    }
    return sellerId;
  }

  async create(orderData, authUser) {
    const clientid =
      orderData.clientid ?? orderData.clientId ?? orderData.client_id;
    const { description, items, discount } = orderData;
    const { docType, payment } = this.normalizeDocumentAndPayment(orderData);
    this.enforceDiscountRules(discount, payment);

    const sellerUserId = this.resolveSellerUserId(orderData, authUser);
    const tenantId = tenantIdFromAuth(authUser);
    const createdAt = parseCreatedAt(
      orderData.createdat ?? orderData.createdAt,
    );
    const clientRequestId = String(
      orderData.client_request_id ?? orderData.clientRequestId ?? "",
    ).trim() || null;

    if (
      !clientid ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      throw new Error(
        "Dados incompletos. clientid e items (array) são obrigatórios",
      );
    }

    const stockMap = await this.loadProductStockMap(
      items.map((item) => item.productId),
      tenantId,
    );
    const requestedProductIds = new Set(
      items.map((item) => String(item.productId)).filter(Boolean),
    );
    if (stockMap.size !== requestedProductIds.size) {
      throw new Error("Um ou mais produtos não existem nesta empresa");
    }
    const catalogItems = this.reconcileItemsWithCatalog(items, stockMap, {
      canOverridePrice: authUser.role === "admin",
    });
    const itemsWithStock = this.enrichItemsWithStockWarnings(catalogItems, stockMap);
    const hasStockWarning = computeHasStockWarning(itemsWithStock);
    this.enforceStockWarningConfirmation(docType, hasStockWarning, {
      ...orderData,
      items: itemsWithStock,
    });

    const calculated = await this.calculateItemsCommission(
      itemsWithStock,
      discount,
      tenantId,
    );

    const client = await pool.connect();
    let orderId;
    try {
      await client.query("BEGIN");

      if (clientRequestId) {
        const existing = await client.query(
          `SELECT id FROM orders
           WHERE tenant_id = $1 AND client_request_id = $2
           LIMIT 1`,
          [tenantId, clientRequestId],
        );
        if (existing.rows.length) {
          orderId = existing.rows[0].id;
          await client.query("COMMIT");
          return this.findById(orderId, tenantId);
        }
      }

      const sellerRow = await client.query(
        "SELECT id FROM users WHERE id = $1 AND tenant_id = $2",
        [sellerUserId, tenantId],
      );
      if (sellerRow.rows.length === 0) {
        throw new Error("Vendedor não encontrado");
      }

      const clientRow = await client.query(
        "SELECT id FROM clients WHERE id = $1 AND tenant_id = $2",
        [clientid, tenantId],
      );
      if (clientRow.rows.length === 0) {
        throw new Error("Cliente não encontrado");
      }

      const result = await client.query(
        `INSERT INTO orders
          (clientid, user_ref, tenant_id, description, discount, totalprice,
           total_commission, status, createdat, document_type, payment_method,
           has_stock_warning, client_request_id, stock_committed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Em aberto',
                 COALESCE($8, NOW()), $9, $10, $11, $12,
                 CASE WHEN $9 = 'pedido' THEN NOW() ELSE NULL END)
         RETURNING id`,
        [
          clientid,
          sellerUserId,
          tenantId,
          description || "",
          discount || 0,
          calculated.finalTotal,
          calculated.totalCommission,
          createdAt,
          docType,
          payment,
          hasStockWarning,
          clientRequestId,
        ],
      );
      orderId = result.rows[0].id;
      await this.persistOrderItemsWithClient(
        client,
        orderId,
        calculated.items,
        tenantId,
      );
      if (docType === "pedido") {
        const orderedStock = aggregateControlledStockQuantities(calculated.items);
        for (const [productId, quantity] of orderedStock) {
          const updatedStock = await orderRepository.decreaseProductStock(client, {
            productId,
            quantity,
            tenantId,
          });
          if (updatedStock.length === 0) {
            const err = new Error(
              `Produto #${productId} não encontrado ao baixar o estoque.`,
            );
            err.statusCode = 404;
            throw err;
          }
        }
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      if (error.code === "23505" && clientRequestId) {
        const existing = await sql`
          SELECT id FROM orders
          WHERE tenant_id = ${tenantId} AND client_request_id = ${clientRequestId}
          LIMIT 1
        `;
        if (existing.length) return this.findById(existing[0].id, tenantId);
      }
      throw error;
    } finally {
      client.release();
    }

    return this.findById(orderId, tenantId);
  }

  async update(id, orderData, authUser) {
    const tenantId = tenantIdFromAuth(authUser);
    const existing = await this.findById(id, tenantId);
    const clientid =
      orderData.clientid ?? orderData.clientId ?? orderData.client_id;
    const { description, items, discount } = orderData;
    const { docType, payment } = this.normalizeDocumentAndPayment(
      orderData,
      existing,
    );
    this.enforceDiscountRules(discount, payment);

    const sellerUserId =
      authUser.role === "admin" && orderData.userid == null
        ? parseInt(String(existing.user_ref), 10)
        : this.resolveSellerUserId(orderData, authUser);
    const createdAt = parseCreatedAt(
      orderData.createdat ?? orderData.createdAt,
    );
    const existingDoc =
      existing.document_type ?? existing.documentType ?? null;
    const hadStockCommitted =
      existingDoc === "pedido" && Boolean(existing.stock_committed_at);
    const previousControlledStock = aggregateControlledStockQuantities(
      existing.items || [],
    );

    if (!clientid || !items || !Array.isArray(items)) {
      throw new Error(
        "Dados incompletos. clientid e items (array) são obrigatórios",
      );
    }

    const stockMap = await this.loadProductStockMap(
      items.map((item) => item.productId),
      tenantId,
    );
    const requestedProductIds = new Set(
      items.map((item) => String(item.productId)).filter(Boolean),
    );
    if (stockMap.size !== requestedProductIds.size) {
      throw new Error("Um ou mais produtos não existem nesta empresa");
    }
    const catalogItems = this.reconcileItemsWithCatalog(items, stockMap, {
      canOverridePrice: authUser.role === "admin",
    });
    const itemsWithStock = this.enrichItemsWithStockWarnings(catalogItems, stockMap, {
      previousControlledStock: hadStockCommitted
        ? previousControlledStock
        : new Map(),
    });
    const hasStockWarning = computeHasStockWarning(itemsWithStock);
    this.enforceStockWarningConfirmation(docType, hasStockWarning, {
      ...orderData,
      items: itemsWithStock,
    });

    const calculated = await this.calculateItemsCommission(
      itemsWithStock,
      discount,
      tenantId,
    );

    const sellerRow =
      await sql`SELECT id FROM users WHERE id = ${sellerUserId} AND tenant_id = ${tenantId}`;
    if (sellerRow.length === 0) {
      throw new Error("Vendedor não encontrado");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await orderRepository.updateOrderCore(client, {
        id,
        clientid,
        sellerUserId,
        description,
        discount,
        finalTotal: calculated.finalTotal,
        totalCommission: calculated.totalCommission,
        docType,
        payment,
        createdAt,
        hasStockWarning,
        tenantId,
      });

      if (result.length === 0) {
        throw new Error("Pedido não encontrado");
      }

      await this.persistOrderItemsWithClient(
        client,
        id,
        calculated.items,
        tenantId,
      );

      if (hadStockCommitted || docType === "pedido") {
        const nextControlledStock = docType === "pedido"
          ? aggregateControlledStockQuantities(calculated.items || [])
          : new Map();
        const productIds = new Set([
          ...previousControlledStock.keys(),
          ...nextControlledStock.keys(),
        ]);

        for (const productId of productIds) {
          const oldQty = previousControlledStock.get(productId) || 0;
          const newQty = nextControlledStock.get(productId) || 0;
          const delta = newQty - oldQty;
          if (!delta) continue;

          if (delta > 0) {
            const updatedStock = await orderRepository.decreaseProductStock(
              client,
              {
                productId,
                quantity: delta,
                tenantId,
              },
            );
            if (updatedStock.length === 0) {
              const err = new Error(
                `Produto #${productId} não encontrado ao ajustar o estoque.`,
              );
              err.statusCode = 404;
              throw err;
            }
          } else {
            const restoreQty = Math.abs(delta);
            await orderRepository.increaseProductStock(client, {
              productId,
              quantity: restoreQty,
              tenantId,
            });
          }
        }
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return this.findById(id, tenantId);
  }

  async updatePaymentMethod(id, paymentMethod, tenantId) {
    tenantId = requireTenantId(tenantId);
    if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
      const err = new Error("Forma de pagamento inválida.");
      err.statusCode = 400;
      throw err;
    }
    const current = await this.findById(id, tenantId);
    const currentDoc =
      current.document_type ?? current.documentType ?? null;
    if (currentDoc !== "pedido") {
      const err = new Error(
        "A forma de pagamento só pode ser definida em pedidos.",
      );
      err.statusCode = 400;
      throw err;
    }
    this.enforceDiscountRules(current.discount, paymentMethod);
    await sql`
      UPDATE orders
      SET payment_method = ${paymentMethod}
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    return this.findById(id, tenantId);
  }

  async duplicate(id, tenantId) {
    tenantId = requireTenantId(tenantId);
    const source = await this.findById(id, tenantId);
    const sourceItems = Array.isArray(source.items) ? source.items : [];
    if (sourceItems.length === 0) {
      throw new Error("Não é possível duplicar um pedido sem itens.");
    }
    const sourceDiscount = parseFloat(source.discount) || 0;
    const sourcePayment = source.payment_method ?? source.paymentMethod ?? null;
    let payment =
      sourcePayment && ALLOWED_PAYMENT_METHODS.includes(sourcePayment)
        ? sourcePayment
        : null;
    let discountToCopy = sourceDiscount;
    if (
      discountToCopy > 0 &&
      payment !== "pix" &&
      payment !== "dinheiro"
    ) {
      discountToCopy = 0;
    }
    const stockMap = await this.loadProductStockMap(
      sourceItems.map((item) => item.productId),
      tenantId,
    );
    const itemsWithStock = this.enrichItemsWithStockWarnings(
      sourceItems,
      stockMap,
    );
    const hasStockWarning = computeHasStockWarning(itemsWithStock);
    const calculated = await this.calculateItemsCommission(
      itemsWithStock,
      discountToCopy,
      tenantId,
    );
    const inserted = await sql`
      INSERT INTO orders
        (clientid, user_ref, tenant_id, description, discount, totalprice, total_commission, status, createdat, document_type, payment_method, has_stock_warning)
      VALUES
        (${source.clientid}, ${source.user_ref}, ${tenantId}, ${source.description || ""},
         ${discountToCopy}, ${calculated.finalTotal}, ${calculated.totalCommission},
         'Em aberto', NOW(), 'orcamento', ${payment}, ${hasStockWarning})
      RETURNING id
    `;
    const newId = inserted[0].id;
    await this.persistOrderItems(newId, calculated.items, tenantId);
    return this.findById(newId, tenantId);
  }

  async getClientItemPriceHistory(
    clientId,
    productId,
    authUser = null,
    limit = 8,
  ) {
    if (!clientId || !productId) {
      throw new Error("clientId e productId são obrigatórios");
    }
    const safeLimit = Math.min(30, Math.max(1, parseInt(limit, 10) || 8));
    const tenantId = tenantIdFromAuth(authUser);
    if (authUser?.role === "salesperson") {
      return sql`
        SELECT
          oi.id,
          o.id AS order_id,
          o.createdat AS created_at,
          oi.unit_price AS unit_price,
          oi.quantity,
          oi.line_discount,
          o.payment_method,
          u.name AS seller_name
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        LEFT JOIN users u ON u.id = o.user_ref
        WHERE o.clientid = ${clientId}
          AND o.tenant_id = ${tenantId}
          AND oi.product_id = ${productId}
          AND o.document_type = 'pedido'
          AND o.user_ref = ${authUser.userId}
        ORDER BY o.createdat DESC
        LIMIT ${safeLimit}
      `;
    }
    return sql`
      SELECT
        oi.id,
        o.id AS order_id,
        o.createdat AS created_at,
        oi.unit_price AS unit_price,
        oi.quantity,
        oi.line_discount,
        o.payment_method,
        u.name AS seller_name
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      LEFT JOIN users u ON u.id = o.user_ref
      WHERE o.clientid = ${clientId}
        AND o.tenant_id = ${tenantId}
        AND oi.product_id = ${productId}
        AND o.document_type = 'pedido'
      ORDER BY o.createdat DESC
      LIMIT ${safeLimit}
    `;
  }

  async convertToPedido(id, tenantId, options = {}) {
    tenantId = requireTenantId(tenantId);
    const order = await this.findById(id, tenantId);
    const orderDoc = order.document_type ?? order.documentType ?? null;
    if (orderDoc !== "orcamento") {
      const err = new Error(
        "Apenas orçamentos podem ser convertidos em pedido.",
      );
      err.statusCode = 400;
      throw err;
    }
    if (order.status === "Entregue") {
      const err = new Error("Orçamento já finalizado.");
      err.statusCode = 400;
      throw err;
    }

    const sourceItems = Array.isArray(order.items) ? order.items : [];
    const stockMap = await this.loadProductStockMap(
      sourceItems.map((item) => item.productId),
      tenantId,
    );
    const itemsWithStock = this.enrichItemsWithStockWarnings(
      sourceItems,
      stockMap,
    );
    const hasStockWarning = computeHasStockWarning(itemsWithStock);

    if (hasStockWarning && !isStockWarningConfirmed(options)) {
      throw buildStockWarningError(
        "Este orçamento tem itens sem estoque suficiente. Confirme para converter em pedido.",
        itemsWithStock,
      );
    }

    const sourceDiscount = parseFloat(order.discount) || 0;
    const calculated = await this.calculateItemsCommission(
      itemsWithStock,
      sourceDiscount,
      tenantId,
    );

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `
          UPDATE orders
          SET document_type = 'pedido', has_stock_warning = $1,
              stock_committed_at = NOW()
          WHERE id = $2 AND tenant_id = $3
        `,
        [hasStockWarning, id, tenantId],
      );
      await this.persistOrderItemsWithClient(
        client,
        id,
        calculated.items,
        tenantId,
      );
      const orderedStock = aggregateControlledStockQuantities(calculated.items);
      for (const [productId, quantity] of orderedStock) {
        const updatedStock = await orderRepository.decreaseProductStock(client, {
          productId,
          quantity,
          tenantId,
        });
        if (updatedStock.length === 0) {
          const err = new Error(
            `Produto #${productId} não encontrado ao baixar o estoque.`,
          );
          err.statusCode = 404;
          throw err;
        }
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return this.findById(id, tenantId);
  }

  async updateStatus(id, status, tenantId) {
    tenantId = requireTenantId(tenantId);
    if (!status) {
      throw new Error("Status é obrigatório");
    }
    if (status === "Entregue") {
      const err = new Error(
        "Use a finalização do pedido para marcar como Entregue.",
      );
      err.statusCode = 400;
      throw err;
    }

    const result = await sql`
      UPDATE orders
      SET status = ${status}
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;

    if (result.length === 0) {
      throw new Error("Pedido não encontrado");
    }

    return result[0];
  }

  async delete(id, tenantId) {
    tenantId = requireTenantId(tenantId);
    const current = await this.findById(id, tenantId);
    const currentDoc = current.document_type ?? current.documentType ?? null;
    const committedStock = currentDoc === "pedido" && current.stock_committed_at
      ? aggregateControlledStockQuantities(current.items || [])
      : new Map();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const [productId, quantity] of committedStock) {
        await orderRepository.increaseProductStock(client, {
          productId,
          quantity,
          tenantId,
        });
      }
      const result = await client.query(
        "DELETE FROM orders WHERE id = $1 AND tenant_id = $2 RETURNING id",
        [id, tenantId],
      );
      if (result.rows.length === 0) throw new Error("Pedido não encontrado");
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async finalize(id, tenantId) {
    tenantId = requireTenantId(tenantId);
    const current = await this.findById(id, tenantId);
    const currentDoc =
      current.document_type ?? current.documentType ?? null;
    if (currentDoc !== "pedido") {
      const err = new Error(
        "Converta o orçamento em pedido antes de finalizar a entrega.",
      );
      err.statusCode = 400;
      throw err;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const updated = await orderRepository.markOrderDelivered(client, id, tenantId);

      if (updated.length === 0) {
        const row = await orderRepository.getOrderStatusById(client, id, tenantId);
        if (!row) {
          throw new Error("Pedido não encontrado");
        }
        const err = new Error("Pedido já foi finalizado");
        err.statusCode = 409;
        throw err;
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return { message: "Pedido finalizado com sucesso" };
  }

  async getClientStats(clientId, authUser = null) {
    if (!clientId) {
      throw new Error("O ID do cliente é obrigatório");
    }

    const tenantId = tenantIdFromAuth(authUser);
    if (authUser && authUser.role === "salesperson") {
      const result = await sql`
        SELECT
        COUNT(id) AS "totalOrders",
        COALESCE(SUM(totalprice), 0) AS "totalSpent"
      FROM orders
      WHERE clientid = ${clientId} AND status = 'Entregue'
        AND tenant_id = ${tenantId}
        AND user_ref = ${authUser.userId}
    `;
      return result[0] || { totalOrders: 0, totalSpent: 0 };
    }

    const result = await sql`
      SELECT
        COUNT(id) AS "totalOrders",
        COALESCE(SUM(totalprice), 0) AS "totalSpent"
      FROM orders
      WHERE clientid = ${clientId} AND status = 'Entregue'
        AND tenant_id = ${tenantId}
    `;

    return result[0] || { totalOrders: 0, totalSpent: 0 };
  }
}

module.exports = new OrderService();
