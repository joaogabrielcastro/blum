const { sql, pool } = require("../config/database");

function enrichOrder(row) {
  if (!row) return row;
  const uid = row.user_ref != null ? String(row.user_ref) : null;
  return {
    ...row,
    userid: uid,
    userId: row.user_ref,
  };
}

/** DISTINCT representadas das linhas (detalhe do pedido). */
function representadasFromItems(items) {
  const set = new Set();
  for (const it of items || []) {
    const b = String(it.brand ?? "").trim();
    if (b) set.add(b);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR")).join(", ");
}

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
      const quantity = parseInt(item.quantity, 10) || 1;
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

  async persistOrderItems(orderId, calculatedItems) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM order_items WHERE order_id = $1", [
        orderId,
      ]);
      if (!calculatedItems?.length) {
        await client.query("COMMIT");
        return;
      }
      const insertSql = `
        INSERT INTO order_items (
          order_id, product_id, product_name, brand, quantity, unit_price,
          line_discount, commission_rate, commission_amount, line_total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      for (const it of calculatedItems) {
        const qty = parseInt(it.quantity, 10) || 1;
        const price = parseFloat(it.price) || 0;
        const lineDisc = parseFloat(it.line_discount) || 0;
        const lineFactor = 1 - Math.min(100, Math.max(0, lineDisc)) / 100;
        const lineTotal = qty * price * lineFactor;
        await client.query(insertSql, [
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
        ]);
      }
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

    if (role === "admin") {
      let rows;
      if (clientid) {
        rows = await sql(
          `SELECT o.*, u.name AS seller_name, u.username AS seller_username,
            (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS items_count,
            ${REPRESENTADAS_SQL}
           FROM orders o
           LEFT JOIN users u ON u.id = o.user_ref
           WHERE o.clientid = $1
           ORDER BY o.createdat DESC`,
          [clientid],
        );
      } else {
        rows = await sql(
          `SELECT o.*, u.name AS seller_name, u.username AS seller_username,
            (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS items_count,
            ${REPRESENTADAS_SQL}
           FROM orders o
           LEFT JOIN users u ON u.id = o.user_ref
           ORDER BY o.createdat DESC`,
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
          WHERE o.user_ref = ${uid} AND o.clientid = ${clientid}
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
        WHERE o.user_ref = ${uid}
        ORDER BY o.createdat DESC
      `;
      return rows.map(enrichOrder);
    }

    return [];
  }

  async findById(id) {
    const result = await sql`
      SELECT o.*, u.name AS seller_name, u.username AS seller_username
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_ref
      WHERE o.id = ${id}
    `;

    if (result.length === 0) {
      throw new Error("Pedido não encontrado");
    }

    const order = result[0];
    const lines =
      await sql`SELECT * FROM order_items WHERE order_id = ${id} ORDER BY id`;

    order.items = lines.map((r) => ({
      productId: r.product_id,
      productName: r.product_name,
      brand: r.brand,
      quantity: r.quantity,
      price: parseFloat(r.unit_price),
      lineDiscount: parseFloat(r.line_discount) || 0,
      commission_rate: parseFloat(r.commission_rate) || 0,
      commission_amount: parseFloat(r.commission_amount) || 0,
    }));

    order.representadas = representadasFromItems(order.items);

    return enrichOrder(order);
  }

  async findBySeller(userId) {
    const rows = await sql`
      SELECT o.*, u.name AS seller_name, u.username AS seller_username,
        (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS items_count,
        ${REPRESENTADAS_FRAGMENT}
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_ref
      WHERE o.user_ref = ${userId}
      ORDER BY o.createdat DESC
    `;
    return rows.map(enrichOrder);
  }

  normalizeDocumentAndPayment(orderData, existing = null) {
    let docType;
    if (orderData.document_type != null) {
      docType = orderData.document_type === "pedido" ? "pedido" : "orcamento";
    } else if (existing != null && existing.document_type != null) {
      docType = existing.document_type === "pedido" ? "pedido" : "orcamento";
    } else {
      docType = "orcamento";
    }
    let payment =
      orderData.payment_method !== undefined
        ? orderData.payment_method || null
        : existing?.payment_method ?? null;
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
    const raw =
      authUser.role === "admin" && orderData.userid != null
        ? orderData.userid
        : authUser.userId;
    const sellerId = parseInt(String(raw), 10);
    if (!Number.isFinite(sellerId) || sellerId < 1) {
      throw new Error("ID do vendedor inválido");
    }
    return sellerId;
  }

  async create(orderData, authUser) {
    const { clientid, description, items, discount } = orderData;
    const { docType, payment } = this.normalizeDocumentAndPayment(orderData);
    this.enforceDiscountRules(discount, payment);

    const sellerUserId = this.resolveSellerUserId(orderData, authUser);

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
          await sql`SELECT stock, name FROM products WHERE id = ${item.productId}`;

        if (product.length === 0) {
          throw new Error(
            `Produto "${item.productName || item.productId}" não encontrado`,
          );
        }

        const availableStock = product[0].stock;
        const requestedQuantity = parseInt(item.quantity) || 0;

        if (requestedQuantity > availableStock) {
          throw new Error(
            `Estoque insuficiente para "${product[0].name}". ` +
              `Disponível: ${availableStock}, Solicitado: ${requestedQuantity}`,
          );
        }
      }
    }

    const calculated = await this.calculateItemsCommission(items, discount);

    const sellerRow =
      await sql`SELECT id FROM users WHERE id = ${sellerUserId}`;
    if (sellerRow.length === 0) {
      throw new Error("Vendedor não encontrado");
    }

    const result = await sql`
      INSERT INTO orders
        (clientid, user_ref, description, discount, totalprice, total_commission, status, createdat, document_type, payment_method)
      VALUES
        (${clientid}, ${sellerUserId}, ${description || ""},
         ${discount || 0}, ${calculated.finalTotal}, ${calculated.totalCommission},
         'Em aberto', NOW(), ${docType}, ${payment})
      RETURNING *
    `;

    await this.persistOrderItems(result[0].id, calculated.items);

    return this.findById(result[0].id);
  }

  async update(id, orderData, authUser) {
    const existing = await this.findById(id);
    const { clientid, description, items, discount } = orderData;
    const { docType, payment } = this.normalizeDocumentAndPayment(
      orderData,
      existing,
    );
    this.enforceDiscountRules(discount, payment);

    const sellerUserId = this.resolveSellerUserId(orderData, authUser);

    if (!clientid || !items || !Array.isArray(items)) {
      throw new Error(
        "Dados incompletos. clientid e items (array) são obrigatórios",
      );
    }

    for (const item of items) {
      if (item.productId) {
        const product =
          await sql`SELECT stock, name FROM products WHERE id = ${item.productId}`;

        if (product.length === 0) {
          throw new Error(
            `Produto "${item.productName || item.productId}" não encontrado`,
          );
        }

        const availableStock = product[0].stock;
        const requestedQuantity = parseInt(item.quantity) || 0;

        if (requestedQuantity > availableStock) {
          throw new Error(
            `Estoque insuficiente para "${product[0].name}". ` +
              `Disponível: ${availableStock}, Solicitado: ${requestedQuantity}`,
          );
        }
      }
    }

    const calculated = await this.calculateItemsCommission(items, discount);

    const sellerRow =
      await sql`SELECT id FROM users WHERE id = ${sellerUserId}`;
    if (sellerRow.length === 0) {
      throw new Error("Vendedor não encontrado");
    }

    const result = await sql`
      UPDATE orders
      SET clientid = ${clientid},
          user_ref = ${sellerUserId},
          description = ${description || ""},
          discount = ${discount || 0},
          totalprice = ${calculated.finalTotal},
          total_commission = ${calculated.totalCommission},
          document_type = ${docType},
          payment_method = ${payment}
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      throw new Error("Pedido não encontrado");
    }

    await this.persistOrderItems(id, calculated.items);

    return this.findById(id);
  }

  async updatePaymentMethod(id, paymentMethod) {
    if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
      const err = new Error("Forma de pagamento inválida.");
      err.statusCode = 400;
      throw err;
    }
    const current = await this.findById(id);
    if (current.document_type !== "pedido") {
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
      WHERE id = ${id}
    `;
    return this.findById(id);
  }

  async duplicate(id) {
    const source = await this.findById(id);
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
        (clientid, user_ref, description, discount, totalprice, total_commission, status, createdat, document_type, payment_method)
      VALUES
        (${source.clientid}, ${source.user_ref}, ${source.description || ""},
         ${sourceDiscount}, ${calculated.finalTotal}, ${calculated.totalCommission},
         'Em aberto', NOW(), 'orcamento', null)
      RETURNING id
    `;
    const newId = inserted[0].id;
    await this.persistOrderItems(newId, calculated.items);
    return this.findById(newId);
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
        AND oi.product_id = ${productId}
        AND o.document_type = 'pedido'
      ORDER BY o.createdat DESC
      LIMIT ${safeLimit}
    `;
  }

  async convertToPedido(id) {
    const order = await this.findById(id);
    if (order.document_type !== "orcamento") {
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
      UPDATE orders SET document_type = 'pedido' WHERE id = ${id}
    `;
    return this.findById(id);
  }

  async updateStatus(id, status) {
    if (!status) {
      throw new Error("Status é obrigatório");
    }

    const result = await sql`
      UPDATE orders
      SET status = ${status}
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      throw new Error("Pedido não encontrado");
    }

    return result[0];
  }

  async delete(id) {
    const result = await sql`DELETE FROM orders WHERE id = ${id} RETURNING *`;

    if (result.length === 0) {
      throw new Error("Pedido não encontrado");
    }
  }

  async finalize(id) {
    const current = await this.findById(id);
    if (current.document_type !== "pedido") {
      const err = new Error(
        "Converta o orçamento em pedido antes de finalizar a entrega.",
      );
      err.statusCode = 400;
      throw err;
    }

    const updated = await sql`
      UPDATE orders
      SET status = 'Entregue', finishedat = COALESCE(finishedat, NOW())
      WHERE id = ${id}
        AND (status IS DISTINCT FROM 'Entregue')
      RETURNING id
    `;

    if (updated.length === 0) {
      const row = await sql`SELECT id, status FROM orders WHERE id = ${id}`;
      if (row.length === 0) {
        throw new Error("Pedido não encontrado");
      }
      const err = new Error("Pedido já foi finalizado");
      err.statusCode = 409;
      throw err;
    }

    const lines =
      await sql`SELECT product_id, quantity FROM order_items WHERE order_id = ${id}`;
    const itemsArray = lines.map((r) => ({
      productId: r.product_id,
      quantity: r.quantity,
    }));

    for (const item of itemsArray) {
      if (item.productId && item.quantity) {
        await sql`
          UPDATE products
          SET stock = stock - ${item.quantity}
          WHERE id = ${item.productId}
        `;
      }
    }

    return { message: "Pedido finalizado com sucesso" };
  }

  async getClientStats(clientId, authUser = null) {
    if (!clientId) {
      throw new Error("O ID do cliente é obrigatório");
    }

    if (authUser && authUser.role === "salesperson") {
      const result = await sql`
        SELECT
        COUNT(id) AS "totalOrders",
        COALESCE(SUM(totalprice), 0) AS "totalSpent"
      FROM orders
      WHERE clientid = ${clientId} AND status = 'Entregue'
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
    `;

    return result[0] || { totalOrders: 0, totalSpent: 0 };
  }
}

module.exports = new OrderService();
