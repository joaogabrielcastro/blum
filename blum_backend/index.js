require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { neon } = require("@neondatabase/serverless");

const app = express();
const port = process.env.PORT || 3000;
const sql = neon(process.env.DATABASE_URL);

app.use(express.json());
app.use(cors());

// Importa as rotas
const clientRoutes = require("./src/routes/clientRoutes");
const productRoutes = require("./src/routes/productRoutes");
const orderRoutes = require("./src/routes/orderRoutes");
const reportRoutes = require("./src/routes/reportRoutes");

// Uso das rotas
app.use("/api/v1/clients", clientRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/reports", reportRoutes);

const setupDatabase = async () => {
  try {
    console.log("Conectando ao banco de dados Neon...");
    await sql`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        "companyName" VARCHAR(255) NOT NULL,
        "contactPerson" VARCHAR(255),
        phone VARCHAR(255),
        region VARCHAR(255),
        cnpj VARCHAR(255),
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        "productCode" VARCHAR(255),
        price DECIMAL(10, 2) NOT NULL,
        stock INTEGER NOT NULL,
        brand VARCHAR(255),
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        "clientId" INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        "userId" VARCHAR(255) NOT NULL,
        items JSONB,
        "totalPrice" DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'Em aberto',
        description TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "finishedAt" TIMESTAMP WITH TIME ZONE
      );
    `;
    console.log("Tabelas verificadas e criadas se necessário.");
  } catch (error) {
    console.error("Erro ao configurar o banco de dados:", error);
  }
};

app.get("/api/v1/status", async (req, res) => {
  try {
    const result = await sql`SELECT version()`;
    const { version } = result[0];

    // Contagem de registros para estatísticas
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
        version: version,
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
      database: {
        connected: false,
        error: error.message,
      },
    });
  }
});

setupDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
  });
});
