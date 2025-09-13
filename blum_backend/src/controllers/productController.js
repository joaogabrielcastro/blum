const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

exports.getAll = async (req, res) => {
  try {
    const { brand } = req.query;
    let products;
    if (brand && brand !== "all") {
      // CORREÇÃO: Usa 'createdat' em minúsculas
      products =
        await sql`SELECT * FROM products WHERE brand = ${brand} ORDER BY createdat DESC`;
    } else {
      products = await sql`SELECT * FROM products ORDER BY createdat DESC`;
    }
    res.status(200).json(products);
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    res.status(500).json({ error: "Erro ao buscar produtos." });
  }
};

exports.create = async (req, res) => {
  const { name, productcode, price, stock, brand, minstock } = req.body;

  if (!name || price === undefined || stock === undefined) {
    return res
      .status(400)
      .json({ error: "Nome, preço e estoque são obrigatórios." });
  }

  try {
    const result = await sql(
      `INSERT INTO products (name, productcode, price, stock, brand, minstock, createdat)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [name, productcode, price, stock, brand, minstock || 0]
    );
    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    res.status(500).json({ error: "Erro ao criar produto." });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await sql`DELETE FROM products WHERE id = ${id} RETURNING *`;
    if (result.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }
    res.status(204).end(); // Sucesso, sem conteúdo para retornar
  } catch (error) {
    console.error(`Erro ao excluir produto ${id}:`, error);
    res.status(500).json({ error: 'Erro ao excluir produto.' });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, productcode, price, stock, brand, minstock } = req.body;

  if (!name || price === undefined || stock === undefined) {
    return res
      .status(400)
      .json({ error: "Nome, preço e estoque são obrigatórios." });
  }

  try {
    const result = await sql(
      `UPDATE products 
       SET name = $1, productcode = $2, price = $3, stock = $4, brand = $5, minstock = $6
       WHERE id = $7
       RETURNING *`,
      [name, productcode, price, stock, brand, minstock || 0, id]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }
    res.status(200).json(result[0]);
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    res.status(500).json({ error: "Erro ao atualizar produto." });
  }
};

exports.updateStock = async (id, quantity) => {
  try {
    const product = (await sql`SELECT * FROM products WHERE id = ${id}`)[0];
    if (!product) throw new Error("Produto não encontrado");
    const newStock = product.stock - quantity;
    await sql`UPDATE products SET stock = ${newStock} WHERE id = ${id}`;
    return newStock;
  } catch (error) {
    console.error("Erro ao atualizar estoque:", error);
    throw error;
  }
};
