// Declaração única para o sql no topo do arquivo.
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);
const productsController = require("./productController");

// Função getAll corrigida para usar nomes de colunas em minúsculas e query parametrizada.
exports.getAll = async (req, res) => {
  try {
    const { userId, clientId, userRole } = req.query;
    let query = "SELECT * FROM orders";
    const params = [];

    if (userRole === "admin") {
      if (clientId) {
        query += " WHERE clientid = $1";
        params.push(clientId);
      }
    } else if (userRole === "salesperson") {
      if (!userId) {
        return res
          .status(400)
          .json({
            error: "O ID do usuário é obrigatório para representantes.",
          });
      }
      query += " WHERE userid = $1";
      params.push(userId);
    } else if (clientId) {
      query += " WHERE clientid = $1";
      params.push(clientId);
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

// Função create corrigida e segura.
exports.create = async (req, res) => {
  const { clientId, userId, items, totalPrice, description, discount } =
    req.body;

  if (!clientId || !userId || items === undefined || totalPrice === undefined) {
    console.error("Erro: Dados incompletos recebidos.", req.body);
    return res.status(400).json({ error: "Dados incompletos." });
  }

  try {
    const itemsJson = JSON.stringify(items);
    const result = await sql(
      `INSERT INTO orders (clientid, userid, items, totalprice, description, discount, status, createdat)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, 'Em aberto', NOW())
       RETURNING *`,
      [
        clientId,
        userId,
        itemsJson,
        totalPrice,
        description || "",
        discount || 0,
      ]
    );
    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    console.error("Dados que causaram o erro:", req.body);
    res.status(500).json({ error: error.message || "Erro ao criar pedido." });
  }
};

// Função delete corrigida.
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

// Função finalize corrigida.
exports.finalize = async (req, res) => {
  try {
    const { id } = req.params;
    const orderResult = await sql("SELECT * FROM orders WHERE id = $1", [id]);
    const order = orderResult[0];

    if (!order) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    await sql(
      "UPDATE orders SET status = $1, finishedat = NOW() WHERE id = $2",
      ["Entregue", id]
    );

    const items = order.items;
    for (const item of items) {
      await productsController.updateStock(item.productId, item.quantity);
    }

    res.status(200).json({ message: "Pedido finalizado com sucesso." });
  } catch (error) {
    console.error("Erro ao finalizar pedido:", error);
    res.status(500).json({ error: "Erro ao finalizar pedido." });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { clientId, items, totalPrice, description, discount } = req.body;

  // Validação para garantir que os dados essenciais foram recebidos.
  if (
    clientId === undefined ||
    items === undefined ||
    totalPrice === undefined
  ) {
    return res
      .status(400)
      .json({
        error:
          "Dados incompletos. clientId, items e totalPrice são obrigatórios.",
      });
  }

  try {
    const itemsJson = JSON.stringify(items);
    const result = await sql(
      `
      UPDATE orders
      SET clientid = $1, items = $2::jsonb, totalprice = $3, description = $4, discount = $5
      WHERE id = $6
      RETURNING *
    `,
      [clientId, itemsJson, totalPrice, description || "", discount || 0, id]
    );

    if (result.length === 0) {
      return res
        .status(404)
        .json({ error: "Pedido não encontrado para atualizar." });
    }

    res.status(200).json(result[0]);
  } catch (error) {
    console.error("Erro ao atualizar pedido:", error);
    console.error("Dados que causaram o erro:", req.body);
    res.status(500).json({ error: "Erro ao atualizar pedido." });
  }
};

// Função getClientStats corrigida.
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
