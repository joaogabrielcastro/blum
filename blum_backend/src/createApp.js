const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const purchaseRoutes = require("./routes/purchaseRoutes");
const { sql } = require("./config/database");
const {
  authenticate,
  authorize,
  optionalAuth,
} = require("./middleware/authMiddleware");
const authRoutes = require("./routes/authRoutes");
const clientRoutes = require("./routes/clientRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reportRoutes = require("./routes/reportRoutes");
const brandRoutes = require("./routes/brandRoutes");
const billingRoutes = require("./routes/billingRoutes");
const tenantRoutes = require("./routes/tenantRoutes");
const platformAdminRoutes = require("./routes/platformAdminRoutes");
const stripeWebhookController = require("./controllers/stripeWebhookController");
const { requireActiveSubscription } = require("./middleware/subscriptionMiddleware");
const { tenantDbContextMiddleware } = require("./middleware/tenantDbContextMiddleware");
const {
  setupSentryExpress,
  captureRequestContext,
  getActiveTraceId,
  getObservabilityStatus,
  getRelease,
  getEnvironment,
} = require("./observability");

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

  const corsExtra = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const allowedOrigins = [
    ...new Set(
      [
        "https://blum.jwsoftware.com.br",
        "https://www.blum.jwsoftware.com.br",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8080",
        process.env.FRONTEND_URL,
        ...corsExtra,
      ].filter(Boolean),
    ),
  ];

  const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    if (allowedOrigins.includes(origin)) return true;
    try {
      const host = new URL(origin).hostname;
      if (
        host === "blum.jwsoftware.com.br" ||
        host === "www.blum.jwsoftware.com.br"
      ) {
        return true;
      }
      if (host.endsWith(".blum.jwsoftware.com.br")) {
        return true;
      }
    } catch {
      /* ignore invalid origin */
    }
    return false;
  };

  const corsOptions = {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      if (process.env.NODE_ENV !== "production") {
        console.warn("CORS bloqueado para origem:", origin);
      }
      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With",
      "x-request-id",
      "x-tenant-slug",
      "sentry-trace",
      "baggage",
    ],
    exposedHeaders: ["x-request-id", "x-api-version"],
    optionsSuccessStatus: 204,
  };

  // CORS antes de rate limit / body parser para o preflight OPTIONS receber os headers.
  app.use(cors(corsOptions));
  app.options(/.*/, cors(corsOptions));

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  const skipPreflight = (req) => req.method === "OPTIONS";

  const rateLimitKey = (req) => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith("Bearer ")) {
      try {
        const decoded = jwt.decode(auth.slice(7));
        const uid = decoded?.userId ?? decoded?.id ?? decoded?.sub;
        if (uid != null) return `user:${uid}`;
      } catch {
        /* ignore invalid token for rate-limit key */
      }
    }
    const xff = req.headers["x-forwarded-for"];
    if (typeof xff === "string" && xff.trim()) {
      return xff.split(",")[0].trim();
    }
    return req.ip || "unknown";
  };

  const apiRateLimitMax =
    parseInt(process.env.API_RATE_LIMIT_MAX, 10) || 5000;

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: apiRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipPreflight,
    keyGenerator: rateLimitKey,
    message: { error: "Muitas requisições. Aguarde alguns minutos e tente novamente." },
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    message: { error: "Muitas tentativas. Tente mais tarde." },
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipPreflight,
    keyGenerator: rateLimitKey,
  });

  app.use("/api/", apiLimiter);
  app.use("/api/v2/auth/login", loginLimiter);

  const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { error: "Muitas tentativas de cadastro. Tente mais tarde." },
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipPreflight,
    keyGenerator: rateLimitKey,
  });
  app.use("/api/v2/tenants/signup", signupLimiter);

  // Webhook Stripe precisa do body bruto para validação de assinatura.
  app.post(
    "/api/v2/billing/webhook",
    express.raw({ type: "application/json" }),
    stripeWebhookController.handleWebhook,
  );

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Decodifica JWT (se presente) antes do contexto RLS — tenant autenticado vem do token.
  app.use("/api/v2", optionalAuth);
  app.use("/api/v2", tenantDbContextMiddleware);

  app.use((req, res, next) => {
    const requestId = req.headers["x-request-id"] || randomUUID();
    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    captureRequestContext(req);

    const start = process.hrtime.bigint();
    res.on("finish", () => {
      const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      const payload = {
        requestId,
        traceId: getActiveTraceId(),
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

  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/api/v2/observability", (req, res) => {
    const status = getObservabilityStatus();
    res.status(200).json({
      status: "ok",
      release: getRelease(),
      environment: getEnvironment(),
      sentry: status.sentry,
      otel: status.otel,
    });
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
    app.use(`${versionPrefix}/tenants`, setApiVersion, tenantRoutes);
    app.use(`${versionPrefix}/platform`, setApiVersion, platformAdminRoutes);
    app.use(
      `${versionPrefix}/billing`,
      setApiVersion,
      billingRoutes,
    );
    app.use(
      `${versionPrefix}/clients`,
      setApiVersion,
      requireActiveSubscription,
      clientRoutes,
    );
    app.use(
      `${versionPrefix}/products`,
      setApiVersion,
      requireActiveSubscription,
      productRoutes,
    );
    app.use(
      `${versionPrefix}/orders`,
      setApiVersion,
      requireActiveSubscription,
      orderRoutes,
    );
    app.use(
      `${versionPrefix}/reports`,
      setApiVersion,
      requireActiveSubscription,
      reportRoutes,
    );
    app.use(
      `${versionPrefix}/brands`,
      setApiVersion,
      requireActiveSubscription,
      brandRoutes,
    );
    app.use(
      `${versionPrefix}/purchases`,
      setApiVersion,
      requireActiveSubscription,
      purchaseRoutes,
    );
  };

  mountApiRoutes("/api/v2");

  // Sentry error handler antes do handler JSON (captura exceções não tratadas).
  setupSentryExpress(app);

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
