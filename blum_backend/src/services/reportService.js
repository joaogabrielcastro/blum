const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

class ReportService {
  /**
   * Busca vendas por representante
   * @returns {Promise<Array>} Lista de vendas por representante
   */
  async getSalesByRep() {
    return await sql`
      SELECT userid, SUM(totalprice) AS "totalSales" 
      FROM orders 
      WHERE status = 'Entregue' 
      GROUP BY userid 
      ORDER BY "totalSales" DESC
    `;
  }

  /**
   * Busca estatísticas do relatório
   * @param {Object} filters - Filtros (period, userRole, userId)
   * @returns {Promise<Object>} Estatísticas
   */
  async getStats(filters = {}) {
    const { period, userRole, userId } = filters;

    let baseQuery = `
      SELECT 
        COALESCE(COUNT(id), 0) AS "totalOrders", 
        COALESCE(SUM(totalprice), 0) AS "totalSales" 
      FROM orders 
      WHERE status = 'Entregue'
    `;
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

    const result = await sql(baseQuery, params);

    return {
      totalOrders: parseInt(result[0].totalOrders) || 0,
      totalSales: parseFloat(result[0].totalSales) || 0,
    };
  }

  /**
   * Busca relatório de comissões
   * @param {Object} filters - Filtros (startDate, endDate, userId)
   * @returns {Promise<Array>} Relatório de comissões
   */
  async getCommissionReport(filters = {}) {
    const { startDate, endDate, userId } = filters;

    let query = sql`
      SELECT 
        o.userid,
        COUNT(o.id) as total_orders,
        SUM(o.totalprice) as total_sales,
        SUM(o.total_commission) as total_commission
      FROM orders o
      WHERE o.status = 'Entregue'
    `;

    if (startDate) {
      query = sql`${query} AND o.createdat >= ${startDate}`;
    }
    if (endDate) {
      query = sql`${query} AND o.createdat <= ${endDate}`;
    }
    if (userId) {
      query = sql`${query} AND o.userid = ${userId}`;
    }

    query = sql`
      ${query}
      GROUP BY o.userid
      ORDER BY total_commission DESC
    `;

    return await query;
  }

  /**
   * Busca relatório de comissões detalhado por marca
   * @param {Object} filters - Filtros (startDate, endDate, sellerId)
   * @returns {Promise<Array>} Relatório detalhado
   */
  async getCommissionByBrand(filters = {}) {
    const { startDate, endDate, sellerId } = filters;

    let conditions = ["o.status = 'Entregue'"];
    const params = [];

    if (startDate) {
      params.push(startDate);
      conditions.push(`o.createdat >= $${params.length}`);
    }
    if (endDate) {
      params.push(endDate);
      conditions.push(`o.createdat <= $${params.length}`);
    }
    if (sellerId) {
      params.push(sellerId);
      conditions.push(`o.userid = $${params.length}`);
    }

    const whereClause = conditions.join(" AND ");

    const query = `
      SELECT 
        o.userid,
        o.id as order_id,
        o.createdat,
        o.totalprice,
        o.total_commission,
        o.items
      FROM orders o
      WHERE ${whereClause}
      ORDER BY o.createdat DESC
    `;

    return await sql(query, params);
  }
}

module.exports = new ReportService();
