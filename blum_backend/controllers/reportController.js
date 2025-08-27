const { Sequelize } = require('sequelize');
const Order = require('../models/Order');
const Client = require('../models/Client');
const Product = require('../models/Product');
const OrderItem = require('../models/OrderItem');

const reportController = {
  // Relatório de Vendas por Cliente
  getSalesByClient: async (req, res) => {
    try {
      const salesByClient = await Order.findAll({
        attributes: [
          [Sequelize.fn('SUM', Sequelize.col('totalPrice')), 'totalSales']
        ],
        include: [{
          model: Client,
          attributes: ['companyName']
        }],
        group: ['Client.id', 'Client.companyName'],
        order: [[Sequelize.fn('SUM', Sequelize.col('totalPrice')), 'DESC']]
      });
      res.status(200).json(salesByClient);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao gerar relatório de vendas por cliente.' });
    }
  },

  // Relatório de Vendas por Representante (simulação)
  getSalesBySalesperson: async (req, res) => {
    try {
      const salesBySalesperson = await Order.findAll({
        attributes: [
          [Sequelize.fn('SUM', Sequelize.col('totalPrice')), 'totalSales']
        ],
        include: [{
          model: Client,
          attributes: ['contactPerson'],
          where: { contactPerson: { [Sequelize.Op.ne]: null } } 
        }],
        group: ['Client.contactPerson'],
        order: [[Sequelize.fn('SUM', Sequelize.col('totalPrice')), 'DESC']]
      });
      res.status(200).json(salesBySalesperson);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao gerar relatório de vendas por representante.' });
    }
  },

  // Relatório de Produtos mais vendidos
  getTopSellingProducts: async (req, res) => {
    try {
      const topProducts = await OrderItem.findAll({
        attributes: [
          'ProductId',
          [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalQuantity']
        ],
        include: [{
          model: Product,
          attributes: ['name']
        }],
        group: ['ProductId', 'Product.id', 'Product.name'],
        order: [[Sequelize.fn('SUM', Sequelize.col('quantity')), 'DESC']],
        limit: 10
      });
      res.status(200).json(topProducts);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao gerar relatório de produtos mais vendidos.' });
    }
  },


  getInventoryStatus: async (req, res) => {
    try {
      const inventory = await Product.findAll({
        attributes: ['id', 'name', 'stock', 'category', 'price']
      });
      res.status(200).json(inventory);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao gerar relatório de situação de estoque.' });
    }
  }
};

module.exports = reportController;
