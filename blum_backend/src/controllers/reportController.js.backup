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

exports.getCommissionReport = async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;

    let query = sql`
      SELECT 
        o.userid,
        COUNT(o.id) as total_orders,
        SUM(o.totalprice) as total_sales,
        SUM(o.total_commission) as total_commission,
        JSONB_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'brand', brand_data->>'brand',
            'commission', (brand_data->>'commission_amount')::decimal
          )
        ) as brand_commissions
      FROM orders o,
      LATERAL (
        SELECT jsonb_array_elements(o.items) as item_data
      ) items,
      LATERAL (
        SELECT 
          item_data->>'brand' as brand,
          SUM((item_data->>'commission_amount')::decimal) as commission_amount
      ) brand_data
      WHERE o.status = 'Entregue'
    `;

    if (startDate) {
      query = query.append(sql` AND o.createdat >= ${startDate}`);
    }
    if (endDate) {
      query = query.append(sql` AND o.createdat <= ${endDate}`);
    }
    if (userId) {
      query = query.append(sql` AND o.userid = ${userId}`);
    }

    query = query.append(sql`
      GROUP BY o.userid
      ORDER BY total_commission DESC
    `);

    const results = await query;

    res.status(200).json(results);
  } catch (error) {
    console.error("Erro ao gerar relatório de comissões:", error);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
};

// Relatório de comissões por marca
exports.getCommissionByBrand = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = sql`
      SELECT 
        item_data->>'brand' as brand_name,
        SUM((item_data->>'quantity')::integer) as total_quantity,
        SUM((item_data->>'price')::decimal * (item_data->>'quantity')::integer) as total_sales,
        SUM((item_data->>'commission_amount')::decimal) as total_commission,
        COUNT(DISTINCT o.id) as total_orders
      FROM orders o,
      LATERAL (
        SELECT jsonb_array_elements(o.items) as item_data
      ) items
      WHERE o.status = 'Entregue'
    `;

    if (startDate) {
      query = query.append(sql` AND o.createdat >= ${startDate}`);
    }
    if (endDate) {
      query = query.append(sql` AND o.createdat <= ${endDate}`);
    }

    query = query.append(sql`
      GROUP BY item_data->>'brand'
      ORDER BY total_commission DESC
    `);

    const results = await query;

    res.status(200).json(results);
  } catch (error) {
    console.error("Erro ao gerar relatório por marca:", error);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
};
