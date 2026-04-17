const { sql } = require("../config/database");
const brandAccessService = require("../services/brandAccessService");
const { invalidateProductsCache } = require("../config/cache");

exports.getUserAllowedBrands = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(400).json({ error: "ID de usuário inválido" });
    }

    const users = await sql`SELECT id, role FROM users WHERE id = ${userId}`;
    if (!users.length) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const brandIds = await brandAccessService.getAllowedBrandIdsForUser(userId);
    res.json({ userId, brandIds });
  } catch (error) {
    console.error("getUserAllowedBrands:", error);
    res.status(500).json({ error: "Erro ao buscar representadas do usuário" });
  }
};

exports.putUserAllowedBrands = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(400).json({ error: "ID de usuário inválido" });
    }

    const { brandIds } = req.body;
    if (!Array.isArray(brandIds)) {
      return res.status(400).json({ error: "brandIds deve ser um array" });
    }

    const users = await sql`SELECT id, role FROM users WHERE id = ${userId}`;
    if (!users.length) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    if (users[0].role !== "salesperson") {
      return res
        .status(400)
        .json({ error: "Só é possível restringir representadas para vendedores" });
    }

    const numericIds = brandIds
      .map((id) => parseInt(id, 10))
      .filter((n) => Number.isInteger(n) && n > 0);
    const uniqueIds = [...new Set(numericIds)];

    if (uniqueIds.length) {
      const found = await sql`
        SELECT id FROM brands WHERE id = ANY(${uniqueIds})
      `;
      if (found.length !== uniqueIds.length) {
        return res.status(400).json({ error: "Uma ou mais representadas são inválidas" });
      }
    }

    await brandAccessService.setAllowedBrandIdsForUser(userId, uniqueIds);
    await invalidateProductsCache();

    res.json({
      message:
        uniqueIds.length === 0
          ? "Restrição removida: vendedor volta a ver todas as representadas"
          : "Representadas atualizadas",
      userId,
      brandIds: uniqueIds,
    });
  } catch (error) {
    console.error("putUserAllowedBrands:", error);
    res.status(500).json({ error: "Erro ao salvar representadas do usuário" });
  }
};
