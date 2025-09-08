require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { neon } = require("@neondatabase/serverless");

const app = express();
const port = process.env.PORT || 3000;

// Conexão com o banco Neon
const sql = neon(process.env.DATABASE_URL);

// Middleware
app.use(express.json());
app.use(cors());

// Rotas
const clientRoutes = require("./src/routes/clientRoutes");
const productRoutes = require("./src/routes/productRoutes");
const orderRoutes = require("./src/routes/orderRoutes");
const reportRoutes = require("./src/routes/reportRoutes");
const brandRoutes = require("./src/routes/brandRoutes");

app.use("/api/v1/clients", clientRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/brands", brandRoutes);

const setupDatabase = async () => {
  try {
    console.log("Conectando ao banco de dados Neon...");

    // MUDANÇA: Todas as queries CREATE TABLE foram reescritas em uma única linha.
    await sql`CREATE TABLE IF NOT EXISTS clients (id SERIAL PRIMARY KEY, "companyName" VARCHAR(255) NOT NULL, "contactPerson" VARCHAR(255), phone VARCHAR(255), region VARCHAR(255), cnpj VARCHAR(255), "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)`;

    await sql`CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, "productCode" VARCHAR(255), price DECIMAL(10,2) NOT NULL, stock INTEGER NOT NULL, brand VARCHAR(255), "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)`;

    await sql`CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, clientId INTEGER REFERENCES clients(id) ON DELETE CASCADE, userId VARCHAR(255) NOT NULL, items JSONB, totalPrice DECIMAL(10,2) NOT NULL, status VARCHAR(50) DEFAULT 'Em aberto', description TEXT, createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, finishedAt TIMESTAMP WITH TIME ZONE)`;

    await sql`CREATE TABLE IF NOT EXISTS brands (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL)`;

    const columnCheck =
      await sql`SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'discount'`;

    if (columnCheck.length === 0) {
      console.log(
        "Coluna 'discount' não encontrada na tabela 'orders'. Adicionando..."
      );
      await sql`ALTER TABLE orders ADD COLUMN discount DECIMAL(10, 2) DEFAULT 0`;
      console.log("Coluna 'discount' adicionada com sucesso.");
    }

    console.log("Tabelas verificadas e criadas com sucesso.");
  } catch (error) {
    console.error("Erro ao configurar o banco de dados:", error);
    process.exit(1);
  }
};

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
