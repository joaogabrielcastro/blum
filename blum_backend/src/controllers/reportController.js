const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

exports.getSalesByRep = async (req, res) => {
  try {
    // CORREÇÃO: A query foi reescrita em uma única linha para garantir a
    // compatibilidade com o driver do banco de dados e evitar erros de sintaxe.
    const sales =
      await sql`SELECT userid, SUM(totalprice) AS "totalSales" FROM orders WHERE status = 'Entregue' GROUP BY userid ORDER BY "totalSales" DESC;`;
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

exports.getReportStats = async (req, res) => {
  const { period, userRole, userId } = req.query;

  // Constrói a query base
  let baseQuery = `SELECT COALESCE(COUNT(id), 0) AS "totalOrders", COALESCE(SUM(totalprice), 0) AS "totalSales" FROM orders WHERE status = 'Entregue'`;
  const params = [];

  // Adiciona filtro de período
  if (period === "week") {
    baseQuery += ` AND createdat >= NOW() - INTERVAL '7 days'`;
  } else if (period === "month") {
    baseQuery += ` AND createdat >= NOW() - INTERVAL '30 days'`;
  }

  // Adiciona filtro de usuário
  if (userRole === "salesperson" && userId) {
    params.push(userId);
    baseQuery += ` AND userid = $${params.length}`;
  }

  try {
    const result = await sql(baseQuery, params);

    const stats = {
      totalOrders: parseInt(result[0].totalOrders) || 0,
      totalSales: parseFloat(result[0].totalSales) || 0,
    };
    res.status(200).json(stats);
  } catch (error) {
    console.error("Erro ao buscar estatísticas do relatório:", error);
    res
      .status(500)
      .json({ error: "Erro ao buscar estatísticas do relatório." });
  }
};
