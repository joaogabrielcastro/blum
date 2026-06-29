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

async function resolveBrandName(brandId, tenantId = 1) {
  const id = parseInt(brandId, 10);
  if (!Number.isInteger(id) || id <= 0) return "";
  const rows = await sql`
    SELECT name FROM brands WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
  `;
  return rows[0]?.name || "";
}

async function resolveBrandId(brandName, tenantId = 1) {
  const name = String(brandName || "").trim();
  if (!name) return null;
  const rows = await sql`
    SELECT id FROM brands
    WHERE name = ${name} AND tenant_id = ${tenantId}
    LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

class ProductService {
  async resolveBrandName(brandId, tenantId = 1) {
    return resolveBrandName(brandId, tenantId);
  }

  /**
   * Busca exata por código na representada (nome ou brand_id).
   */
  async findByProductCodeInBrand({
    productcode,
    brand,
    brandId,
    tenantId = 1,
    allowedBrandNames = null,
  }) {
    const code = String(productcode ?? "").trim();
    if (!code) return null;

    let brandName = brand ? String(brand).trim() : "";
    let brandIdNum =
      brandId != null && brandId !== "" ? parseInt(brandId, 10) : null;

    if (Number.isInteger(brandIdNum) && brandIdNum > 0 && !brandName) {
      const rows = await sql`
        SELECT name FROM brands
        WHERE id = ${brandIdNum} AND tenant_id = ${tenantId}
        LIMIT 1
      `;
      brandName = rows[0]?.name || "";
    }
    if (!Number.isInteger(brandIdNum) && brandName) {
      brandIdNum = await resolveBrandId(brandName, tenantId);
    }

    if (!brandName && !Number.isInteger(brandIdNum)) return null;

    if (
      allowedBrandNames &&
      brandName &&
      !allowedBrandNames.includes(brandName)
    ) {
      return null;
    }

    const bc = brandSql(allowedBrandNames);
    const rows =
      Number.isInteger(brandIdNum) && brandIdNum > 0
        ? await sql`
            SELECT * FROM products
            WHERE productcode = ${code}
              AND tenant_id = ${tenantId}
              AND (brand_id = ${brandIdNum} OR brand = ${brandName})
              ${bc}
            LIMIT 1
          `
        : await sql`
            SELECT * FROM products
            WHERE productcode = ${code}
              AND brand = ${brandName}
              AND tenant_id = ${tenantId}
              ${bc}
            LIMIT 1
          `;

    return rows[0] ?? null;
  }

  /**
   * Busca produtos com filtros opcionais e paginação
   * @param {Object} filters - Filtros de busca (brand, productcode, name, page, limit, allowedBrandNames)
   * @returns {Promise<Object>} Objeto com data, total, page, totalPages
   */
  async findAll(filters = {}) {
    const {
      brand,
      brandId,
      productcode,
      name,
      q,
      page = 1,
      limit = 50,
      allowedBrandNames,
      tenantId = 1,
    } = filters;
    const brandIdNum =
      brandId != null && brandId !== "" ? parseInt(brandId, 10) : null;
    const offset = (page - 1) * limit;
    const bc = brandSql(allowedBrandNames);

    let query;
    let countQuery;

    const qTrim = q != null && String(q).trim() !== "" ? String(q).trim() : "";
    const searchPattern = qTrim ? `%${qTrim}%` : "";
    const qTokens = qTrim
      ? qTrim.split(/\s+/).map((t) => t.trim()).filter(Boolean)
      : [];

    // Busca por PRODUCTCODE
    if (productcode) {
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
    // Busca por representada (brand_id preferencial)
    else if (
      (Number.isInteger(brandIdNum) && brandIdNum > 0) ||
      (brand && brand !== "all")
    ) {
      let brandName = brand && brand !== "all" ? String(brand).trim() : "";
      if (!brandName && Number.isInteger(brandIdNum)) {
        const brandRow = await sql`
          SELECT name FROM brands
          WHERE id = ${brandIdNum} AND tenant_id = ${tenantId}
          LIMIT 1
        `;
        brandName = brandRow[0]?.name || "";
      }
      if (Number.isInteger(brandIdNum) && brandIdNum > 0) {
        query = await sql`
          SELECT * FROM products
          WHERE tenant_id = ${tenantId}
            AND (brand_id = ${brandIdNum} OR brand = ${brandName})
            ${bc}
          ORDER BY createdat DESC
          LIMIT ${limit} OFFSET ${offset}`;
        countQuery = await sql`
          SELECT COUNT(*) as count FROM products
          WHERE tenant_id = ${tenantId}
            AND (brand_id = ${brandIdNum} OR brand = ${brandName})
            ${bc}`;
      } else {
        query = await sql`
          SELECT * FROM products
          WHERE brand = ${brandName} AND tenant_id = ${tenantId} ${bc}
          ORDER BY createdat DESC
          LIMIT ${limit} OFFSET ${offset}`;
        countQuery = await sql`
          SELECT COUNT(*) as count FROM products
          WHERE brand = ${brandName} AND tenant_id = ${tenantId} ${bc}`;
      }
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
   * WHERE por tokens (cada token em nome OU código), com unaccent.
   */
  _tokenWhereUnaccent(tokens, paramStart) {
    const parts = [];
    let p = paramStart;
    for (let i = 0; i < tokens.length; i++) {
      parts.push(`(
        unaccent(lower(COALESCE(name::text, ''))) LIKE '%' || unaccent(lower($${p}::text)) || '%'
        OR unaccent(lower(COALESCE(productcode::text, ''))) LIKE '%' || unaccent(lower($${p}::text)) || '%'
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
  async search(
    searchTerm,
    limit = 20,
    allowedBrandNames = null,
    tenantId = 1,
    brandFilter = {},
  ) {
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

    let brandIdNum =
      brandFilter.brandId != null && brandFilter.brandId !== ""
        ? parseInt(brandFilter.brandId, 10)
        : null;
    let brandName = brandFilter.brand
      ? String(brandFilter.brand).trim()
      : "";
    if (Number.isInteger(brandIdNum) && brandIdNum > 0 && !brandName) {
      brandName = await resolveBrandName(brandIdNum, tenantId);
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
      if (Number.isInteger(brandIdNum) && brandIdNum > 0) {
        v.push(brandIdNum, brandName);
        w += ` AND (brand_id = $${np} OR brand = $${np + 1})`;
        np += 2;
      } else if (brandName) {
        v.push(brandName);
        w += ` AND brand = $${np}`;
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
    const { name, productcode, price, stock, brand, minstock, tenant_id } =
      productData;
    const tenantId = tenant_id || 1;

    if (!name || price === undefined || stock === undefined) {
      throw new Error("Nome, preço e estoque são obrigatórios");
    }

    if (productcode && brand) {
      const existing = await this.findByProductCodeInBrand({
        productcode,
        brand,
        tenantId,
      });
      if (existing) {
        throw new Error(
          `Já existe um produto com o código "${productcode}" nesta representada: ${existing.name}`,
        );
      }
    }

    const brand_id = brand ? await resolveBrandId(brand, tenantId) : null;

    return productRepository.insertProduct({
      name,
      productcode,
      price,
      stock,
      brand,
      brand_id,
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
    const { name, productcode, price, stock, brand, minstock, tenant_id } =
      productData;
    const tenantId = tenant_id || 1;

    if (!name || price === undefined || stock === undefined) {
      throw new Error("Nome, preço e estoque são obrigatórios");
    }

    if (productcode && brand) {
      const existing = await this.findByProductCodeInBrand({
        productcode,
        brand,
        tenantId,
      });
      if (existing && Number(existing.id) !== Number(id)) {
        throw new Error(
          `O código "${productcode}" já está em uso nesta representada pelo produto: ${existing.name}`,
        );
      }
    }

    const brand_id = brand ? await resolveBrandId(brand, tenantId) : null;

    const result = await sql(
      `UPDATE products
       SET name = $1, productcode = $2, price = $3, stock = $4, brand = $5, minstock = $6, brand_id = $7
       WHERE id = $8 AND tenant_id = $9
       RETURNING *`,
      [
        name,
        productcode,
        price,
        stock,
        brand,
        minstock || 0,
        brand_id,
        id,
        tenantId,
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

  /**
   * Reajuste percentual em massa (representada inteira ou produtos selecionados).
   * @param {Object} opts
   * @returns {Promise<{ dryRun: boolean, updated: number, items: Array }>}
   */
  async bulkAdjustPrices({
    tenantId = 1,
    brandId,
    brandName,
    productIds = null,
    percentage,
    dryRun = false,
    changedBy = null,
  }) {
    const pct = Number(percentage);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      throw new Error("Percentual deve ser entre 0,01 e 100");
    }

    let resolvedBrandName = brandName ? String(brandName).trim() : "";
    const brandIdNum =
      brandId != null && brandId !== "" ? parseInt(brandId, 10) : null;

    if (!resolvedBrandName && Number.isInteger(brandIdNum) && brandIdNum > 0) {
      resolvedBrandName = await resolveBrandName(brandIdNum, tenantId);
    }
    if (!resolvedBrandName && (!productIds || productIds.length === 0)) {
      throw new Error("Representada é obrigatória para reajuste em massa");
    }

    let products;
    const ids =
      Array.isArray(productIds) && productIds.length > 0
        ? productIds.map((id) => parseInt(id, 10)).filter((id) => id > 0)
        : null;

    if (ids && ids.length > 0) {
      products = await sql`
        SELECT * FROM products
        WHERE tenant_id = ${tenantId}
          AND id = ANY(${ids})
      `;
      if (products.length === 0) {
        throw new Error("Nenhum produto encontrado para reajuste");
      }
      if (resolvedBrandName) {
        const invalid = products.filter(
          (p) =>
            p.brand !== resolvedBrandName &&
            !(Number.isInteger(brandIdNum) && p.brand_id === brandIdNum),
        );
        if (invalid.length > 0) {
          throw new Error(
            "Todos os produtos selecionados devem pertencer à mesma representada",
          );
        }
      }
    } else if (Number.isInteger(brandIdNum) && brandIdNum > 0) {
      products = await sql`
        SELECT * FROM products
        WHERE tenant_id = ${tenantId}
          AND (brand_id = ${brandIdNum} OR brand = ${resolvedBrandName})
        ORDER BY name
      `;
    } else {
      products = await sql`
        SELECT * FROM products
        WHERE tenant_id = ${tenantId} AND brand = ${resolvedBrandName}
        ORDER BY name
      `;
    }

    if (products.length === 0) {
      throw new Error("Nenhum produto encontrado para reajuste");
    }

    const roundPrice = (value) =>
      Math.round(Number(value) * (1 + pct / 100) * 100) / 100;

    const items = products.map((p) => {
      const oldPrice = parseFloat(p.price) || 0;
      const newPrice = roundPrice(oldPrice);
      return {
        id: p.id,
        name: p.name,
        productCode: p.productcode,
        brand: p.brand,
        oldPrice,
        newPrice,
        difference: Math.round((newPrice - oldPrice) * 100) / 100,
      };
    });

    if (dryRun) {
      return { dryRun: true, updated: items.length, items };
    }

    for (const item of items) {
      await sql`
        UPDATE products
        SET price = ${item.newPrice}
        WHERE id = ${item.id} AND tenant_id = ${tenantId}
      `;
      await sql`
        INSERT INTO price_history (
          product_id,
          tenant_id,
          old_price,
          new_price,
          changed_by,
          changedat
        ) VALUES (
          ${item.id},
          ${tenantId},
          ${item.oldPrice},
          ${item.newPrice},
          ${changedBy},
          NOW()
        )
      `;
    }

    return { dryRun: false, updated: items.length, items };
  }
}

module.exports = new ProductService();
