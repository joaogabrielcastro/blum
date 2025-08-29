const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

exports.getAll = async (req, res) => {
  try {
    const clients = await sql`SELECT * FROM clients ORDER BY "createdAt" DESC`;
    res.status(200).json(clients);
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    res.status(500).json({ error: 'Erro ao buscar clientes.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { companyName, contactPerson, phone, region, cnpj } = req.body;
    const result = await sql`
      INSERT INTO clients ("companyName", "contactPerson", phone, region, cnpj)
      VALUES (${companyName}, ${contactPerson}, ${phone}, ${region}, ${cnpj})
      RETURNING *;
    `;
    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Erro ao criar cliente:", error);
    res.status(500).json({ error: 'Erro ao criar cliente.' });
  }
};

module.exports = exports;