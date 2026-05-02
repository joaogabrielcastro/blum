/* eslint-disable no-console */
const { pool } = require("../src/config/database");

const TENANT_ID = Number(process.env.EXPLAIN_TENANT_ID || 1);
const USER_ID = Number(process.env.EXPLAIN_USER_ID || 1);
const CLIENT_ID = Number(process.env.EXPLAIN_CLIENT_ID || 1);
const PRODUCT_ID = Number(process.env.EXPLAIN_PRODUCT_ID || 1);

const QUERIES = [
  {
    name: "orders.list.admin",
    text: `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT o.*, u.name AS seller_name, u.username AS seller_username,
        (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS items_count
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_ref
      WHERE o.tenant_id = $1
      ORDER BY o.createdat DESC
      LIMIT 50
    `,
    values: [TENANT_ID],
  },
  {
    name: "orders.list.seller",
    text: `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT o.*
      FROM orders o
      WHERE o.tenant_id = $1
        AND o.user_ref = $2
      ORDER BY o.createdat DESC
      LIMIT 50
    `,
    values: [TENANT_ID, USER_ID],
  },
  {
    name: "reports.commission.byBrand",
    text: `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT o.id, o.createdat, o.totalprice
      FROM orders o
      WHERE o.status = 'Entregue'
        AND o.tenant_id = $1
      ORDER BY o.createdat DESC
      LIMIT 200
    `,
    values: [TENANT_ID],
  },
  {
    name: "orders.client.priceHistory",
    text: `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT oi.id, o.id AS order_id, o.createdat, oi.unit_price
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.tenant_id = $1
        AND o.clientid = $2
        AND oi.product_id = $3
      ORDER BY o.createdat DESC
      LIMIT 20
    `,
    values: [TENANT_ID, CLIENT_ID, PRODUCT_ID],
  },
  {
    name: "purchases.lastPrice",
    text: `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT purchase_price, purchase_date
      FROM price_history
      WHERE tenant_id = $1
        AND product_id = $2
      ORDER BY purchase_date DESC
      LIMIT 1
    `,
    values: [TENANT_ID, PRODUCT_ID],
  },
];

async function run() {
  for (const query of QUERIES) {
    const result = await pool.query(query.text, query.values);
    console.log(`\n===== ${query.name} =====`);
    for (const row of result.rows) {
      console.log(row["QUERY PLAN"]);
    }
  }
}

run()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error.message || error);
    await pool.end();
    process.exit(1);
  });
