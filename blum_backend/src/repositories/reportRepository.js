const { sql } = require("../config/database");

async function query(text, values) {
  return sql(text, values || []);
}

module.exports = { query };
