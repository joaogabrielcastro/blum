const { randomUUID } = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const purchaseRoutes = require("./routes/purchaseRoutes");
const { sql } = require("./config/database");
const { authenticate, authorize } = require("./middleware/authMiddleware");
const authRoutes = require("./routes/authRoutes");
const clientRoutes = require("./routes/clientRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reportRoutes = require("./routes/reportRoutes");
const brandRoutes = require("./routes/brandRoutes");

/**
 * Cria a aplicação Express (sem abrir porta). Usado em testes de integração.
 * API única: `/api/v2` (camelCase nas respostas quando aplicável).
 */
function createApp() {
  const app = express();

  if (process.env.TRUST_PROXY !== "0") {
    if (
      process.env.TRUST_PROXY === "1" ||
      process.env.NODE_ENV === "production"
    ) {
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
  app.use("/api/v2/auth/login", loginLimiter);

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
      origin(origin, callback) {
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

  const setApiVersion = (req, res, next) => {
    req.apiVersion = "v2";
    res.setHeader("x-api-version", "v2");
    next();
  };

  const registerStatusRoutes = (prefix) => {
    app.get(`${prefix}/status`, setApiVersion, (req, res) => {
      res.status(200).json({
        status: "online",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
      });
    });

    app.get(
      `${prefix}/status/details`,
      setApiVersion,
      authenticate,
      authorize("admin"),
      async (req, res) => {
        try {
          const result = await sql`SELECT version()`;
          const version = result[0]?.version || "desconhecida";

          const [clientsCount, productsCount, ordersCount] = await Promise.all([
            sql`SELECT COUNT(*) FROM clients`.then((r) =>
              parseInt(r[0].count),
            ),
            sql`SELECT COUNT(*) FROM products`.then((r) =>
              parseInt(r[0].count),
            ),
            sql`SELECT COUNT(*) FROM orders`.then((r) =>
              parseInt(r[0].count),
            ),
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
  };

  registerStatusRoutes("/api/v2");

  const mountApiRoutes = (versionPrefix) => {
    app.use(`${versionPrefix}/auth`, setApiVersion, authRoutes);
    app.use(`${versionPrefix}/clients`, setApiVersion, clientRoutes);
    app.use(`${versionPrefix}/products`, setApiVersion, productRoutes);
    app.use(`${versionPrefix}/orders`, setApiVersion, orderRoutes);
    app.use(`${versionPrefix}/reports`, setApiVersion, reportRoutes);
    app.use(`${versionPrefix}/brands`, setApiVersion, brandRoutes);
    app.use(`${versionPrefix}/purchases`, setApiVersion, purchaseRoutes);
  };

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

  return app;
}

module.exports = { createApp };
