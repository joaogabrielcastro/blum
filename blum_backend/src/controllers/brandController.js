const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

// Função para buscar marcas
exports.getBrands = async (req, res) => {
  try {
    const brands = await sql`SELECT name FROM brands ORDER BY name ASC`;
    res.status(200).json(brands.map((brand) => brand.name));
  } catch (error) {
    console.error("Erro ao buscar marcas:", error);
    res.status(500).json({ error: "Erro ao buscar marcas." });
  }
};

// Função para criar marca
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

// Função para deletar marca - VERIFIQUE SE ESTÁ PRESENTE!
exports.deleteBrand = async (req, res) => {
  const { name } = req.params;

  try {
    // Primeiro verifique se existem produtos com esta marca
    const productsWithBrand = await sql`
      SELECT COUNT(*) as count FROM products WHERE brand = ${name}
    `;

    if (parseInt(productsWithBrand[0].count) > 0) {
      return res.status(400).json({
        error:
          "Não é possível excluir a marca. Existem produtos associados a ela.",
      });
    }

    // Depois delete a marca
    const result = await sql`
      DELETE FROM brands 
      WHERE name = ${name}
      RETURNING *
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: "Marca não encontrada." });
    }

    res.status(200).json({ message: "Marca deletada com sucesso!" });
  } catch (error) {
    console.error("Erro ao deletar marca:", error);
    res.status(500).json({ error: "Erro ao deletar marca." });
  }
};

module.exports = exports;
