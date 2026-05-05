const { sql, pool } = require("../config/database");
const orderRepository = require("../repositories/orderRepository");
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

class OrderService {
  async loadCommissionRatesByBrandNames(brandNames) {
    const unique = [...new Set((brandNames || []).filter(Boolean))];
    if (unique.length === 0) {
      return new Map();
    }
    const rows = await sql`
      SELECT name, commission_rate FROM brands WHERE name = ANY(${unique})
    `;
    const map = new Map();
    for (const r of rows) {
      map.set(r.name, parseFloat(r.commission_rate) || 0);
    }
    return map;
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

  async calculateItemsCommission(items, discount = 0) {
    const rateMap = await this.loadCommissionRatesByBrandNames(
      items.map((i) => i.brand),
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

  async persistOrderItemsWithClient(client, orderId, calculatedItems, tenantId = 1) {
    await client.query("DELETE FROM order_items WHERE order_id = $1", [orderId]);
    if (!calculatedItems?.length) {
      return;
    }
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

      values.push(
        orderId,
        it.productId != null ? it.productId : null,
        it.productName || "",
        it.brand || "",
        qty,
        price,
        lineDisc,
        it.commission_rate || 0,
        it.commission_amount || 0,
        lineTotal,
        tenantId,
      );

      placeholders.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10})`,
      );
      paramIndex += 11;
    }

    const insertSql = `
      INSERT INTO order_items (
        order_id, product_id, product_name, brand, quantity, unit_price,
        line_discount, commission_rate, commission_amount, line_total, tenant_id
      ) VALUES ${placeholders.join(", ")}
    `;

    await client.query(insertSql, values);
  }

  async persistOrderItems(orderId, calculatedItems, tenantId = 1) {
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

    const { role, userId, tenantId = 1 } = authUser;

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

  async findById(id, tenantId = 1) {
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
        SELECT oi.*, p.productcode, p.subcode
        FROM order_items oi
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ${id} AND oi.tenant_id = ${tenantId}
        ORDER BY oi.id
      `;

    order.items = mapOrderItemsWithProducts(lines);

    order.representadas = representadasFromItems(order.items);

    return enrichOrder(order);
  }

  async findBySeller(userId, tenantId = 1) {
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
    const tenantId = authUser.tenantId || 1;
    const createdAt = parseCreatedAt(
      orderData.createdat ?? orderData.createdAt,
    );

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

    for (const item of items) {
      if (item.productId) {
        const product =
          await sql`SELECT stock, name FROM products WHERE id = ${item.productId} AND tenant_id = ${tenantId}`;

        if (product.length === 0) {
          throw new Error(
            `Produto "${item.productName || item.productId}" não encontrado`,
          );
        }

        const availableStock = product[0].stock;
        const requestedQuantity = parseQuantityValue(item.quantity, {
          brand: item.brand,
          defaultValue: 0,
        });
        const shouldCheckStock = controlsStockByBrand(item.brand);

        if (shouldCheckStock && requestedQuantity > availableStock) {
          throw new Error(
            `Estoque insuficiente para "${product[0].name}". ` +
              `Disponível: ${availableStock}, Solicitado: ${requestedQuantity}`,
          );
        }
      }
    }

    const calculated = await this.calculateItemsCommission(items, discount);

    const sellerRow =
      await sql`SELECT id FROM users WHERE id = ${sellerUserId} AND tenant_id = ${tenantId}`;
    if (sellerRow.length === 0) {
      throw new Error("Vendedor não encontrado");
    }

    const result = await sql`
      INSERT INTO orders
        (clientid, user_ref, tenant_id, description, discount, totalprice, total_commission, status, createdat, document_type, payment_method)
      VALUES
        (${clientid}, ${sellerUserId}, ${tenantId}, ${description || ""},
         ${discount || 0}, ${calculated.finalTotal}, ${calculated.totalCommission},
         'Em aberto', COALESCE(${createdAt}, NOW()), ${docType}, ${payment})
      RETURNING *
    `;

    await this.persistOrderItems(result[0].id, calculated.items, tenantId);

    return this.findById(result[0].id);
  }

  async update(id, orderData, authUser) {
    const tenantId = authUser.tenantId || 1;
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
    const isDeliveredPedido =
      existing.status === "Entregue" && existingDoc === "pedido";
    const previousControlledStock = aggregateControlledStockQuantities(
      existing.items || [],
    );

    if (!clientid || !items || !Array.isArray(items)) {
      throw new Error(
        "Dados incompletos. clientid e items (array) são obrigatórios",
      );
    }

    for (const item of items) {
      if (item.productId) {
        const product =
          await sql`SELECT stock, name FROM products WHERE id = ${item.productId} AND tenant_id = ${tenantId}`;

        if (product.length === 0) {
          throw new Error(
            `Produto "${item.productName || item.productId}" não encontrado`,
          );
        }

        const availableStock = product[0].stock;
        const requestedQuantity = parseQuantityValue(item.quantity, {
          brand: item.brand,
          defaultValue: 0,
        });
        const shouldCheckStock = controlsStockByBrand(item.brand);
        const previousQuantity = isDeliveredPedido
          ? previousControlledStock.get(String(item.productId)) || 0
          : 0;
        const effectiveAvailable = availableStock + previousQuantity;

        if (shouldCheckStock && requestedQuantity > effectiveAvailable) {
          throw new Error(
            `Estoque insuficiente para "${product[0].name}". ` +
              `Disponível: ${effectiveAvailable}, Solicitado: ${requestedQuantity}`,
          );
        }
      }
    }

    const calculated = await this.calculateItemsCommission(items, discount);

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

      if (isDeliveredPedido) {
        const nextControlledStock = aggregateControlledStockQuantities(
          calculated.items || [],
        );
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
                `Estoque insuficiente ao ajustar o pedido entregue para o produto #${productId}.`,
              );
              err.statusCode = 409;
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

    return this.findById(id);
  }

  async updatePaymentMethod(id, paymentMethod, tenantId = 1) {
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

  async duplicate(id, tenantId = 1) {
    const source = await this.findById(id, tenantId);
    const sourceItems = Array.isArray(source.items) ? source.items : [];
    if (sourceItems.length === 0) {
      throw new Error("Não é possível duplicar um pedido sem itens.");
    }
    const sourceDiscount = parseFloat(source.discount) || 0;
    const calculated = await this.calculateItemsCommission(
      sourceItems,
      sourceDiscount,
    );
    const inserted = await sql`
      INSERT INTO orders
        (clientid, user_ref, tenant_id, description, discount, totalprice, total_commission, status, createdat, document_type, payment_method)
      VALUES
        (${source.clientid}, ${source.user_ref}, ${tenantId}, ${source.description || ""},
         ${sourceDiscount}, ${calculated.finalTotal}, ${calculated.totalCommission},
         'Em aberto', NOW(), 'orcamento', null)
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
    const tenantId = authUser?.tenantId || 1;
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

  async convertToPedido(id, tenantId = 1) {
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
    await sql`
      UPDATE orders SET document_type = 'pedido' WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    return this.findById(id, tenantId);
  }

  async updateStatus(id, status, tenantId = 1) {
    if (!status) {
      throw new Error("Status é obrigatório");
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

  async delete(id, tenantId = 1) {
    const result = await sql`DELETE FROM orders WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING *`;

    if (result.length === 0) {
      throw new Error("Pedido não encontrado");
    }
  }

  async finalize(id, tenantId = 1) {
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

      const lines = await orderRepository.getOrderLinesForStock(client, id, tenantId);
      const itemsArray = lines.map((r) => ({
        productId: r.product_id,
        quantity: r.quantity,
        brand: r.brand,
      }));

      for (const item of itemsArray) {
        if (
          item.productId &&
          item.quantity &&
          controlsStockByBrand(item.brand)
        ) {
          const updatedStock = await orderRepository.decreaseProductStock(
            client,
            {
              productId: item.productId,
              quantity: item.quantity,
              tenantId,
            },
          );
          if (updatedStock.length === 0) {
            const err = new Error(
              `Estoque insuficiente ao finalizar pedido para o produto #${item.productId}.`,
            );
            err.statusCode = 409;
            throw err;
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

    return { message: "Pedido finalizado com sucesso" };
  }

  async getClientStats(clientId, authUser = null) {
    if (!clientId) {
      throw new Error("O ID do cliente é obrigatório");
    }

    const tenantId = authUser?.tenantId || 1;
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
