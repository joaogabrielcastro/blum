const { sql } = require("../config/database");
const productRepository = require("../repositories/productRepository");

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
      tenantId = 1,
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
        WHERE subcode = ${subcode} AND tenant_id = ${tenantId} ${bc}
        ORDER BY createdat DESC
        LIMIT ${limit} OFFSET ${offset}`;
      countQuery =
        await sql`SELECT COUNT(*) as count FROM products WHERE subcode = ${subcode} AND tenant_id = ${tenantId} ${bc}`;
    }
    // Busca por PRODUCTCODE
    else if (productcode) {
      query = await sql`
        SELECT * FROM products
        WHERE productcode = ${productcode} AND tenant_id = ${tenantId} ${bc}
        ORDER BY createdat DESC
        LIMIT ${limit} OFFSET ${offset}`;
      countQuery = await sql`
        SELECT COUNT(*) as count FROM products WHERE productcode = ${productcode} AND tenant_id = ${tenantId} ${bc}`;
    }
    // Busca por NOME (aproximada)
    else if (name) {
      query = await sql`
        SELECT * FROM products
        WHERE name ILIKE ${"%" + name + "%"} AND tenant_id = ${tenantId} ${bc}
        ORDER BY createdat DESC
        LIMIT ${limit} OFFSET ${offset}`;
      countQuery = await sql`
        SELECT COUNT(*) as count FROM products WHERE name ILIKE ${"%" + name + "%"} AND tenant_id = ${tenantId} ${bc}`;
    }
    // Representada + termo livre (várias palavras, sem acento — ver findAllByBrandFlexibleQ)
    else if (brand && brand !== "all" && qTrim) {
      const flex = await this.findAllByBrandFlexibleQ({
        brand,
        tokens: qTokens.length ? qTokens : [qTrim],
        limit,
        offset,
        allowedBrandNames,
        tenantId,
      });
      query = flex.data;
      countQuery = flex.countRows;
    }
    // Busca por BRAND
    else if (brand && brand !== "all") {
      query = await sql`
        SELECT * FROM products
        WHERE brand = ${brand} AND tenant_id = ${tenantId} ${bc}
        ORDER BY createdat DESC
        LIMIT ${limit} OFFSET ${offset}`;
      countQuery =
        await sql`SELECT COUNT(*) as count FROM products WHERE brand = ${brand} AND tenant_id = ${tenantId} ${bc}`;
    }
    // Busca TODOS
    else {
      query = await sql`
        SELECT * FROM products
        WHERE tenant_id = ${tenantId} ${bc}
        ORDER BY createdat DESC
        LIMIT ${limit} OFFSET ${offset}`;
      countQuery = await sql`SELECT COUNT(*) as count FROM products WHERE tenant_id = ${tenantId} ${bc}`;
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
    tenantId = 1,
  }) {
    const run = async (tokenSqlFn) => {
      const tw = tokenSqlFn(tokens, 2);
      const vals = [brand, ...tokens];
      let w = `brand = $1 AND tenant_id = ${tenantId} AND (${tw.sql})`;
      let nextP = tw.nextParam;
      if (allowedBrandNames && allowedBrandNames.length) {
        vals.push(allowedBrandNames);
        w += ` AND brand = ANY($${nextP})`;
        nextP++;
      }
      const countSql = `SELECT COUNT(*)::bigint as count FROM products WHERE ${w}`;
      const countRes = { rows: await productRepository.queryRaw(countSql, vals) };
      const limP = nextP;
      const offP = nextP + 1;
      const dataSql = `SELECT * FROM products WHERE ${w} ORDER BY createdat DESC LIMIT $${limP} OFFSET $${offP}`;
      const dataRes = {
        rows: await productRepository.queryRaw(dataSql, [...vals, limit, offset]),
      };
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
  async search(searchTerm, limit = 20, allowedBrandNames = null, tenantId = 1) {
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
      let w = `(tenant_id = ${tenantId}) AND (${t.sql})`;
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
      const r = { rows: await productRepository.queryRaw(sqlText, [...v, limit]) };
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
  async findById(id, tenantId = 1) {
    const products = await sql`
      SELECT * FROM products WHERE id = ${id} AND tenant_id = ${tenantId}
    `;

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
    const { name, productcode, subcode, price, stock, brand, minstock, tenant_id } =
      productData;
    const tenantId = tenant_id || 1;

    if (!name || price === undefined || stock === undefined) {
      throw new Error("Nome, preço e estoque são obrigatórios");
    }

    // Verifica se já existe produto com o mesmo código
    if (productcode) {
      const existing = await sql`
        SELECT id, name FROM products
        WHERE productcode = ${productcode} AND tenant_id = ${tenantId}
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
        WHERE subcode = ${subcode} AND tenant_id = ${tenantId}
      `;

      if (existingSubcode.length > 0) {
        throw new Error(
          `Já existe um produto com o subcódigo "${subcode}": ${existingSubcode[0].name}`,
        );
      }
    }

    return productRepository.insertProduct({
      name,
      productcode,
      subcode,
      price,
      stock,
      brand,
      minstock,
      tenant_id: tenantId,
    });
  }

  /**
   * Atualiza um produto
   * @param {number} id - ID do produto
   * @param {Object} productData - Dados atualizados
   * @returns {Promise<Object>} Produto atualizado
   */
  async update(id, productData) {
    const { name, productcode, subcode, price, stock, brand, minstock, tenant_id } =
      productData;
    const tenantId = tenant_id || 1;

    if (!name || price === undefined || stock === undefined) {
      throw new Error("Nome, preço e estoque são obrigatórios");
    }

    // Verifica se outro produto já usa o mesmo código
    if (productcode) {
      const existing = await sql`
        SELECT id, name FROM products
        WHERE productcode = ${productcode} AND id != ${id} AND tenant_id = ${tenantId}
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
        WHERE subcode = ${subcode} AND id != ${id} AND tenant_id = ${tenantId}
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
       WHERE id = $8 AND tenant_id = $9
       RETURNING *`,
      [name, productcode, subcode || "", price, stock, brand, minstock || 0, id, tenantId],
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
  async delete(id, tenantId = 1) {
    const result =
      await sql`DELETE FROM products WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING *`;

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
  async updateStock(productId, quantity, tenantId = 1) {
    const product = await this.findById(productId, tenantId);

    const newStock = product.stock - quantity;

    if (newStock < 0) {
      throw new Error("Estoque insuficiente");
    }

    await sql`UPDATE products SET stock = ${newStock} WHERE id = ${productId} AND tenant_id = ${tenantId}`;

    return newStock;
  }

  /**
   * Verifica se produto tem estoque suficiente
   * @param {number} productId - ID do produto
   * @param {number} quantity - Quantidade desejada
   * @returns {Promise<boolean>}
   */
  async hasStock(productId, quantity, tenantId = 1) {
    const product = await this.findById(productId, tenantId);
    return product.stock >= quantity;
  }

  /**
   * Lista produtos com estoque baixo
   * @returns {Promise<Array>} Produtos com estoque baixo
   */
  async findLowStock(tenantId = 1) {
    return sql`
      SELECT * FROM products
      WHERE stock <= minstock AND tenant_id = ${tenantId}
      ORDER BY stock ASC
    `;
  }
}

module.exports = new ProductService();
