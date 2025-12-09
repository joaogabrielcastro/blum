const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

class OrderService {
  /**
   * Busca taxa de comissão da marca
   * @param {string} brandName - Nome da marca
   * @returns {Promise<number>} Taxa de comissão
   */
  async getBrandCommissionRate(brandName) {
    if (!brandName) return 0;

    try {
      const result = await sql`
        SELECT commission_rate FROM brands WHERE name = ${brandName}
      `;
      return result[0]?.commission_rate || 0;
    } catch (error) {
      console.error("Erro ao buscar comissão da marca:", error);
      return 0;
    }
  }

  /**
   * Calcula comissões dos itens considerando desconto
   * @param {Array} items - Lista de itens
   * @param {number} discount - Desconto em porcentagem
   * @returns {Promise<Object>} Itens com comissão e totais
   */
  async calculateItemsCommission(items, discount = 0) {
    let subtotal = 0;

    const itemsWithCommission = await Promise.all(
      items.map(async (item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        const itemTotal = price * quantity;
        subtotal += itemTotal;

        // Buscar taxa de comissão da marca
        const commissionRate = await this.getBrandCommissionRate(item.brand);

        // Aplicar desconto proporcional no cálculo da comissão
        const discountFactor = 1 - parseFloat(discount) / 100;
        const itemTotalAfterDiscount = itemTotal * discountFactor;
        const commissionAmount =
          (itemTotalAfterDiscount * commissionRate) / 100;

        return {
          ...item,
          price: price,
          quantity: quantity,
          commission_rate: commissionRate,
          commission_amount: parseFloat(commissionAmount.toFixed(2)),
        };
      })
    );

    const discountAmount = subtotal * (parseFloat(discount) / 100);
    const finalTotal = subtotal - discountAmount;
    const totalCommission = itemsWithCommission.reduce(
      (total, item) => total + (item.commission_amount || 0),
      0
    );

    return {
      items: itemsWithCommission,
      subtotal,
      discountAmount,
      finalTotal,
      totalCommission,
    };
  }

  /**
   * Busca todos os pedidos com filtros
   * @param {Object} filters - Filtros (userId, clientid, userRole)
   * @returns {Promise<Array>} Lista de pedidos
   */
  async findAll(filters = {}) {
    const { userId, clientid, userRole } = filters;
    let query = "SELECT * FROM orders";
    const params = [];

    if (userRole === "admin") {
      if (clientid) {
        query += " WHERE clientid = $1";
        params.push(clientid);
      }
    } else if (userRole === "salesperson") {
      if (!userId) {
        throw new Error("O ID do usuário é obrigatório para representantes");
      }
      query += " WHERE userid = $1";
      params.push(userId);
    } else if (clientid) {
      query += " WHERE clientid = $1";
      params.push(clientid);
    } else {
      return [];
    }

    query += " ORDER BY createdat DESC";
    return await sql(query, params);
  }

  /**
   * Busca pedido por ID
   * @param {number} id - ID do pedido
   * @returns {Promise<Object>} Pedido encontrado
   */
  async findById(id) {
    const result = await sql`SELECT * FROM orders WHERE id = ${id}`;

    if (result.length === 0) {
      throw new Error("Pedido não encontrado");
    }

    return result[0];
  }

  /**
   * Busca pedidos por vendedor
   * @param {number} userId - ID do usuário/vendedor
   * @returns {Promise<Array>} Lista de pedidos
   */
  async findBySeller(userId) {
    return await sql`
      SELECT * FROM orders 
      WHERE userid = ${userId} 
      ORDER BY createdat DESC
    `;
  }

