const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

// ✅ CORRIGIDO: Agora retorna o ID também
exports.getBrands = async (req, res) => {
  try {
    const brands = await sql`SELECT id, name, commission_rate FROM brands ORDER BY name ASC`;
    res.status(200).json(brands);
  } catch (error) {
    console.error("Erro ao buscar marcas:", error);
    res.status(500).json({ error: "Erro ao buscar marcas." });
  }
};

// Função para criar marca
exports.createBrand = async (req, res) => {
  const { name, commission_rate = 0 } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: "O nome da marca é obrigatório." });
  }
  
  try {
    await sql`
      INSERT INTO brands (name, commission_rate) 
      VALUES (${name}, ${commission_rate}) 
      ON CONFLICT (name) DO NOTHING
    `;
    res.status(201).json({ message: "Marca criada com sucesso!" });
  } catch (error) {
    console.error("Erro ao criar marca:", error);
    res.status(500).json({ error: "Erro ao criar marca." });
  }
};

exports.updateBrand = async (req, res) => {
  const { oldName } = req.params;
  const { name, commission_rate } = req.body;
  
  try {
    await sql`
      UPDATE brands 
      SET name = ${name}, commission_rate = ${commission_rate}
      WHERE name = ${oldName}
    `;
    res.status(200).json({ message: "Marca atualizada com sucesso!" });
  } catch (error) {
    console.error("Erro ao atualizar marca:", error);
    res.status(500).json({ error: "Erro ao atualizar marca." });
  }
};

// Função para deletar marca
exports.deleteBrand = async (req, res) => {
  const { id } = req.params;

  try {
    // Buscar o nome da marca pelo ID
    const brand = await sql`
      SELECT name FROM brands WHERE id = ${id}
    `;

    if (brand.length === 0) {
      return res.status(404).json({ error: "Marca não encontrada." });
    }

    const brandName = brand[0].name;

    // Verificar se existem produtos com esta marca
    const productsWithBrand = await sql`
      SELECT COUNT(*) as count FROM products WHERE brand = ${brandName}
    `;

    if (parseInt(productsWithBrand[0].count) > 0) {
      return res.status(400).json({
        error:
          "Não é possível excluir a marca. Existem produtos associados a ela.",
      });
    }

    // Deletar a marca pelo ID
    const result = await sql`
      DELETE FROM brands 
      WHERE id = ${id}
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