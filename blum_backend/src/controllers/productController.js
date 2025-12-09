const productService = require("../services/productService");
const NodeCache = require("node-cache");

// Cache com TTL de 5 minutos (300 segundos)
const productsCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Função auxiliar para gerar chave de cache
const getCacheKey = (filters) => {
  return `products_${JSON.stringify(filters || {})}`;
};

// Função para limpar todo o cache de produtos
const clearProductsCache = () => {
  const keys = productsCache.keys();
  productsCache.del(keys);
  console.log("🗑️ Cache de produtos limpo");
};

exports.getAll = async (req, res) => {
  try {
    const {
      brand,
      productcode,
      subcode,
      name,
      page = 1,
      limit = 50,
    } = req.query;
    const filters = { brand, productcode, subcode, name, page, limit };
    const cacheKey = getCacheKey(filters);

    // Verificar se existe no cache
    const cachedData = productsCache.get(cacheKey);
    if (cachedData) {
      console.log("✅ Produtos recuperados do cache");
      return res.status(200).json(cachedData);
    }

    // Se não existe, buscar do banco
    const result = await productService.findAll(filters);

    // Salvar no cache
    productsCache.set(cacheKey, result);
    console.log("💾 Produtos salvos no cache");

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

    // Limpar cache ao criar produto
    clearProductsCache();

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

    // Limpar cache ao deletar produto
    clearProductsCache();
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

    // Limpar cache ao atualizar produto
    clearProductsCache();

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
