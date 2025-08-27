const express = require('express');
const dotenv = require('dotenv');
const sequelize = require('./config/database');
const productRoutes = require('./routes/productRoutes');
const clientRoutes = require('./routes/clientRoutes'); // NOVO: Importa as rotas de cliente

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Sincronizar o banco de dados
sequelize.sync()
  .then(() => console.log('Banco de dados e tabelas sincronizados!'))
  .catch(err => console.error('Erro na sincronização:', err));

// Rotas da API
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/clients', clientRoutes); // NOVO: Adiciona as rotas de cliente

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});