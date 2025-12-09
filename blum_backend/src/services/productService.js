const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

class ProductService {
  /**
   * Busca produtos com filtros opcionais e paginação
   * @param {Object} filters - Filtros de busca (brand, productcode, subcode, name, page, limit)
   * @returns {Promise<Object>} Objeto com data, total, page, totalPages
   */
  async findAll(filters = {}) {
    const { brand, productcode, subcode, name, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;
    
    let query;
    let countQuery;
    
    // Busca por SUBCODE (prioridade máxima)
    if (subcode) {
      query = await sql`SELECT * FROM products WHERE subcode = ${subcode} ORDER BY createdat DESC LIMIT ${limit} OFFSET ${offset}`;
      countQuery = await sql`SELECT COUNT(*) FROM products WHERE subcode = ${subcode}`;
    }
    // Busca por PRODUCTCODE
    else if (productcode) {
      query = await sql`SELECT * FROM products WHERE productcode = ${productcode} ORDER BY createdat DESC LIMIT ${limit} OFFSET ${offset}`;
      countQuery = await sql`SELECT COUNT(*) FROM products WHERE productcode = ${productcode}`;
    }
    // Busca por NOME (aproximada)
    else if (name) {
      query = await sql`SELECT * FROM products WHERE name ILIKE ${'%' + name + '%'} ORDER BY createdat DESC LIMIT ${limit} OFFSET ${offset}`;
      countQuery = await sql`SELECT COUNT(*) FROM products WHERE name ILIKE ${'%' + name + '%'}`;
    }
    // Busca por BRAND
    else if (brand && brand !== "all") {
      query = await sql`SELECT * FROM products WHERE brand = ${brand} ORDER BY createdat DESC LIMIT ${limit} OFFSET ${offset}`;
      countQuery = await sql`SELECT COUNT(*) FROM products WHERE brand = ${brand}`;
    }
    // Busca TODOS
    else {
      query = await sql`SELECT * FROM products ORDER BY createdat DESC LIMIT ${limit} OFFSET ${offset}`;
      countQuery = await sql`SELECT COUNT(*) FROM products`;
    }
    
    const total = parseInt(countQuery[0].count);
    const totalPages = Math.ceil(total / limit);
    
    return {
      data: query,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      }
    };
  }

  /**
   * Busca produtos por termo (múltiplos campos)
   * @param {string} searchTerm - Termo de busca
   * @param {number} limit - Limite de resultados
   * @returns {Promise<Array>} Lista de produtos
   */
  async search(searchTerm, limit = 20) {
    if (!searchTerm || searchTerm.trim() === '') {
      throw new Error('Termo de busca é obrigatório');
    }

    return await sql`
      SELECT * FROM products 
      WHERE 
        name ILIKE ${'%' + searchTerm + '%'} OR
        productcode ILIKE ${'%' + searchTerm + '%'} OR
        subcode ILIKE ${'%' + searchTerm + '%'}
      ORDER BY 
        CASE 
          WHEN name ILIKE ${searchTerm + '%'} THEN 1
          WHEN productcode ILIKE ${searchTerm + '%'} THEN 2
          WHEN subcode ILIKE ${searchTerm + '%'} THEN 3
          ELSE 4
        END,
        name
      LIMIT ${limit}
    `;
  }

  /**
   * Busca produto por ID
   * @param {number} id - ID do produto
   * @returns {Promise<Object>} Produto encontrado
   */
  async findById(id) {
    const products = await sql`SELECT * FROM products WHERE id = ${id}`;
    
    if (products.length === 0) {
      throw new Error('Produto não encontrado');
    }
    
    return products[0];
  }

