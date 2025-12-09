require("dotenv").config();
const express = require("express");
const cors = require("cors");
const purchaseRoutes = require("./src/routes/purchaseRoutes");
const { neon } = require("@neondatabase/serverless");

const app = express();
const port = process.env.PORT || 3000;

// Conexão com o banco Neon
const sql = neon(process.env.DATABASE_URL);

// Middleware
app.use(express.json());

// CORS configurado para múltiplas origens
const allowedOrigins = [
  "http://localhost:3001",
  "http://localhost:3000",
  "https://blum-azure.vercel.app",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Permite requisições sem origin (mobile apps, Postman, etc)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('❌ CORS bloqueado para origem:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rotas
const authRoutes = require("./src/routes/authRoutes");
const clientRoutes = require("./src/routes/clientRoutes");
const productRoutes = require("./src/routes/productRoutes");
const orderRoutes = require("./src/routes/orderRoutes");
const reportRoutes = require("./src/routes/reportRoutes");
const brandRoutes = require("./src/routes/brandRoutes");

// Rota de autenticação (pública)
app.use("/api/v1/auth", authRoutes);

// Rotas protegidas (serão configuradas com middleware posteriormente)
app.use("/api/v1/clients", clientRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/brands", brandRoutes);
app.use("/api/v1/purchases", purchaseRoutes);

const setupDatabase = async () => {
  try {
    console.log("Conectando ao banco de dados Neon...");

    await sql`CREATE TABLE IF NOT EXISTS clients (id SERIAL PRIMARY KEY, companyname VARCHAR(255) NOT NULL, contactperson VARCHAR(255), phone VARCHAR(255), region VARCHAR(255), cnpj VARCHAR(255), createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)`;

    await sql`CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY, 
  name VARCHAR(255) NOT NULL, 
  productcode VARCHAR(255),
  subcode VARCHAR(255),
  price DECIMAL(10,2) NOT NULL, 
  stock INTEGER NOT NULL, 
  brand VARCHAR(255), 
  minstock INTEGER DEFAULT 0,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)`;

    await sql`CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, clientid INTEGER REFERENCES clients(id) ON DELETE CASCADE, userid VARCHAR(255) NOT NULL, items JSONB, totalprice DECIMAL(10,2) NOT NULL, status VARCHAR(50) DEFAULT 'Em aberto', description TEXT, createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, finishedat TIMESTAMP WITH TIME ZONE)`;

    await sql`CREATE TABLE IF NOT EXISTS brands (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, commission_rate DECIMAL(5,2) DEFAULT 0)`;

    // Tabela de usuários para autenticação
    await sql`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'salesperson')),
      name VARCHAR(255),
      createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`;

    // Índices para melhor performance
    await sql`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`;

    // Tabela de histórico de preços
    await sql`CREATE TABLE IF NOT EXISTS price_history (
      id SERIAL PRIMARY KEY,
      productid INTEGER REFERENCES products(id) ON DELETE CASCADE,
      old_price DECIMAL(10,2),
      new_price DECIMAL(10,2),
      changed_by VARCHAR(255),
      changedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`;

    // Adiciona a coluna 'discount' na tabela 'orders' se não existir
    const columnCheckOrders =
      await sql`SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'discount'`;
    if (columnCheckOrders.length === 0) {
      await sql`ALTER TABLE orders ADD COLUMN discount DECIMAL(10, 2) DEFAULT 0`;
    }

    // Adiciona a coluna 'minstock' na tabela 'products' se não existir
    const columnCheckProducts =
      await sql`SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'minstock'`;
    if (columnCheckProducts.length === 0) {
      await sql`ALTER TABLE products ADD COLUMN minstock INTEGER DEFAULT 0`;
    }

    // ✅ Adiciona a coluna 'subcode' na tabela 'products' se não existir
    const columnCheckSubcode =
      await sql`SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'subcode'`;
    if (columnCheckSubcode.length === 0) {
      await sql`ALTER TABLE products ADD COLUMN subcode VARCHAR(255)`;
      console.log("✅ Coluna 'subcode' adicionada à tabela products");
    }

    // ✅ Adiciona a coluna 'commission_rate' na tabela 'brands' se não existir
    const columnCheckCommission =
      await sql`SELECT 1 FROM information_schema.columns WHERE table_name = 'brands' AND column_name = 'commission_rate'`;
    if (columnCheckCommission.length === 0) {
      await sql`ALTER TABLE brands ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 0`;
      console.log("✅ Coluna 'commission_rate' adicionada à tabela brands");
    }

    console.log("Tabelas verificadas e criadas com sucesso.");
  } catch (error) {
    console.error("Erro ao configurar o banco de dados:", error);
    process.exit(1);
  }
};

// ... (resto do seu arquivo index.js)
// Rota de status do servidor
app.get("/api/v1/status", async (req, res) => {
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
});

// Middleware global de erro
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ status: "error", message: err.message });
});

// Inicializa o servidor
setupDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
  });
});
