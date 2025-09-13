// clientController.js - Certifique-se de que todas as funções estão exportadas
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

// Get all clients
exports.getAll = async (req, res) => {
  try {
    const clients = await sql`SELECT * FROM clients ORDER BY "createdAt" DESC`;
    res.status(200).json(clients);
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    res.status(500).json({ error: "Erro ao buscar clientes." });
  }
};

// Get client by ID
exports.getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: "ID do cliente inválido." });
    }
    
    const clients = await sql`SELECT * FROM clients WHERE id = ${id}`;
    
    if (clients.length === 0) {
      return res.status(404).json({ error: "Cliente não encontrado." });
    }
    
    res.status(200).json(clients[0]);
  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    res.status(500).json({ error: "Erro ao buscar cliente." });
  }
};

// Create client
exports.create = async (req, res) => {
  const { companyName, contactPerson, phone, region, cnpj } = req.body;

  if (!companyName || !cnpj) {
    return res.status(400).json({ error: "Nome da empresa e CNPJ são obrigatórios." });
  }

  try {
    const result = await sql(
      `INSERT INTO clients ("companyName", "contactPerson", phone, region, cnpj, "createdAt")
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [companyName, contactPerson, phone, region, cnpj]
    );
    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Erro ao criar cliente:", error);
    res.status(500).json({ error: "Erro ao criar cliente." });
  }
};

// Update client
exports.update = async (req, res) => {
  const { id } = req.params;
  const { companyName, contactPerson, phone, region, cnpj } = req.body;

  if (!companyName) {
    return res.status(400).json({ error: "Nome da empresa é obrigatório." });
  }

  try {
    const result = await sql(
      `UPDATE clients 
       SET "companyName" = $1, "contactPerson" = $2, phone = $3, region = $4, cnpj = $5
       WHERE id = $6
       RETURNING *`,
      [companyName, contactPerson, phone, region, cnpj, id]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: "Cliente não encontrado." });
    }

    res.status(200).json(result[0]);
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);
    res.status(500).json({ error: "Erro ao atualizar cliente." });
  }
};

// Delete client - ESTA FUNÇÃO ESTAVA FALTANDO
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: "ID do cliente inválido." });
    }
    
    const result = await sql`DELETE FROM clients WHERE id = ${id} RETURNING *`;
    
    if (result.length === 0) {
      return res.status(404).json({ error: "Cliente não encontrado." });
    }
    
    res.status(200).json({ message: "Cliente deletado com sucesso." });
  } catch (error) {
    console.error("Erro ao deletar cliente:", error);
    res.status(500).json({ error: "Erro ao deletar cliente." });
  }
};

// Certifique-se de exportar todas as funções
module.exports = exports;