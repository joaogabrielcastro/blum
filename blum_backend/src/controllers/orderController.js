const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);
const productsController = require("../controllers/productController");

exports.getAll = async (req, res) => {
  try {
    const { userId } = req.query;
    let orders;
    if (userId) {
      orders =
        await sql`SELECT * FROM orders WHERE "userId" = ${userId} ORDER BY "createdAt" DESC`;
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
      INSERT INTO orders ("clientId", "userId", items, "totalPrice", description)
      VALUES (${clientId}, ${userId}, ${JSON.stringify(
      items
    )}, ${totalPrice}, ${description})
      RETURNING *;
    `;
    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    res.status(500).json({ error: "Erro ao criar pedido." });
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

module.exports = exports;
