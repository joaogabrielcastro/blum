const productService = require("../services/productService");
const {
  cacheGet,
  cacheSet,
  invalidateProductsCache,
  cacheKeyProducts,
} = require("../config/cache");

exports.getAll = async (req, res) => {
  try {
    const {
      brand,
      productcode,
      subcode,
      name,
      q,
      page = 1,
      limit = 50,
    } = req.query;
    const filters = { brand, productcode, subcode, name, q, page, limit };
    const cacheKey = cacheKeyProducts(filters);

    const cachedData = await cacheGet(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const result = await productService.findAll(filters);
    await cacheSet(cacheKey, result);

    res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    res
      .status(500)
      .json({ error: error.message || "Erro ao buscar produtos." });
  }
};

exports.search = async (req, res) => {
  try {
    const { q } = req.query;
    const products = await productService.search(q);
    res.status(200).json(products);
  } catch (error) {
    console.error("Erro na busca de produtos:", error);
    res.status(400).json({ error: error.message || "Erro ao buscar produtos" });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productService.findById(id);
    res.status(200).json(product);
  } catch (error) {
    console.error("Erro ao buscar produto:", error);
    const status = error.message === "Produto não encontrado" ? 404 : 500;
    res.status(status).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const product = await productService.create(req.body);

    await invalidateProductsCache();

    res.status(201).json(product);
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    res.status(400).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await productService.delete(id);

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
    const { id } = req.params;
    const product = await productService.update(id, req.body);

    await invalidateProductsCache();

    res.status(200).json(product);
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
