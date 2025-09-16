const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

// Função utilitária para atualizar estoque (evita importação cíclica)
const updateProductStock = async (productId, quantity) => {
  try {
    await sql`
      UPDATE products 
      SET stock = stock - ${quantity} 
      WHERE id = ${productId}
    `;
  } catch (error) {
    console.error("Erro ao atualizar estoque:", error);
    throw error;
  }
};

// Função para buscar taxa de comissão
const getBrandCommissionRate = async (brandName) => {
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
};

// GET ALL - Buscar todos os pedidos
exports.getAll = async (req, res) => {
  try {
    const { userId, clientid, userRole } = req.query;
    let query = "SELECT * FROM orders";
    const params = [];

    if (userRole === "admin") {
      if (clientid) {
        query += " WHERE clientid = $1";
        params.push(clientid);
      }
    } else if (userRole === "salesperson") {
      if (!userId) {
        return res.status(400).json({
          error: "O ID do usuário é obrigatório para representantes.",
        });
      }
      query += " WHERE userid = $1";
      params.push(userId);
    } else if (clientid) {
      query += " WHERE clientid = $1";
      params.push(clientid);
    } else {
      return res.status(200).json([]);
    }

    query += " ORDER BY createdat DESC";
    const orders = await sql(query, params);
    res.status(200).json(orders);
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error);
    res.status(500).json({ error: "Erro ao buscar pedidos." });
  }
};

// CREATE - Criar um novo pedido
exports.create = async (req, res) => {
  try {
    const { clientid, userid, description, items, discount, totalprice } =
      req.body;

    // Validação completa
    if (
      !clientid ||
      !userid ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        error:
          "Dados incompletos. clientid, userid e items (array) são obrigatórios.",
      });
    }

    // Calcular comissões
    const itemsWithCommission = await Promise.all(
      items.map(async (item) => {
        const commissionRate = await getBrandCommissionRate(item.brand);
        const itemTotal = parseFloat(item.price) * parseInt(item.quantity);
        const commissionAmount = (itemTotal * commissionRate) / 100;

        return {
          ...item,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
        };
      })
    );

    const totalCommission = itemsWithCommission.reduce(
      (total, item) => total + (item.commission_amount || 0),
      0
    );

    const result = await sql`
      INSERT INTO orders 
        (clientid, userid, description, items, discount, totalprice, total_commission, status, createdat)
      VALUES 
        (${clientid}, ${userid}, ${description || ""}, 
         ${JSON.stringify(itemsWithCommission)}, 
         ${discount || 0}, ${totalprice}, ${totalCommission}, 
         'Em aberto', NOW())
      RETURNING *
    `;

    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    res.status(500).json({ error: "Erro ao criar pedido." });
  }
};

// DELETE - Excluir um pedido
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await sql("DELETE FROM orders WHERE id = $1", [id]);
    res.status(204).end();
  } catch (error) {
    console.error("Erro ao excluir pedido:", error);
    res.status(500).json({ error: "Erro ao excluir pedido." });
  }
};

// FINALIZE - Finalizar um pedido
exports.finalize = async (req, res) => {
  try {
    const { id } = req.params;
    const orderResult = await sql("SELECT * FROM orders WHERE id = $1", [id]);
    const order = orderResult[0];

    if (!order) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    // Atualiza status
    await sql(
      "UPDATE orders SET status = $1, finishedat = NOW() WHERE id = $2",
      ["Entregue", id]
    );

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
        await updateProductStock(item.productId, item.quantity);
      }
    }

    res.status(200).json({ message: "Pedido finalizado com sucesso." });
  } catch (error) {
    console.error("Erro ao finalizar pedido:", error);
    res.status(500).json({ error: "Erro ao finalizar pedido." });
  }
};

// UPDATE - Atualizar um pedido
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { clientid, userid, description, items, discount, totalprice } =
      req.body;

    if (!clientid || !userid || !items || !Array.isArray(items)) {
      return res.status(400).json({
        error:
          "Dados incompletos. clientid, userid e items (array) são obrigatórios.",
      });
    }

    // Recalcular comissões
    const itemsWithCommission = await Promise.all(
      items.map(async (item) => {
        const commissionRate = await getBrandCommissionRate(item.brand);
        const itemTotal = parseFloat(item.price) * parseInt(item.quantity);
        const commissionAmount = (itemTotal * commissionRate) / 100;

        return {
          ...item,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
        };
      })
    );

    const totalCommission = itemsWithCommission.reduce(
      (total, item) => total + (item.commission_amount || 0),
      0
    );

    const result = await sql`
      UPDATE orders 
      SET clientid = ${clientid},
          userid = ${userid},
          description = ${description || ""},
          items = ${JSON.stringify(itemsWithCommission)},
          discount = ${discount || 0},
          totalprice = ${totalprice},
          total_commission = ${totalCommission}
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    res.status(200).json(result[0]);
  } catch (error) {
    console.error("Erro ao atualizar pedido:", error);
    res.status(500).json({ error: "Erro ao atualizar pedido." });
  }
};

// GET CLIENT STATS - Estatísticas do cliente
exports.getClientStats = async (req, res) => {
  try {
    const { clientId } = req.params;
    if (!clientId) {
      return res.status(400).json({ error: "O ID do cliente é obrigatório." });
    }

    const result = await sql(
      `SELECT COUNT(id) AS "totalOrders", COALESCE(SUM(totalprice), 0) AS "totalSpent"
       FROM orders
       WHERE clientid = $1 AND status = 'Entregue'`,
      [clientId]
    );

    const stats = result[0] || { totalOrders: 0, totalSpent: 0 };
    res.status(200).json(stats);
  } catch (error) {
    console.error("Erro ao buscar estatísticas do cliente:", error);
    res.status(500).json({ error: "Erro ao buscar estatísticas do cliente." });
  }
};

// GET ORDERS BY SELLER - Pedidos por vendedor
exports.getOrdersBySeller = async (req, res) => {
  try {
    const { userId } = req.params;

    const orders = await sql(
      "SELECT * FROM orders WHERE userid = $1 ORDER BY createdat DESC",
      [userId]
    );

    res.status(200).json(orders);
  } catch (error) {
    console.error("Erro ao buscar pedidos do vendedor:", error);
    res.status(500).json({ error: "Erro ao buscar pedidos do vendedor." });
  }
};

// UPDATE STATUS - Atualizar status do pedido
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status é obrigatório." });
    }

    const result = await sql(
      "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    res.status(200).json(result[0]);
  } catch (error) {
    console.error("Erro ao atualizar status do pedido:", error);
    res.status(500).json({ error: "Erro ao atualizar status do pedido." });
  }
};

// GET BY ID - Buscar pedido por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await sql("SELECT * FROM orders WHERE id = $1", [id]);

    if (result.length === 0) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    res.status(200).json(result[0]);
  } catch (error) {
    console.error("Erro ao buscar pedido:", error);
    res.status(500).json({ error: "Erro ao buscar pedido." });
  }
};
