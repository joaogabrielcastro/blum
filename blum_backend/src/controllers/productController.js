const productService = require("../services/productService");
const brandAccessService = require("../services/brandAccessService");
const {
  mapProductResponse,
  mapProductsPayload,
} = require("../mappers/apiResponseMapper");
const {
  cacheGet,
  cacheSet,
  invalidateProductsCache,
  cacheKeyProducts,
} = require("../config/cache");

exports.getAll = async (req, res) => {
  try {
    const mapOptions = { camelOnly: req.apiVersion === "v2" };
    const {
      brand,
      brandId,
      productcode,
      name,
      q,
      page = 1,
      limit = 50,
    } = req.query;

    const allowedBrandNames =
      await brandAccessService.getRestrictedBrandNamesOrNull(
        req.user.userId,
        req.user.role,
        req.user.tenantId,
      );

    let brandNameForAccess = brand && brand !== "all" ? String(brand).trim() : "";
    if (!brandNameForAccess && brandId) {
      brandNameForAccess = await productService.resolveBrandName(
        brandId,
        req.user.tenantId,
      );
    }
    if (
      allowedBrandNames &&
      brandNameForAccess &&
      !allowedBrandNames.includes(brandNameForAccess)
    ) {
      return res.status(403).json({
        error: "Sem permissão para consultar produtos desta representada",
      });
    }

    const filters = {
      tenantId: req.user.tenantId,
      brand,
      brandId,
      productcode,
      name,
      q,
      page,
      limit,
      allowedBrandNames,
    };
    const cacheKey = cacheKeyProducts({
      ...filters,
      _access: req.user.userId,
    });

    const cachedData = await cacheGet(cacheKey);
    if (cachedData) {
      return res.status(200).json(mapProductsPayload(cachedData, mapOptions));
    }

    const result = mapProductsPayload(
      await productService.findAll(filters),
      mapOptions,
    );
    await cacheSet(cacheKey, result);

    res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    res
      .status(500)
      .json({ error: error.message || "Erro ao buscar produtos." });
  }
};

exports.lookupByCode = async (req, res) => {
  try {
    const mapOptions = { camelOnly: req.apiVersion === "v2" };
    const productcode = req.query.productcode ?? req.query.productCode;
    const { brand, brandId } = req.query;

    if (!productcode || String(productcode).trim() === "") {
      return res.status(400).json({ error: "productcode é obrigatório" });
    }

    const allowedBrandNames =
      await brandAccessService.getRestrictedBrandNamesOrNull(
        req.user.userId,
        req.user.role,
        req.user.tenantId,
      );

    const product = await productService.findByProductCodeInBrand({
      productcode,
      brand,
      brandId,
      tenantId: req.user.tenantId,
      allowedBrandNames,
    });

    if (!product) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    res.status(200).json(mapProductResponse(product, mapOptions));
  } catch (error) {
    console.error("Erro ao buscar produto por código:", error);
    res
      .status(500)
      .json({ error: error.message || "Erro ao buscar produto por código." });
  }
};

exports.search = async (req, res) => {
  try {
    const mapOptions = { camelOnly: req.apiVersion === "v2" };
    const { q, brandId, brand } = req.query;
    const allowedBrandNames =
      await brandAccessService.getRestrictedBrandNamesOrNull(
        req.user.userId,
        req.user.role,
        req.user.tenantId,
      );

    let brandNameForAccess = brand && brand !== "all" ? String(brand).trim() : "";
    if (!brandNameForAccess && brandId) {
      brandNameForAccess = await productService.resolveBrandName(
        brandId,
        req.user.tenantId,
      );
    }
    if (
      allowedBrandNames &&
      brandNameForAccess &&
      !allowedBrandNames.includes(brandNameForAccess)
    ) {
      return res.status(403).json({
        error: "Sem permissão para consultar produtos desta representada",
      });
    }

    const products = (
      await productService.search(q, 20, allowedBrandNames, req.user.tenantId, {
        brandId,
        brand: brandNameForAccess || brand,
      })
    ).map((item) => mapProductResponse(item, mapOptions));
    res.status(200).json(products);
  } catch (error) {
    console.error("Erro na busca de produtos:", error);
    res.status(400).json({ error: error.message || "Erro ao buscar produtos" });
  }
};

exports.getById = async (req, res) => {
  try {
    const mapOptions = { camelOnly: req.apiVersion === "v2" };
    const { id } = req.params;
    const product = await productService.findById(id, req.user.tenantId);
    const allowedBrandNames =
      await brandAccessService.getRestrictedBrandNamesOrNull(
        req.user.userId,
        req.user.role,
        req.user.tenantId,
      );
    if (
      allowedBrandNames &&
      product.brand &&
      !allowedBrandNames.includes(product.brand)
    ) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }
    res.status(200).json(mapProductResponse(product, mapOptions));
  } catch (error) {
    console.error("Erro ao buscar produto:", error);
    const status = error.message === "Produto não encontrado" ? 404 : 500;
    res.status(status).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const mapOptions = { camelOnly: req.apiVersion === "v2" };
    const product = await productService.create({
      ...req.body,
      tenant_id: req.user.tenantId,
    });

    await invalidateProductsCache();

    res.status(201).json(mapProductResponse(product, mapOptions));
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    res.status(400).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await productService.delete(id, req.user.tenantId);

    await invalidateProductsCache();
    res.status(204).end();
  } catch (error) {
    console.error("Erro ao excluir produto:", error);
    const status = error.message === "Produto não encontrado" ? 404 : 500;
    res.status(status).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const mapOptions = { camelOnly: req.apiVersion === "v2" };
    const { id } = req.params;
    const product = await productService.update(id, {
      ...req.body,
      tenant_id: req.user.tenantId,
    });

    await invalidateProductsCache();

    res.status(200).json(mapProductResponse(product, mapOptions));
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    const status = error.message === "Produto não encontrado" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
};

exports.updateStock = async (productId, quantity) => {
  try {
    return await productService.updateStock(productId, quantity);
  } catch (error) {
    console.error("Erro ao atualizar estoque:", error);
    throw error;
  }
};

exports.bulkAdjustPrices = async (req, res) => {
  try {
    const {
      brandId,
      brand,
      productIds,
      percentage,
      dryRun = false,
    } = req.body;

    const result = await productService.bulkAdjustPrices({
      tenantId: req.user.tenantId,
      brandId,
      brandName: brand,
      productIds,
      percentage,
      dryRun: dryRun === true || dryRun === "true",
      changedBy: req.user.username || String(req.user.userId),
    });

    if (!result.dryRun) {
      await invalidateProductsCache();
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Erro no reajuste de preços:", error);
    res.status(400).json({ error: error.message || "Erro no reajuste de preços" });
  }
};
