const { sql, pool } = require("../config/database");

/** Restrição opcional por representada (vendedor). Fragmento vazio = sem filtro extra. */
function brandSql(names) {
  if (!Array.isArray(names) || names.length === 0) {
    return { __isSqlFragment: true, text: "", values: [] };
  }
  return {
    __isSqlFragment: true,
    text: " AND brand = ANY($1)",
    values: [names],
  };
}

class ProductService {
  /**
   * Busca produtos com filtros opcionais e paginação
   * @param {Object} filters - Filtros de busca (brand, productcode, subcode, name, page, limit, allowedBrandNames)
   * @returns {Promise<Object>} Objeto com data, total, page, totalPages
   */
  async findAll(filters = {}) {
    const {
      brand,
      productcode,
      subcode,
      name,
      q,
      page = 1,
      limit = 50,
      allowedBrandNames,
    } = filters;
    const offset = (page - 1) * limit;
    const bc = brandSql(allowedBrandNames);

    let query;
    let countQuery;

    const qTrim = q != null && String(q).trim() !== "" ? String(q).trim() : "";
    const searchPattern = qTrim ? `%${qTrim}%` : "";
    const qTokens = qTrim
      ? qTrim.split(/\s+/).map((t) => t.trim()).filter(Boolean)
      : [];

    // Busca por SUBCODE (prioridade máxima)
    if (subcode) {
      query = await sql`
        SELECT * FROM products
        WHERE subcode = ${subcode} ${bc}
        ORDER BY createdat DESC
        LIMIT ${limit} OFFSET ${offset}`;
      countQuery =
        await sql`SELECT COUNT(*) as count FROM products WHERE subcode = ${subcode} ${bc}`;
    }
    // Busca por PRODUCTCODE
    else if (productcode) {
      query = await sql`
        SELECT * FROM products
        WHERE productcode = ${productcode} ${bc}
        ORDER BY createdat DESC
        LIMIT ${limit} OFFSET ${offset}`;
      countQuery = await sql`
        SELECT COUNT(*) as count FROM products WHERE productcode = ${productcode} ${bc}`;
    }
    // Busca por NOME (aproximada)
    else if (name) {
      query = await sql`
        SELECT * FROM products
        WHERE name ILIKE ${"%" + name + "%"} ${bc}
        ORDER BY createdat DESC
        LIMIT ${limit} OFFSET ${offset}`;
      countQuery = await sql`
        SELECT COUNT(*) as count FROM products WHERE name ILIKE ${"%" + name + "%"} ${bc}`;
    }
    // Representada + termo livre (várias palavras, sem acento — ver findAllByBrandFlexibleQ)
    else if (brand && brand !== "all" && qTrim) {
      const flex = await this.findAllByBrandFlexibleQ({
        brand,
        tokens: qTokens.length ? qTokens : [qTrim],
        limit,
        offset,
        allowedBrandNames,
      });
      query = flex.data;
      countQuery = flex.countRows;
    }
    // Busca por BRAND
    else if (brand && brand !== "all") {
      query = await sql`
        SELECT * FROM products
        WHERE brand = ${brand} ${bc}
        ORDER BY createdat DESC
        LIMIT ${limit} OFFSET ${offset}`;
      countQuery =
        await sql`SELECT COUNT(*) as count FROM products WHERE brand = ${brand} ${bc}`;
    }
    // Busca TODOS
    else {
      query = await sql`
        SELECT * FROM products
        WHERE 1=1 ${bc}
        ORDER BY createdat DESC
        LIMIT ${limit} OFFSET ${offset}`;
      countQuery = await sql`SELECT COUNT(*) as count FROM products WHERE 1=1 ${bc}`;
    }

    const total = parseInt(countQuery[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    return {
      data: query,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
      },
    };
  }

  /**
   * WHERE por tokens (cada token em nome OU código OU subcódigo), com unaccent.
   */
  _tokenWhereUnaccent(tokens, paramStart) {
    const parts = [];
    let p = paramStart;
    for (let i = 0; i < tokens.length; i++) {
      parts.push(`(
        unaccent(lower(COALESCE(name::text, ''))) LIKE '%' || unaccent(lower($${p}::text)) || '%'
        OR unaccent(lower(COALESCE(productcode::text, ''))) LIKE '%' || unaccent(lower($${p}::text)) || '%'
        OR unaccent(lower(COALESCE(subcode::text, ''))) LIKE '%' || unaccent(lower($${p}::text)) || '%'
      )`);
      p++;
    }
    return { sql: parts.join(" AND "), nextParam: p };
  }

  /** Fallback sem extensão unaccent (acentos podem não bater). */
  _tokenWhereIlike(tokens, paramStart) {
    const parts = [];
    let p = paramStart;
    for (let i = 0; i < tokens.length; i++) {
      parts.push(`(
        name ILIKE '%' || $${p}::text || '%'
        OR productcode ILIKE '%' || $${p}::text || '%'
        OR subcode ILIKE '%' || $${p}::text || '%'
      )`);
      p++;
    }
    return { sql: parts.join(" AND "), nextParam: p };
  }

  async findAllByBrandFlexibleQ({
    brand,
    tokens,
    limit,
    offset,
    allowedBrandNames,
  }) {
    const run = async (tokenSqlFn) => {
      const tw = tokenSqlFn(tokens, 2);
      const vals = [brand, ...tokens];
      let w = `brand = $1 AND (${tw.sql})`;
      let nextP = tw.nextParam;
      if (allowedBrandNames && allowedBrandNames.length) {
        vals.push(allowedBrandNames);
        w += ` AND brand = ANY($${nextP})`;
        nextP++;
      }
      const countSql = `SELECT COUNT(*)::bigint as count FROM products WHERE ${w}`;
      const countRes = await pool.query(countSql, vals);
      const limP = nextP;
      const offP = nextP + 1;
      const dataSql = `SELECT * FROM products WHERE ${w} ORDER BY createdat DESC LIMIT $${limP} OFFSET $${offP}`;
      const dataRes = await pool.query(dataSql, [...vals, limit, offset]);
      return {
        data: dataRes.rows,
        countRows: [{ count: String(countRes.rows[0].count) }],
      };
    };

    try {
      return await run((t, s) => this._tokenWhereUnaccent(t, s));
    } catch (e) {
      const msg = String(e.message || "");
      if (
        msg.includes("unaccent") ||
        msg.includes("function unaccent") ||
        e.code === "42883"
      ) {
        return await run((t, s) => this._tokenWhereIlike(t, s));
      }
      throw e;
    }
  }

  /**
   * Busca produtos por termo (múltiplos campos)
   * @param {string} searchTerm - Termo de busca
   * @param {number} limit - Limite de resultados
   * @returns {Promise<Array>} Lista de produtos
   */
  async search(searchTerm, limit = 20, allowedBrandNames = null) {
    if (!searchTerm || searchTerm.trim() === "") {
      throw new Error("Termo de busca é obrigatório");
    }

    const tokens = searchTerm
      .trim()
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (!tokens.length) {
      throw new Error("Termo de busca é obrigatório");
    }

    const trySearch = async (tokenFn) => {
      const t = tokenFn(tokens, 1);
      let w = `(${t.sql})`;
      const v = [...tokens];
      let np = t.nextParam;
      if (allowedBrandNames && allowedBrandNames.length) {
        v.push(allowedBrandNames);
        w += ` AND brand = ANY($${np})`;
        np++;
      }
      const sqlText = `
        SELECT * FROM products
        WHERE ${w}
        ORDER BY name
        LIMIT $${np}
      `;
      const r = await pool.query(sqlText, [...v, limit]);
      return r.rows;
    };

    try {
      return await trySearch((tok, start) => this._tokenWhereUnaccent(tok, start));
    } catch (e) {
      const msg = String(e.message || "");
      if (
        msg.includes("unaccent") ||
        msg.includes("function unaccent") ||
        e.code === "42883"
      ) {
        return await trySearch((tok, start) => this._tokenWhereIlike(tok, start));
      }
      throw e;
    }
  }

  /**
   * Busca produto por ID
   * @param {number} id - ID do produto
   * @returns {Promise<Object>} Produto encontrado
   */
  async findById(id) {
    const products = await sql`SELECT * FROM products WHERE id = ${id}`;

    if (products.length === 0) {
      throw new Error("Produto não encontrado");
    }

    return products[0];
  }

  /**
   * Cria um novo produto
   * @param {Object} productData - Dados do produto
   * @returns {Promise<Object>} Produto criado
   */
  async create(productData) {
    const { name, productcode, subcode, price, stock, brand, minstock } =
      productData;

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
        throw new Error(
          `Já existe um produto com o código "${productcode}": ${existing[0].name}`,
        );
      }
    }

