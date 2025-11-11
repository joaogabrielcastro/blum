const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

exports.getAll = async (req, res) => {
  try {
    const { brand, productcode, subcode, name } = req.query;
    
    let products;
    
    // ✅ CORREÇÃO: Busca por SUBCODE (prioridade máxima)
    if (subcode) {
      console.log(`🔍 Buscando produto por subcódigo: ${subcode}`);
      products = await sql`SELECT * FROM products WHERE subcode = ${subcode} ORDER BY createdat DESC`;
    }
    // Busca por PRODUCTCODE
    else if (productcode) {
      products = await sql`SELECT * FROM products WHERE productcode = ${productcode} ORDER BY createdat DESC`;
    }
    // Busca por NOME (aproximada)
    else if (name) {
      products = await sql`SELECT * FROM products WHERE name ILIKE ${'%' + name + '%'} ORDER BY createdat DESC`;
    }
    // Busca por BRAND
    else if (brand && brand !== "all") {
      products = await sql`SELECT * FROM products WHERE brand = ${brand} ORDER BY createdat DESC`;
    }
    // Busca TODOS
    else {
      products = await sql`SELECT * FROM products ORDER BY createdat DESC`;
    }
    
    res.status(200).json(products);
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    res.status(500).json({ error: "Erro ao buscar produtos." });
  }
};

// ✅ ADICIONE esta função no productsController.js
exports.search = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({ error: 'Termo de busca é obrigatório' });
    }

    console.log(`🔍 Buscando produtos por: "${q}"`);

    // ✅ BUSCA EM MÚLTIPLOS CAMPOS: nome, productcode, subcode
    const products = await sql`
      SELECT * FROM products 
      WHERE 
        name ILIKE ${'%' + q + '%'} OR
        productcode ILIKE ${'%' + q + '%'} OR
        subcode ILIKE ${'%' + q + '%'}
      ORDER BY 
        CASE 
          WHEN name ILIKE ${q + '%'} THEN 1
          WHEN productcode ILIKE ${q + '%'} THEN 2
          WHEN subcode ILIKE ${q + '%'} THEN 3
          ELSE 4
        END,
        name
      LIMIT 20
    `;

    console.log(`✅ ${products.length} produtos encontrados`);
    
    res.status(200).json(products);
  } catch (error) {
    console.error('❌ Erro na busca de produtos:', error);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
};

exports.create = async (req, res) => {
  // ✅ CORREÇÃO: Adicionar subcode
  const { name, productcode, subcode, price, stock, brand, minstock } = req.body;

  if (!name || price === undefined || stock === undefined) {
    return res
      .status(400)
      .json({ error: "Nome, preço e estoque são obrigatórios." });
  }

  try {
    // ✅ CORREÇÃO: Incluir subcode no INSERT
    const result = await sql(
      `INSERT INTO products (name, productcode, subcode, price, stock, brand, minstock, createdat)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [name, productcode, subcode || '', price, stock, brand, minstock || 0]
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
    res.status(204).end();
  } catch (error) {
    console.error(`Erro ao excluir produto ${id}:`, error);
    res.status(500).json({ error: "Erro ao excluir produto." });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  // ✅ CORREÇÃO: Adicionar subcode
  const { name, productcode, subcode, price, stock, brand, minstock } = req.body;

  if (!name || price === undefined || stock === undefined) {
    return res
      .status(400)
      .json({ error: "Nome, preço e estoque são obrigatórios." });
  }

  try {
    // ✅ CORREÇÃO: Incluir subcode no UPDATE
    const result = await sql(
      `UPDATE products 
       SET name = $1, productcode = $2, subcode = $3, price = $4, stock = $5, brand = $6, minstock = $7
       WHERE id = $8
       RETURNING *`,
      [name, productcode, subcode || '', price, stock, brand, minstock || 0, id]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }
    res.status(200).json(result[0]);
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    res.status(500).json({ 
      error: "Erro ao atualizar produto.",
      details: error.message
    });
  }
};

exports.updateStock = async (productId, quantity) => {
  try {
    const product = (
      await sql`SELECT * FROM products WHERE id = ${productId}`
    )[0];
    if (!product) throw new Error("Produto não encontrado");

    const newStock = product.stock - quantity;
    if (newStock < 0) throw new Error("Estoque insuficiente");

    await sql`UPDATE products SET stock = ${newStock} WHERE id = ${productId}`;
    return newStock;
  } catch (error) {
    console.error("Erro ao atualizar estoque:", error);
    throw error;
  }
};