  /**
   * Cria um novo pedido
   * @param {Object} orderData - Dados do pedido
   * @returns {Promise<Object>} Pedido criado
   */
  async create(orderData) {
    const { clientid, userid, description, items, discount } = orderData;

    // Validação
    if (
      !clientid ||
      !userid ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      throw new Error(
        "Dados incompletos. clientid, userid e items (array) são obrigatórios"
      );
    }

    // Verificar estoque de todos os produtos
    for (const item of items) {
      if (item.productId) {
        const product =
          await sql`SELECT stock, name FROM products WHERE id = ${item.productId}`;

        if (product.length === 0) {
          throw new Error(
            `Produto "${item.productName || item.productId}" não encontrado`
          );
        }

        const availableStock = product[0].stock;
        const requestedQuantity = parseInt(item.quantity) || 0;

        if (requestedQuantity > availableStock) {
          throw new Error(
            `Estoque insuficiente para "${product[0].name}". ` +
              `Disponível: ${availableStock}, Solicitado: ${requestedQuantity}`
          );
        }
      }
    }

    // Calcular comissões e totais
    const calculated = await this.calculateItemsCommission(items, discount);

    const result = await sql`
      INSERT INTO orders 
        (clientid, userid, description, items, discount, totalprice, total_commission, status, createdat)
      VALUES 
        (${clientid}, ${userid}, ${description || ""}, 
         ${JSON.stringify(calculated.items)}, 
         ${discount || 0}, ${calculated.finalTotal}, ${
      calculated.totalCommission
    }, 
         'Em aberto', NOW())
      RETURNING *
    `;

    return result[0];
  }

  /**
   * Atualiza um pedido
   * @param {number} id - ID do pedido
   * @param {Object} orderData - Dados atualizados
   * @returns {Promise<Object>} Pedido atualizado
   */
  async update(id, orderData) {
    const { clientid, userid, description, items, discount } = orderData;

    if (!clientid || !userid || !items || !Array.isArray(items)) {
      throw new Error(
        "Dados incompletos. clientid, userid e items (array) são obrigatórios"
      );
    }

    // Verificar estoque de todos os produtos
    for (const item of items) {
      if (item.productId) {
        const product =
          await sql`SELECT stock, name FROM products WHERE id = ${item.productId}`;

        if (product.length === 0) {
          throw new Error(
            `Produto "${item.productName || item.productId}" não encontrado`
          );
        }

        const availableStock = product[0].stock;
        const requestedQuantity = parseInt(item.quantity) || 0;

        if (requestedQuantity > availableStock) {
          throw new Error(
            `Estoque insuficiente para "${product[0].name}". ` +
              `Disponível: ${availableStock}, Solicitado: ${requestedQuantity}`
          );
        }
      }
    }

    // Recalcular comissões e totais
    const calculated = await this.calculateItemsCommission(items, discount);

    const result = await sql`
      UPDATE orders 
      SET clientid = ${clientid},
          userid = ${userid},
          description = ${description || ""},
          items = ${JSON.stringify(calculated.items)},
          discount = ${discount || 0},
          totalprice = ${calculated.finalTotal},
          total_commission = ${calculated.totalCommission}
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      throw new Error("Pedido não encontrado");
    }

    return result[0];
  }

  /**
   * Atualiza status do pedido
   * @param {number} id - ID do pedido
   * @param {string} status - Novo status
   * @returns {Promise<Object>} Pedido atualizado
   */
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

  /**
   * Deleta um pedido
   * @param {number} id - ID do pedido
   * @returns {Promise<void>}
   */
  async delete(id) {
    const result = await sql`DELETE FROM orders WHERE id = ${id} RETURNING *`;

    if (result.length === 0) {
      throw new Error("Pedido não encontrado");
    }
  }

  /**
   * Finaliza um pedido e atualiza estoque
   * @param {number} id - ID do pedido
   * @returns {Promise<Object>} Pedido finalizado
   */
  async finalize(id) {
    const order = await this.findById(id);

    // Atualiza status
    await sql`
      UPDATE orders 
      SET status = 'Entregue', finishedat = NOW() 
      WHERE id = ${id}
    `;

    // Atualiza estoque dos produtos
    let itemsArray = [];

    if (Array.isArray(order.items)) {
      itemsArray = order.items;
    } else if (typeof order.items === "string") {
      try {
        itemsArray = JSON.parse(order.items);
      } catch (parseError) {
        console.error("Erro ao fazer parse dos items:", parseError);
      }
    }

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

  /**
   * Busca estatísticas do cliente
   * @param {number} clientId - ID do cliente
   * @returns {Promise<Object>} Estatísticas
   */
  async getClientStats(clientId) {
    if (!clientId) {
      throw new Error("O ID do cliente é obrigatório");
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
