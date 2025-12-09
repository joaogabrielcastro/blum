const orderService = require('../services/orderService');

// GET ALL - Buscar todos os pedidos
exports.getAll = async (req, res) => {
  try {
    const { userId, clientid, userRole } = req.query;
    const orders = await orderService.findAll({ userId, clientid, userRole });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error);
    res.status(400).json({ error: error.message });
  }
};

// GET BY ID - Buscar pedido por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderService.findById(id);
    res.status(200).json(order);
  } catch (error) {
    console.error("Erro ao buscar pedido:", error);
    if (error.message === "Pedido não encontrado") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Erro ao buscar pedido." });
  }
};

// GET ORDERS BY SELLER - Pedidos por vendedor
exports.getOrdersBySeller = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await orderService.findBySeller(userId);
    res.status(200).json(orders);
  } catch (error) {
    console.error("Erro ao buscar pedidos do vendedor:", error);
    res.status(500).json({ error: "Erro ao buscar pedidos do vendedor." });
  }
};

// CREATE - Criar um novo pedido
exports.create = async (req, res) => {
  try {
    const order = await orderService.create(req.body);
    res.status(201).json(order);
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    res.status(400).json({ error: error.message });
  }
};

// UPDATE - Atualizar um pedido
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderService.update(id, req.body);
    res.status(200).json(order);
  } catch (error) {
    console.error("Erro ao atualizar pedido:", error);
    if (error.message === "Pedido não encontrado") {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

// UPDATE STATUS - Atualizar status do pedido
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await orderService.updateStatus(id, status);
    res.status(200).json(order);
  } catch (error) {
    console.error("Erro ao atualizar status do pedido:", error);
    if (error.message === "Pedido não encontrado") {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

// DELETE - Excluir um pedido
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await orderService.delete(id);
    res.status(204).end();
  } catch (error) {
    console.error("Erro ao excluir pedido:", error);
    if (error.message === "Pedido não encontrado") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Erro ao excluir pedido." });
  }
};

// FINALIZE - Finalizar um pedido
exports.finalize = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await orderService.finalize(id);
    res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao finalizar pedido:", error);
    if (error.message === "Pedido não encontrado") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Erro ao finalizar pedido." });
  }
};

// GET CLIENT STATS - Estatísticas do cliente
exports.getClientStats = async (req, res) => {
  try {
    const { clientId } = req.params;
    const stats = await orderService.getClientStats(clientId);
    res.status(200).json(stats);
  } catch (error) {
    console.error("Erro ao buscar estatísticas do cliente:", error);
    res.status(400).json({ error: error.message });
  }
};

module.exports = exports;
