const NodeCache = require("node-cache");

const TTL_SECONDS = parseInt(process.env.CACHE_TTL_SECONDS || "300", 10);
const memCache = new NodeCache({ stdTTL: TTL_SECONDS, checkperiod: 60 });

let redisClient = null;
try {
  if (process.env.REDIS_URL) {
    const Redis = require("ioredis");
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });
    redisClient.on("error", (err) => {
      console.warn("Redis:", err.message);
    });
  }
} catch (e) {
  console.warn("ioredis não disponível — cache em memória.");
}

async function cacheGet(key) {
  if (redisClient) {
    try {
      const raw = await redisClient.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return memCache.get(key) ?? null;
    }
  }
  return memCache.get(key) ?? null;
}

async function cacheSet(key, value, ttlSec = TTL_SECONDS) {
  if (redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), "EX", ttlSec);
      return;
    } catch (e) {
      memCache.set(key, value, ttlSec);
      return;
    }
  }
  memCache.set(key, value, ttlSec);
}

async function invalidateProductsCache() {
  const prefix = "products:";
  if (redisClient) {
    try {
      let cursor = "0";
      do {
        const [nextCursor, keys] = await redisClient.scan(
          cursor,
          "MATCH",
          `${prefix}*`,
          "COUNT",
          100,
        );
        if (keys.length) {
          await redisClient.del(...keys);
        }
        cursor = nextCursor;
      } while (cursor !== "0");
    } catch (e) {
      memCache.flushAll();
    }
  } else {
    memCache.flushAll();
  }
}

function cacheKeyProducts(filters) {
  return `products:${JSON.stringify(filters || {})}`;
}

module.exports = {
  cacheGet,
  cacheSet,
  invalidateProductsCache,
  cacheKeyProducts,
};
