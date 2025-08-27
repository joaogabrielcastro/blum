const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const Client = require('../models/Client');

const orderController = {
  getAllOrders: async (req, res) => {
    try {
      const orders = await Order.findAll({
        include: [
          {
            model: Client,
            attributes: ['companyName', 'contactPerson']
          },
          {
            model: OrderItem,
            include: [{
              model: Product,
              attributes: ['name', 'price']
            }]
          }
        ]
      });
      res.status(200).json(orders);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar pedidos.', details: error.message });
    }
  },
  createOrder: async (req, res) => {
    const { clientId, items } = req.body;
    let transaction;
    try {
      transaction = await sequelize.transaction();
      const newOrder = await Order.create({ ClientId: clientId }, { transaction });
      let total = 0;
      for (const item of items) {
        const product = await Product.findByPk(item.productId, { transaction });
        if (!product) {
          throw new Error(`Produto com ID ${item.productId} não encontrado.`);
        }
        await OrderItem.create({
          quantity: item.quantity,
          itemPrice: product.price,
          OrderId: newOrder.id,
          ProductId: product.id
        }, { transaction });
        total += item.quantity * product.price;
      }
      await newOrder.update({ totalPrice: total }, { transaction });
      await transaction.commit();
      res.status(201).json(newOrder);
    } catch (error) {
      if (transaction) await transaction.rollback();
      res.status(500).json({ error: 'Erro ao criar pedido.', details: error.message });
    }
  },
  getOrderById: async (req, res) => {
    try {
      const order = await Order.findByPk(req.params.id, {
        include: [
          { model: Client },
          { model: OrderItem, include: [{ model: Product }] }
        ]
      });
      if (order) {
        res.status(200).json(order);
      } else {
        res.status(404).json({ error: 'Pedido não encontrado.' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar pedido.' });
    }
  },
  updateOrder: async (req, res) => {
    const { items, status } = req.body;
    let transaction;
    try {
      transaction = await sequelize.transaction();
      const order = await Order.findByPk(req.params.id, { transaction });
      if (!order) {
        throw new Error('Pedido não encontrado.');
      }
      if (status) {
        await order.update({ status }, { transaction });
      }
      if (items && items.length > 0) {
        await OrderItem.destroy({ where: { OrderId: order.id }, transaction });
        let total = 0;
        for (const item of items) {
          const product = await Product.findByPk(item.productId, { transaction });
          if (!product) {
            throw new Error(`Produto com ID ${item.productId} não encontrado.`);
          }
          await OrderItem.create({
            quantity: item.quantity,
            itemPrice: product.price,
            OrderId: order.id,
            ProductId: product.id
          }, { transaction });
          total += item.quantity * product.price;
        }
        await order.update({ totalPrice: total }, { transaction });
      }
      await transaction.commit();
      const updatedOrder = await Order.findByPk(req.params.id, {
        include: [{ model: OrderItem, include: [{ model: Product }] }]
      });
      res.status(200).json(updatedOrder);
    } catch (error) {
      if (transaction) await transaction.rollback();
      res.status(500).json({ error: 'Erro ao atualizar pedido.', details: error.message });
    }
  },
  deleteOrder: async (req, res) => {
    let transaction;
    try {
      transaction = await sequelize.transaction();
      const order = await Order.findByPk(req.params.id, { transaction });
      if (order) {
        await order.destroy({ transaction });
        await transaction.commit();
        res.status(204).json({ message: 'Pedido deletado com sucesso.' });
      } else {
        await transaction.rollback();
        res.status(404).json({ error: 'Pedido não encontrado.' });
      }
    } catch (error) {
      if (transaction) await transaction.rollback();
      res.status(500).json({ error: 'Erro ao deletar pedido.' });
    }
  }
};

module.exports = orderController;
