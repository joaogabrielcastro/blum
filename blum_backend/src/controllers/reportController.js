const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

exports.getSalesByRep = async (req, res) => {
  try {
    const sales = await sql`
        SELECT
            "userId",
            SUM("totalPrice") AS "totalSales"
        FROM orders
        WHERE status = 'Entregue'
        GROUP BY "userId"
        ORDER BY "totalSales" DESC;
    `;
    res.status(200).json(sales);
  } catch (error) {
    console.error(
      "Erro ao gerar relatório de vendas por representante:",
      error
    );
    res
      .status(500)
      .json({ error: "Erro ao gerar relatório de vendas por representante." });
  }
};
exports.getDashboardStats = async (req, res) => {
  try {
    const [totalClients, totalProducts, totalOrders, totalSales] =
      await Promise.all([
        sql`SELECT COUNT(*) FROM clients`.then((r) => parseInt(r[0].count)),
        sql`SELECT COUNT(*) FROM products`.then((r) => parseInt(r[0].count)),
        sql`SELECT COUNT(*) FROM orders`.then((r) => parseInt(r[0].count)),
        sql`SELECT COALESCE(SUM("totalPrice"), 0) FROM orders WHERE status = 'Entregue'`.then(
          (r) => parseFloat(r[0].coalesce)
        ),
      ]);

    res.status(200).json({
      totalClients,
      totalProducts,
      totalOrders,
      totalSales: parseFloat(totalSales),
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas do dashboard:", error);
    res.status(500).json({ error: "Erro ao buscar estatísticas." });
  }
};

module.exports = exports;