  /**
   * Cria um novo produto
   * @param {Object} productData - Dados do produto
   * @returns {Promise<Object>} Produto criado
   */
  async create(productData) {
    const { name, productcode, subcode, price, stock, brand, minstock } = productData;

    if (!name || price === undefined || stock === undefined) {
      throw new Error("Nome, preço e estoque são obrigatórios");
    }

    // Verifica se já existe produto com o mesmo código
    if (productcode) {
      const existing = await sql`
        SELECT id, name FROM products 
        WHERE productcode = ${productcode}
      `;
      
      if (existing.length > 0) {
        throw new Error(`Já existe um produto com o código "${productcode}": ${existing[0].name}`);
      }
    }

    // Verifica se já existe produto com o mesmo subcódigo (se fornecido)
    if (subcode && subcode.trim() !== '') {
      const existingSubcode = await sql`
        SELECT id, name FROM products 
        WHERE subcode = ${subcode}
      `;
      
      if (existingSubcode.length > 0) {
        throw new Error(`Já existe um produto com o subcódigo "${subcode}": ${existingSubcode[0].name}`);
      }
    }

    const result = await sql(
      `INSERT INTO products (name, productcode, subcode, price, stock, brand, minstock, createdat)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [name, productcode, subcode || '', price, stock, brand, minstock || 0]
    );
    
    return result[0];
  }

  /**
   * Atualiza um produto
   * @param {number} id - ID do produto
   * @param {Object} productData - Dados atualizados
   * @returns {Promise<Object>} Produto atualizado
   */
  async update(id, productData) {
    const { name, productcode, subcode, price, stock, brand, minstock } = productData;

    if (!name || price === undefined || stock === undefined) {
      throw new Error("Nome, preço e estoque são obrigatórios");
    }

    // Verifica se outro produto já usa o mesmo código
    if (productcode) {
      const existing = await sql`
        SELECT id, name FROM products 
        WHERE productcode = ${productcode} AND id != ${id}
      `;
      
      if (existing.length > 0) {
        throw new Error(`O código "${productcode}" já está em uso pelo produto: ${existing[0].name}`);
      }
    }

    // Verifica se outro produto já usa o mesmo subcódigo
    if (subcode && subcode.trim() !== '') {
      const existingSubcode = await sql`
        SELECT id, name FROM products 
        WHERE subcode = ${subcode} AND id != ${id}
      `;
      
      if (existingSubcode.length > 0) {
        throw new Error(`O subcódigo "${subcode}" já está em uso pelo produto: ${existingSubcode[0].name}`);
      }
    }

    const result = await sql(
      `UPDATE products 
       SET name = $1, productcode = $2, subcode = $3, price = $4, stock = $5, brand = $6, minstock = $7
       WHERE id = $8
       RETURNING *`,
      [name, productcode, subcode || '', price, stock, brand, minstock || 0, id]
    );

    if (result.length === 0) {
      throw new Error("Produto não encontrado");
    }
    
    return result[0];
  }

  /**
   * Deleta um produto
   * @param {number} id - ID do produto
   * @returns {Promise<void>}
   */
  async delete(id) {
    const result = await sql`DELETE FROM products WHERE id = ${id} RETURNING *`;
    
    if (result.length === 0) {
      throw new Error("Produto não encontrado");
    }
  }

  /**
   * Atualiza estoque de um produto
   * @param {number} productId - ID do produto
   * @param {number} quantity - Quantidade a subtrair
   * @returns {Promise<number>} Novo estoque
   */
  async updateStock(productId, quantity) {
    const product = await this.findById(productId);
    
    const newStock = product.stock - quantity;
    
    if (newStock < 0) {
      throw new Error("Estoque insuficiente");
    }

    await sql`UPDATE products SET stock = ${newStock} WHERE id = ${productId}`;
    
    return newStock;
  }

  /**
   * Verifica se produto tem estoque suficiente
   * @param {number} productId - ID do produto
   * @param {number} quantity - Quantidade desejada
   * @returns {Promise<boolean>}
   */
  async hasStock(productId, quantity) {
    const product = await this.findById(productId);
    return product.stock >= quantity;
  }

  /**
   * Lista produtos com estoque baixo
   * @returns {Promise<Array>} Produtos com estoque baixo
   */
  async findLowStock() {
    return await sql`
      SELECT * FROM products 
      WHERE stock <= minstock 
      ORDER BY stock ASC
    `;
  }
}

module.exports = new ProductService();
