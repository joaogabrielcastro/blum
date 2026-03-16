const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function shiftPlaceholders(queryText, offset) {
  return queryText.replace(/\$(\d+)/g, (_, index) => `$${Number(index) + offset}`);
}

function isSqlFragment(value) {
  return Boolean(value && value.__isSqlFragment && typeof value.text === "string");
}

async function execute(text, values = []) {
  const result = await pool.query(text, values);
  return result.rows;
}

function createFragment(text, values) {
  return {
    __isSqlFragment: true,
    text,
    values,
    then(onFulfilled, onRejected) {
      return execute(text, values).then(onFulfilled, onRejected);
    },
    catch(onRejected) {
      return execute(text, values).catch(onRejected);
    },
    finally(onFinally) {
      return execute(text, values).finally(onFinally);
    },
  };
}

function buildTemplate(strings, interpolations) {
  let text = "";
  const values = [];

  for (let i = 0; i < strings.length; i += 1) {
    text += strings[i];

    if (i >= interpolations.length) {
      continue;
    }

    const value = interpolations[i];

    if (isSqlFragment(value)) {
      text += shiftPlaceholders(value.text, values.length);
      values.push(...value.values);
      continue;
    }

    values.push(value);
    text += `$${values.length}`;
  }

  return createFragment(text, values);
}

function sql(firstArg, ...rest) {
  if (Array.isArray(firstArg) && Object.prototype.hasOwnProperty.call(firstArg, "raw")) {
    return buildTemplate(firstArg, rest);
  }

  if (isSqlFragment(firstArg)) {
    return execute(firstArg.text, firstArg.values);
  }

  return execute(firstArg, rest[0] || []);
}

pool
  .connect()
  .then((client) => {
    console.log("Conectado ao banco de dados PostgreSQL na VPS!");
    client.release();
  })
  .catch((err) => {
    console.error("Erro de conexao com PostgreSQL:", err.stack);
  });

module.exports = {
  pool,
  sql,
};