    // Verifica se já existe produto com o mesmo subcódigo (se fornecido)
    if (subcode && subcode.trim() !== "") {
      const existingSubcode = await sql`
        SELECT id, name FROM products 
        WHERE subcode = ${subcode}
      `;

      if (existingSubcode.length > 0) {
        throw new Error(
          `Já existe um produto com o subcódigo "${subcode}": ${existingSubcode[0].name}`,
        );
      }
    }

    const result = await sql(
      `INSERT INTO products (name, productcode, subcode, price, stock, brand, minstock, createdat)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [name, productcode, subcode || "", price, stock, brand, minstock || 0],
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
    const { name, productcode, subcode, price, stock, brand, minstock } =
      productData;

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
        throw new Error(
          `O código "${productcode}" já está em uso pelo produto: ${existing[0].name}`,
        );
      }
    }

    // Verifica se outro produto já usa o mesmo subcódigo
    if (subcode && subcode.trim() !== "") {
      const existingSubcode = await sql`
        SELECT id, name FROM products 
        WHERE subcode = ${subcode} AND id != ${id}
      `;

      if (existingSubcode.length > 0) {
        throw new Error(
          `O subcódigo "${subcode}" já está em uso pelo produto: ${existingSubcode[0].name}`,
        );
      }
    }

    const result = await sql(
      `UPDATE products 
       SET name = $1, productcode = $2, subcode = $3, price = $4, stock = $5, brand = $6, minstock = $7
       WHERE id = $8
       RETURNING *`,
      [
        name,
        productcode,
        subcode || "",
        price,
        stock,
        brand,
        minstock || 0,
        id,
      ],
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
