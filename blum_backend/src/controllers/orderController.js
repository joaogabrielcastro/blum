const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);
const productsController = require("./productController");

exports.getAll = async (req, res) => {
  try {
    // Agora desestruturamos userId E clientId
    const { userId, clientId } = req.query;
    let orders;
    if (userId) {
      orders =
        await sql`SELECT * FROM orders WHERE "userId" = ${userId} ORDER BY "createdAt" DESC`;
    } else if (clientId) {
      // Nova condição para filtrar por cliente
      orders =
        await sql`SELECT * FROM orders WHERE "clientId" = ${clientId} ORDER BY "createdAt" DESC`;
    } else {
      orders = await sql`SELECT * FROM orders ORDER BY "createdAt" DESC`;
    }
    res.status(200).json(orders);
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error);
    res.status(500).json({ error: "Erro ao buscar pedidos." });
  }
};

exports.create = async (req, res) => {
  try {
    const { clientId, userId, items, totalPrice, description } = req.body;

    const result = await sql`
      INSERT INTO orders ("clientId", "userId", items, "totalPrice", description, status, "createdAt")
      VALUES (
        ${clientId},
        ${userId},
        ${JSON.stringify(items)}::jsonb,
        ${totalPrice},
        ${description || ""},
        'Em aberto',
        NOW()
      )
      RETURNING *;
    `;

    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    res.status(500).json({ error: error.message || "Erro ao criar pedido." });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await sql`DELETE FROM orders WHERE id = ${id}`;
    res.status(204).end();
  } catch (error) {
    console.error("Erro ao excluir pedido:", error);
    res.status(500).json({ error: "Erro ao excluir pedido." });
  }
};

exports.finalize = async (req, res) => {
  try {
    const { id } = req.params;
    const order = (await sql`SELECT * FROM orders WHERE id = ${id}`)[0];

    if (!order) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    await sql`
      UPDATE orders
      SET status = 'Entregue', "finishedAt" = NOW()
      WHERE id = ${id};
    `;

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
  try {
    const { id } = req.params;
    const { clientId, items, totalPrice, description, discount } = req.body;

    await sql`
      UPDATE orders
      SET "clientId" = ${clientId},
          items = ${JSON.stringify(items)}::JSONB,
          "totalPrice" = ${totalPrice},
          description = ${description},
          discount = ${discount}
      WHERE id = ${id};
    `;

    res.status(200).json({ message: "Pedido atualizado com sucesso." });
  } catch (error) {
    console.error("Erro ao atualizar pedido:", error);
    res.status(500).json({ error: "Erro ao atualizar pedido." });
  }
};

exports.getClientStats = async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({ error: "O ID do cliente é obrigatório." });
    }

    const result = await sql`
      SELECT
        COUNT(id) AS "totalOrders",
        COALESCE(SUM("totalPrice"), 0) AS "totalSpent"
      FROM orders
      WHERE "clientId" = ${clientId} AND status = 'Entregue';
    `;

    const stats = result[0] || { totalOrders: 0, totalSpent: 0 };

    res.status(200).json(stats);
  } catch (error) {
    console.error("Erro ao buscar estatísticas do cliente:", error);
    res.status(500).json({ error: "Erro ao buscar estatísticas do cliente." });
  }
};

module.exports = exports;
