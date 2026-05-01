const { sql } = require("../config/database");
const brandAccessService = require("../services/brandAccessService");
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
    await sql`
      INSERT INTO brands (name, commission_rate, logo_url, tenant_id) 
      VALUES (${name}, ${commission_rate}, ${logo_url || null}, ${req.user.tenantId}) 
      ON CONFLICT (tenant_id, name) DO NOTHING
    `;
    res.status(201).json({ message: "Marca criada com sucesso!" });
  } catch (error) {
    console.error("Erro ao criar marca:", error);
    res.status(500).json({ error: "Erro ao criar marca." });
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
      SELECT COUNT(*) as count FROM products WHERE brand = ${brandName} AND tenant_id = ${req.user.tenantId}
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
      WHERE id = ${brandId}
        AND tenant_id = ${req.user.tenantId}
      RETURNING *
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: "Marca não encontrada." });
    }

    res.status(200).json({ message: "Marca deletada com sucesso!" });
  } catch (error) {
    console.error("Erro ao deletar marca:", error);
    res.status(500).json({
      error: "Erro ao deletar marca.",
      details: error.message,
    });
  }
};

module.exports = exports;
