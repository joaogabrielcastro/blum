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

  async calculateItemsCommission(items, discount = 0) {
    const rateMap = await this.loadCommissionRatesByBrandNames(
      items.map((i) => i.brand),
    );
    let subtotal = 0;

    const itemsWithCommission = items.map((item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity, 10) || 1;
      const itemTotal = price * quantity;
      subtotal += itemTotal;

      const commissionRate = rateMap.get(item.brand) ?? 0;
      const discountFactor = 1 - parseFloat(discount) / 100;
      const itemTotalAfterDiscount = itemTotal * discountFactor;
      const commissionAmount =
        (itemTotalAfterDiscount * commissionRate) / 100;

      return {
        ...item,
        price,
        quantity,
        commission_rate: commissionRate,
        commission_amount: parseFloat(commissionAmount.toFixed(2)),
      };
    });

    const discountAmount = subtotal * (parseFloat(discount) / 100);
    const finalTotal = subtotal - discountAmount;
    const totalCommission = itemsWithCommission.reduce(
      (total, item) => total + (item.commission_amount || 0),
      0,
    );

    return {
      items: itemsWithCommission,
      subtotal,
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
          commission_rate, commission_amount, line_total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      for (const it of calculatedItems) {
        const qty = parseInt(it.quantity, 10) || 1;
        const price = parseFloat(it.price) || 0;
        const lineTotal = qty * price;
        await client.query(insertSql, [
          orderId,
          it.productId != null ? it.productId : null,
          it.productName || "",
          it.brand || "",
          qty,
          price,
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
            (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS items_count
           FROM orders o
           LEFT JOIN users u ON u.id = o.user_ref
           WHERE o.clientid = $1
           ORDER BY o.createdat DESC`,
          [clientid],
        );
      } else {
        rows = await sql(
          `SELECT o.*, u.name AS seller_name, u.username AS seller_username,
            (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS items_count
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
            (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS items_count
          FROM orders o
          LEFT JOIN users u ON u.id = o.user_ref
          WHERE o.user_ref = ${uid} AND o.clientid = ${clientid}
          ORDER BY o.createdat DESC
        `;
        return rows.map(enrichOrder);
      }
      const rows = await sql`
        SELECT o.*, u.name AS seller_name, u.username AS seller_username,
          (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS items_count
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
      commission_rate: parseFloat(r.commission_rate) || 0,
      commission_amount: parseFloat(r.commission_amount) || 0,
    }));

    return enrichOrder(order);
  }

  async findBySeller(userId) {
    const rows = await sql`
      SELECT o.*, u.name AS seller_name, u.username AS seller_username
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_ref
      WHERE o.user_ref = ${userId}
      ORDER BY o.createdat DESC
    `;
    return rows.map(enrichOrder);
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
        (clientid, user_ref, description, discount, totalprice, total_commission, status, createdat)
      VALUES
        (${clientid}, ${sellerUserId}, ${description || ""},
         ${discount || 0}, ${calculated.finalTotal}, ${calculated.totalCommission},
         'Em aberto', NOW())
      RETURNING *
    `;

    await this.persistOrderItems(result[0].id, calculated.items);

    return this.findById(result[0].id);
  }

  async update(id, orderData, authUser) {
    const { clientid, description, items, discount } = orderData;

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
          total_commission = ${calculated.totalCommission}
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      throw new Error("Pedido não encontrado");
    }

    await this.persistOrderItems(id, calculated.items);

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
    await this.findById(id);

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
