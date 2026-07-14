const IORedis = require("ioredis");

let connection = null;

function getRedisUrl() {
  return process.env.REDIS_URL && String(process.env.REDIS_URL).trim()
    ? String(process.env.REDIS_URL).trim()
    : null;
}

function isRedisEnabled() {
  return Boolean(getRedisUrl());
}

function getRedisConnection() {
  if (!isRedisEnabled()) return null;
  if (connection) return connection;
  connection = new IORedis(getRedisUrl(), {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  return connection;
}

async function quitRedis() {
  if (!connection) return;
  await connection.quit();
  connection = null;
}

module.exports = {
  getRedisUrl,
  isRedisEnabled,
  getRedisConnection,
  quitRedis,
};
