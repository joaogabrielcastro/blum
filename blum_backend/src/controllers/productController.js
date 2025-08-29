const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

exports.getAll = async (req, res) => {
  try {
    const { brand } = req.query;
    let products;
    if (brand && brand !== 'all') {
      products = await sql`SELECT * FROM products WHERE brand = ${brand} ORDER BY "createdAt" DESC`;
    } else {
      products = await sql`SELECT * FROM products ORDER BY "createdAt" DESC`;
    }
    res.status(200).json(products);
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    res.status(500).json({ error: 'Erro ao buscar produtos.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, productCode, price, stock, brand } = req.body;
    const result = await sql`
      INSERT INTO products (name, "productCode", price, stock, brand)
      VALUES (${name}, ${productCode}, ${price}, ${stock}, ${brand})
      RETURNING *;
    `;
    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    res.status(500).json({ error: 'Erro ao criar produto.' });
  }
};

exports.updateStock = async (id, quantity) => {
  try {
      const product = (await sql`SELECT * FROM products WHERE id = ${id}`)[0];
      if (!product) throw new Error('Produto não encontrado');
      const newStock = product.stock - quantity;
      await sql`UPDATE products SET stock = ${newStock} WHERE id = ${id}`;
      return newStock;
  } catch (error) {
      console.error("Erro ao atualizar estoque:", error);
      throw error;
  }
};

module.exports = exports;