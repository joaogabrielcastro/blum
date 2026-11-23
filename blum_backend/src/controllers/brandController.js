const { sql, pool, beginTenantTransaction } = require("../config/database");
const brandAccessService = require("../services/brandAccessService");
const { assertCanAddBrand } = require("../services/planLimitsService");
const { mapBrandsPayload } = require("../mappers/apiResponseMapper");

// ✅ CORRIGIDO: Agora retorna o ID também
exports.getBrands = async (req, res) => {
  try {
    const mapOptions = { camelOnly: req.apiVersion === "v2" };
    const { userId, role } = req.user;
    const restricted =
      await brandAccessService.getRestrictedBrandNamesOrNull(
        userId,
        role,
        req.user.tenantId,
      );

    let brands;
    if (!restricted) {
      brands =
        await sql`SELECT id, name, commission_rate, logo_url FROM brands WHERE tenant_id = ${req.user.tenantId} ORDER BY name ASC`;
    } else {
      brands = await sql`
        SELECT id, name, commission_rate, logo_url FROM brands
        WHERE name = ANY(${restricted})
          AND tenant_id = ${req.user.tenantId}
        ORDER BY name ASC
      `;
    }
    res.status(200).json(mapBrandsPayload(brands, mapOptions));
  } catch (error) {
    console.error("Erro ao buscar marcas:", error);
    res.status(500).json({ error: "Erro ao buscar marcas." });
  }
};

// Função para criar marca
exports.createBrand = async (req, res) => {
  const { name, commission_rate = 0, logo_url = null } = req.body;

  if (!name) {
    return res.status(400).json({ error: "O nome da marca é obrigatório." });
  }

  try {
    await assertCanAddBrand(req.user.tenantId);
    await sql`
      INSERT INTO brands (name, commission_rate, logo_url, tenant_id) 
      VALUES (${name}, ${commission_rate}, ${logo_url || null}, ${req.user.tenantId}) 
      ON CONFLICT (tenant_id, name) DO NOTHING
    `;
    res.status(201).json({ message: "Marca criada com sucesso!" });
  } catch (error) {
    console.error("Erro ao criar marca:", error);
    const status = error.statusCode || 500;
    res.status(status).json({
      error: error.message || "Erro ao criar marca.",
    });
  }
};

exports.updateBrand = async (req, res) => {
  const { oldName } = req.params;
  const { name, commission_rate, logo_url } = req.body;

  try {
    const current = await sql`
      SELECT logo_url FROM brands WHERE name = ${oldName}
      AND tenant_id = ${req.user.tenantId}
    `;
    if (current.length === 0) {
      return res.status(404).json({ error: "Marca não encontrada." });
    }
    const nextLogo = Object.prototype.hasOwnProperty.call(req.body, "logo_url")
      ? logo_url || null
      : current[0].logo_url ?? null;

    await sql`
      UPDATE brands 
      SET name = ${name}, commission_rate = ${commission_rate}, logo_url = ${nextLogo}
      WHERE name = ${oldName} AND tenant_id = ${req.user.tenantId}
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
    // Verifica se o parâmetro é um ID numérico ou um nome
    const isNumericId = /^\d+$/.test(id);

    let brand;
    if (isNumericId) {
      // Busca por ID
      brand = await sql`
        SELECT id, name FROM brands WHERE id = ${parseInt(id)}
        AND tenant_id = ${req.user.tenantId}
      `;
    } else {
      // Busca por nome (para compatibilidade com frontend antigo)
      brand = await sql`
        SELECT id, name FROM brands WHERE name = ${id}
        AND tenant_id = ${req.user.tenantId}
      `;
    }

    if (brand.length === 0) {
      return res.status(404).json({ error: "Marca não encontrada." });
    }

    const brandId = brand[0].id;
    const brandName = brand[0].name;

    // Verificar se existem produtos com esta marca (usa o nome da marca)
    const productsWithBrand = await sql`
      SELECT COUNT(*) as count
      FROM products
      WHERE tenant_id = ${req.user.tenantId}
        AND (brand_id = ${brandId} OR brand = ${brandName})
    `;

    const productCount = parseInt(productsWithBrand[0].count, 10);
    const withProducts = ["1", "true"].includes(
      String(req.query.withProducts || "").toLowerCase(),
    );

    if (productCount > 0 && withProducts) {
      // Tudo ou nada: produtos e representada na mesma transação.
      // Itens de pedidos guardam nome/marca/preço; o vínculo vira NULL (FK).
      const client = await pool.connect();
      let deletedProducts = 0;
      try {
        await beginTenantTransaction(client);
        const del = await client.query(
          `DELETE FROM products
           WHERE tenant_id = $1 AND (brand_id = $2 OR brand = $3)`,
          [req.user.tenantId, brandId, brandName],
        );
        deletedProducts = del.rowCount;
        const removed = await client.query(
          `DELETE FROM brands WHERE id = $1 AND tenant_id = $2`,
          [brandId, req.user.tenantId],
        );
        if (removed.rowCount === 0) {
          throw Object.assign(new Error("Marca não encontrada."), {
            statusCode: 404,
          });
        }
        await client.query("COMMIT");
      } catch (txError) {
        await client.query("ROLLBACK");
        throw txError;
      } finally {
        client.release();
      }
      return res.status(200).json({
        message: "Representada e produtos excluídos.",
        deletedProducts,
      });
    }

    if (productCount > 0) {
      const plural = productCount === 1 ? "produto" : "produtos";
      return res.status(400).json({
        error: `"${brandName}" ainda tem ${productCount} ${plural} no catálogo. Exclua esses produtos (ou mova para outra representada) e tente de novo. Pedidos já feitos não impedem a exclusão.`,
        code: "BRAND_HAS_PRODUCTS",
        productCount,
      });
    }

    // Deletar a marca pelo ID
    const result = await sql`
      DELETE FROM brands 
      WHERE id = ${brandId}
        AND tenant_id = ${req.user.tenantId}
      RETURNING *
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: "Marca não encontrada." });
    }

    res.status(200).json({ message: "Marca deletada com sucesso!" });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    console.error("Erro ao deletar marca:", error);
    res.status(500).json({
      error: "Erro ao deletar marca.",
      details: error.message,
    });
  }
};

module.exports = exports;
