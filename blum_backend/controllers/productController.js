const Product = require('../models/Product');

const productController = {
  getAllProducts: async (req, res) => {
    try {
      const products = await Product.findAll();
      res.status(200).json(products);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar produtos.' });
    }
  },
  createProduct: async (req, res) => {
    try {
      const newProduct = await Product.create(req.body);
      res.status(201).json(newProduct);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao criar produto.' });
    }
  },
  getProductById: async (req, res) => {
    try {
      const product = await Product.findByPk(req.params.id);
      if (product) {
        res.status(200).json(product);
      } else {
        res.status(404).json({ error: 'Produto não encontrado.' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar produto.' });
    }
  },
  updateProduct: async (req, res) => {
    try {
      const product = await Product.findByPk(req.params.id);
      if (product) {
        await product.update(req.body);
        res.status(200).json(product);
      } else {
        res.status(404).json({ error: 'Produto não encontrado.' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar produto.' });
    }
  },
  deleteProduct: async (req, res) => {
    try {
      const product = await Product.findByPk(req.params.id);
      if (product) {
        await product.destroy();
        res.status(204).json({ message: 'Produto deletado com sucesso.' });
      } else {
        res.status(404).json({ error: 'Produto não encontrado.' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Erro ao deletar produto.' });
    }
  }
};

module.exports = productController;
