const { sql } = require("../config/database");
const reportRepository = require("../repositories/reportRepository");
const { requireTenantId, tenantIdFromAuth } = require("../utils/tenantContext");

class ReportService {
  async getSalesByRep(tenantId) {
    tenantId = requireTenantId(tenantId);
    return await sql`
      SELECT
        u.id AS "userId",
        u.username,
        u.name AS "sellerName",
        SUM(o.totalprice) AS "totalSales"
      FROM orders o
      JOIN users u ON u.id = o.user_ref
      WHERE o.status = 'Entregue' AND o.tenant_id = ${tenantId}
      GROUP BY u.id, u.username, u.name
      ORDER BY "totalSales" DESC
    `;
  }

  async getStats(filters = {}) {
    const { period, authUser } = filters;
    const userRole = authUser?.role;
    const userId = authUser?.userId;
    const tenantId = tenantIdFromAuth(authUser);

    let baseQuery = `
      SELECT
        COALESCE(COUNT(id), 0) AS "totalOrders",
        COALESCE(SUM(totalprice), 0) AS "totalSales"
      FROM orders
      WHERE status = 'Entregue' AND tenant_id = ${tenantId}
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

    const result = await reportRepository.query(baseQuery, params);

    return {
      totalOrders: parseInt(result[0].totalOrders) || 0,
      totalSales: parseFloat(result[0].totalSales) || 0,
    };
  }

  async getCommissionReport(filters = {}) {
    let { startDate, endDate, userId, tenantId } = filters;
    tenantId = requireTenantId(tenantId);

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
      WHERE o.status = 'Entregue' AND o.tenant_id = ${tenantId}
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
    let { startDate, endDate, sellerId, tenantId } = filters;
    tenantId = requireTenantId(tenantId);

    let conditions = [
      "o.status = 'Entregue'",
      `o.tenant_id = ${tenantId}`,
    ];
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
      WITH filtered_orders AS (
        SELECT o.id, o.user_ref, o.createdat, o.totalprice, o.total_commission
        FROM orders o
        WHERE ${whereClause}
      )
      SELECT
        fo.user_ref,
        u.username AS seller_username,
        u.name AS seller_name,
        fo.id AS order_id,
        fo.createdat,
        fo.totalprice,
        fo.total_commission,
        COALESCE(
          json_agg(
            json_build_object(
              'brand', oi.brand,
              'quantity', oi.quantity,
              'commission_amount', oi.commission_amount,
              'unit_price', oi.unit_price,
              'line_total', oi.line_total
            ) ORDER BY oi.id
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'::json
        ) AS items
      FROM filtered_orders fo
      JOIN users u ON u.id = fo.user_ref
      LEFT JOIN order_items oi ON oi.order_id = fo.id
      GROUP BY
        fo.user_ref,
        u.username,
        u.name,
        fo.id,
        fo.createdat,
        fo.totalprice,
        fo.total_commission
      ORDER BY fo.createdat DESC
    `;

    return await reportRepository.query(query, params);
  }

