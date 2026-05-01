require("dotenv").config({ override: false });
const { assertProductionConfig } = require("./src/config/env");
assertProductionConfig();
const { randomUUID } = require("crypto");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const purchaseRoutes = require("./src/routes/purchaseRoutes");
const { sql } = require("./src/config/database");
const { runMigrations } = require("./src/db/migrate");
const { seedDefaultUsers } = require("./src/bootstrap/seedDefaultUsers");
const { authenticate, authorize } = require("./src/middleware/authMiddleware");

const app = express();
const port = process.env.PORT || 3011;

if (process.env.TRUST_PROXY !== "0") {
  if (process.env.TRUST_PROXY === "1" || process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: { error: "Muitas tentativas. Tente mais tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", apiLimiter);
app.use("/api/v1/auth/login", loginLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use((req, res, next) => {
  const requestId = req.headers["x-request-id"] || randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const payload = {
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      elapsedMs: Number(elapsedMs.toFixed(2)),
    };
    if (res.statusCode >= 500) {
      console.error(JSON.stringify({ level: "error", ...payload }));
      return;
    }
    if (res.statusCode >= 400) {
      console.warn(JSON.stringify({ level: "warn", ...payload }));
      return;
    }
    console.log(JSON.stringify({ level: "info", ...payload }));
  });

  next();
});

const corsExtra = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...new Set(
    [
      "https://blum.jwsoftware.com.br",
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:8080",
      process.env.FRONTEND_URL,
      ...corsExtra,
    ].filter(Boolean),
  ),
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (process.env.NODE_ENV !== "production") {
        console.warn("CORS bloqueado para origem:", origin);
      }
      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/v1/status", (req, res) => {
  res.status(200).json({
    status: "online",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.get(
  "/api/v1/status/details",
  authenticate,
  authorize("admin"),
  async (req, res) => {
    try {
      const result = await sql`SELECT version()`;
      const version = result[0]?.version || "desconhecida";

      const [clientsCount, productsCount, ordersCount] = await Promise.all([
        sql`SELECT COUNT(*) FROM clients`.then((r) => parseInt(r[0].count)),
        sql`SELECT COUNT(*) FROM products`.then((r) => parseInt(r[0].count)),
        sql`SELECT COUNT(*) FROM orders`.then((r) => parseInt(r[0].count)),
      ]);

      res.status(200).json({
        status: "online",
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          version,
          stats: {
            clients: clientsCount,
            products: productsCount,
            orders: ordersCount,
          },
        },
        server: {
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || "development",
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        timestamp: new Date().toISOString(),
        database: { connected: false, error: error.message },
      });
    }
  },
);

const authRoutes = require("./src/routes/authRoutes");
const clientRoutes = require("./src/routes/clientRoutes");
const productRoutes = require("./src/routes/productRoutes");
const orderRoutes = require("./src/routes/orderRoutes");
const reportRoutes = require("./src/routes/reportRoutes");
const brandRoutes = require("./src/routes/brandRoutes");
const ENABLE_V1_DEPRECATION_HEADERS =
  process.env.ENABLE_V1_DEPRECATION_HEADERS === "true";
const V1_SUNSET_DATE = process.env.API_V1_SUNSET_DATE || "Wed, 31 Dec 2026 23:59:59 GMT";

const setApiVersion = (version) => (req, res, next) => {
  req.apiVersion = version;
  res.setHeader("x-api-version", version);
  if (version === "v1" && ENABLE_V1_DEPRECATION_HEADERS) {
    res.setHeader("Deprecation", "true");
    res.setHeader("Sunset", V1_SUNSET_DATE);
    res.setHeader(
      "Link",
      '</api/v2>; rel="successor-version"; title="Use API v2"',
    );
  }
  next();
};

const mountApiRoutes = (versionPrefix) => {
  app.use(`${versionPrefix}/auth`, setApiVersion(versionPrefix.slice(-2)), authRoutes);
  app.use(`${versionPrefix}/clients`, setApiVersion(versionPrefix.slice(-2)), clientRoutes);
  app.use(`${versionPrefix}/products`, setApiVersion(versionPrefix.slice(-2)), productRoutes);
  app.use(`${versionPrefix}/orders`, setApiVersion(versionPrefix.slice(-2)), orderRoutes);
  app.use(`${versionPrefix}/reports`, setApiVersion(versionPrefix.slice(-2)), reportRoutes);
  app.use(`${versionPrefix}/brands`, setApiVersion(versionPrefix.slice(-2)), brandRoutes);
  app.use(`${versionPrefix}/purchases`, setApiVersion(versionPrefix.slice(-2)), purchaseRoutes);
};

mountApiRoutes("/api/v1");
mountApiRoutes("/api/v2");

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  console.error(err.stack || err.message);
  const isProd = process.env.NODE_ENV === "production";
  const status = Number(err.status || err.statusCode) || 500;
  const safeMessage =
    isProd && status >= 500 && !err.expose
      ? "Erro interno do servidor"
      : err.message || "Erro";
  res.status(status).json({
    status: "error",
    error: safeMessage,
    message: safeMessage,
    details: err.details || undefined,
    requestId: req.requestId || null,
  });
});

const setupDatabase = async () => {
  try {
    console.log("Conectando ao banco de dados PostgreSQL...");
    await runMigrations();
    console.log("Migrações aplicadas.");
    await seedDefaultUsers({ onlyIfDatabaseEmpty: true });
  } catch (error) {
    console.error("Erro ao configurar o banco de dados:", error);
    process.exit(1);
  }
};

const startApp = async () => {
  try {
    await setupDatabase();

    app.listen(port, "0.0.0.0", () => {
      console.log(`🚀 Servidor rodando na porta ${port}`);
      console.log("✅ Banco de dados e Servidor prontos!");
    });
  } catch (error) {
    console.error("❌ Erro ao iniciar a aplicação:", error);
    process.exit(1);
  }
};

startApp();
