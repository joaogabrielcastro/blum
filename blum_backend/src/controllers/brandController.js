const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

exports.getBrands = async (req, res) => {
  try {
    const brands = await sql`SELECT name FROM brands ORDER BY name ASC`;
    res.status(200).json(brands.map(brand => brand.name));
  } catch (error) {
    console.error("Erro ao buscar marcas:", error);
    res.status(500).json({ error: "Erro ao buscar marcas." });
  }
};

exports.createBrand = async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "O nome da marca é obrigatório." });
  }
  try {
    await sql`INSERT INTO brands (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
    res.status(201).json({ message: "Marca criada com sucesso!" });
  } catch (error) {
    console.error("Erro ao criar marca:", error);
    res.status(500).json({ error: "Erro ao criar marca." });
  }
};