  /** Sincroniza resumos mensais a partir de pedidos entregues (finishedat). */
  async syncMonthlySalesSummaries(tenantId) {
    tenantId = requireTenantId(tenantId);
    await sql`
      INSERT INTO monthly_sales_summary (tenant_id, year, month, seller_user_id, total_sales, order_count, updated_at)
      SELECT
        o.tenant_id,
        EXTRACT(YEAR FROM o.finishedat)::int AS year,
        EXTRACT(MONTH FROM o.finishedat)::int AS month,
        o.user_ref AS seller_user_id,
        COALESCE(SUM(o.totalprice), 0) AS total_sales,
        COUNT(o.id)::int AS order_count,
        NOW()
      FROM orders o
      WHERE o.status = 'Entregue'
        AND o.tenant_id = ${tenantId}
        AND o.finishedat IS NOT NULL
      GROUP BY o.tenant_id, year, month, o.user_ref
      ON CONFLICT (tenant_id, year, month, seller_user_id) WHERE seller_user_id IS NOT NULL
      DO UPDATE SET
        total_sales = EXCLUDED.total_sales,
        order_count = EXCLUDED.order_count,
        updated_at = NOW()
    `;

    await sql`
      INSERT INTO monthly_sales_summary (tenant_id, year, month, seller_user_id, total_sales, order_count, updated_at)
      SELECT
        o.tenant_id,
        EXTRACT(YEAR FROM o.finishedat)::int AS year,
        EXTRACT(MONTH FROM o.finishedat)::int AS month,
        NULL AS seller_user_id,
        COALESCE(SUM(o.totalprice), 0) AS total_sales,
        COUNT(o.id)::int AS order_count,
        NOW()
      FROM orders o
      WHERE o.status = 'Entregue'
        AND o.tenant_id = ${tenantId}
        AND o.finishedat IS NOT NULL
      GROUP BY o.tenant_id, year, month
      ON CONFLICT (tenant_id, year, month) WHERE seller_user_id IS NULL
      DO UPDATE SET
        total_sales = EXCLUDED.total_sales,
        order_count = EXCLUDED.order_count,
        updated_at = NOW()
    `;
  }

  async listMonthlySalesSummaries(tenantId, sellerUserId = null) {
    tenantId = requireTenantId(tenantId);
    if (sellerUserId != null && sellerUserId !== "") {
      return sql`
        SELECT year, month, total_sales, order_count, updated_at
        FROM monthly_sales_summary
        WHERE tenant_id = ${tenantId}
          AND seller_user_id = ${Number(sellerUserId)}
        ORDER BY year DESC, month DESC
      `;
    }
    return sql`
      SELECT year, month, total_sales, order_count, updated_at
      FROM monthly_sales_summary
      WHERE tenant_id = ${tenantId}
        AND seller_user_id IS NULL
      ORDER BY year DESC, month DESC
    `;
  }

  async getSalesTarget({ tenantId, year, month, sellerUserId = null }) {
    tenantId = requireTenantId(tenantId);
    const sellerId =
      sellerUserId != null && sellerUserId !== ""
        ? Number(sellerUserId)
        : null;

    const rows =
      sellerId == null
        ? await sql`
            SELECT target_amount
            FROM sales_targets
            WHERE tenant_id = ${tenantId}
              AND year = ${year}
              AND month = ${month}
              AND seller_user_id IS NULL
            LIMIT 1
          `
        : await sql`
            SELECT target_amount
            FROM sales_targets
            WHERE tenant_id = ${tenantId}
              AND year = ${year}
              AND month = ${month}
              AND seller_user_id = ${sellerId}
            LIMIT 1
          `;
    return rows[0] ? parseFloat(rows[0].target_amount) : null;
  }

  async upsertSalesTarget({
    tenantId,
    year,
    month,
    sellerUserId = null,
    targetAmount,
  }) {
    tenantId = requireTenantId(tenantId);
    const amount = parseFloat(targetAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("Valor da meta deve ser zero ou positivo");
    }

    const sellerId =
      sellerUserId != null && sellerUserId !== ""
        ? Number(sellerUserId)
        : null;

    const rows = sellerId == null
      ? await sql`
          INSERT INTO sales_targets (tenant_id, year, month, seller_user_id, target_amount, updated_at)
          VALUES (${tenantId}, ${year}, ${month}, NULL, ${amount}, NOW())
          ON CONFLICT (tenant_id, year, month) WHERE seller_user_id IS NULL
          DO UPDATE SET
            target_amount = EXCLUDED.target_amount,
            updated_at = NOW()
          RETURNING *
        `
      : await sql`
          INSERT INTO sales_targets (tenant_id, year, month, seller_user_id, target_amount, updated_at)
          VALUES (${tenantId}, ${year}, ${month}, ${sellerId}, ${amount}, NOW())
          ON CONFLICT (tenant_id, year, month, seller_user_id) WHERE seller_user_id IS NOT NULL
          DO UPDATE SET
            target_amount = EXCLUDED.target_amount,
            updated_at = NOW()
          RETURNING *
        `;
    return rows[0];
  }
}

module.exports = new ReportService();
