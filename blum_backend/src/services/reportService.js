const { sql } = require("../config/database");

class ReportService {
  async getSalesByRep() {
    return await sql`
      SELECT
        u.id AS "userId",
        u.username,
        u.name AS "sellerName",
        SUM(o.totalprice) AS "totalSales"
      FROM orders o
      JOIN users u ON u.id = o.user_ref
      WHERE o.status = 'Entregue'
      GROUP BY u.id, u.username, u.name
      ORDER BY "totalSales" DESC
    `;
  }

  async getStats(filters = {}) {
    const { period, authUser } = filters;
    const userRole = authUser?.role;
    const userId = authUser?.userId;

    let baseQuery = `
      SELECT
        COALESCE(COUNT(id), 0) AS "totalOrders",
        COALESCE(SUM(totalprice), 0) AS "totalSales"
      FROM orders
      WHERE status = 'Entregue'
    `;
    const params = [];

    if (period === "week") {
      baseQuery += ` AND createdat >= NOW() - INTERVAL '7 days'`;
    } else if (period === "month") {
      baseQuery += ` AND createdat >= NOW() - INTERVAL '30 days'`;
    }

    if (userRole === "salesperson" && userId != null) {
      params.push(userId);
      baseQuery += ` AND user_ref = $${params.length}`;
    }

    const result = await sql(baseQuery, params);

    return {
      totalOrders: parseInt(result[0].totalOrders) || 0,
      totalSales: parseFloat(result[0].totalSales) || 0,
    };
  }

  async getCommissionReport(filters = {}) {
    const { startDate, endDate, userId } = filters;

    let query = sql`
      SELECT
        o.user_ref,
        u.username,
        u.name AS seller_name,
        COUNT(o.id) as total_orders,
        SUM(o.totalprice) as total_sales,
        SUM(o.total_commission) as total_commission
      FROM orders o
      JOIN users u ON u.id = o.user_ref
      WHERE o.status = 'Entregue'
    `;

    if (startDate) {
      query = sql`${query} AND o.createdat >= ${startDate}`;
    }
    if (endDate) {
      query = sql`${query} AND o.createdat <= ${endDate}`;
    }
    if (userId != null && userId !== "") {
      query = sql`${query} AND o.user_ref = ${Number(userId)}`;
    }

    query = sql`
      ${query}
      GROUP BY o.user_ref, u.username, u.name
      ORDER BY total_commission DESC
    `;

    return await query;
  }

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
    if (sellerId != null && sellerId !== "") {
      params.push(Number(sellerId));
      conditions.push(`o.user_ref = $${params.length}`);
    }

    const whereClause = conditions.join(" AND ");

    const query = `
      SELECT
        o.user_ref,
        u.username AS seller_username,
        u.name AS seller_name,
        o.id AS order_id,
        o.createdat,
        o.totalprice,
        o.total_commission,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'brand', oi.brand,
                'quantity', oi.quantity,
                'commission_amount', oi.commission_amount,
                'unit_price', oi.unit_price,
                'line_total', oi.line_total
              ) ORDER BY oi.id
            )
            FROM order_items oi
            WHERE oi.order_id = o.id
          ),
          '[]'::json
        ) AS items
      FROM orders o
      JOIN users u ON u.id = o.user_ref
      WHERE ${whereClause}
      ORDER BY o.createdat DESC
    `;

    return await sql(query, params);
  }
}

module.exports = new ReportService();
