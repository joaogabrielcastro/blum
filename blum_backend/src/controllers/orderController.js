const orderService = require("../services/orderService");

const assertOrderAccess = (req, order) => {
  if (req.user.role === "admin") return;
  if (String(order.user_ref) !== String(req.user.userId)) {
    const err = new Error("Acesso negado");
    err.statusCode = 403;
    throw err;
  }
};

// GET ALL - Buscar todos os pedidos (escopo definido pelo JWT)
exports.getAll = async (req, res) => {
  try {
    const { clientid } = req.query;
    const orders = await orderService.findAll({
      authUser: { role: req.user.role, userId: req.user.userId },
      clientid: clientid || undefined,
    });
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
    assertOrderAccess(req, order);
    res.status(200).json(order);
  } catch (error) {
    console.error("Erro ao buscar pedido:", error);
    if (error.statusCode === 403) {
      return res.status(403).json({ error: error.message });
    }
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
    if (
      req.user.role === "salesperson" &&
      String(userId) !== String(req.user.userId)
    ) {
      return res.status(403).json({ error: "Acesso negado" });
    }
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
    const order = await orderService.create(req.body, req.user);
    res.status(201).json(order);
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    res.status(400).json({ error: error.message });
  }
};

// Converter orçamento em pedido
exports.convertToPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await orderService.findById(id);
    assertOrderAccess(req, existing);
    const order = await orderService.convertToPedido(id);
    res.status(200).json(order);
  } catch (error) {
    console.error("Erro ao converter orçamento:", error);
    if (error.statusCode === 403) {
      return res.status(403).json({ error: error.message });
    }
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === "Pedido não encontrado") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Erro ao converter orçamento." });
  }
};

// UPDATE - Atualizar um pedido
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await orderService.findById(id);
    assertOrderAccess(req, existing);
    const order = await orderService.update(id, req.body, req.user);
    res.status(200).json(order);
  } catch (error) {
    console.error("Erro ao atualizar pedido:", error);
    if (error.statusCode === 403) {
      return res.status(403).json({ error: error.message });
    }
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
    const existing = await orderService.findById(id);
    assertOrderAccess(req, existing);
    const order = await orderService.updateStatus(id, status);
    res.status(200).json(order);
  } catch (error) {
    console.error("Erro ao atualizar status do pedido:", error);
    if (error.statusCode === 403) {
      return res.status(403).json({ error: error.message });
    }
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
    const existing = await orderService.findById(id);
    assertOrderAccess(req, existing);
    await orderService.delete(id);
    res.status(204).end();
  } catch (error) {
    console.error("Erro ao excluir pedido:", error);
    if (error.statusCode === 403) {
      return res.status(403).json({ error: error.message });
    }
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
    const existing = await orderService.findById(id);
    assertOrderAccess(req, existing);
    const result = await orderService.finalize(id);
    res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao finalizar pedido:", error);
    if (error.statusCode === 403) {
      return res.status(403).json({ error: error.message });
    }
    if (error.statusCode === 409) {
      return res.status(409).json({ error: error.message });
    }
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === "Pedido não encontrado") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Erro ao finalizar pedido." });
  }
};

// UPDATE PAYMENT METHOD - Atualizar forma de pagamento de pedido
exports.updatePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method: paymentMethod } = req.body;
    const existing = await orderService.findById(id);
    assertOrderAccess(req, existing);
    const updated = await orderService.updatePaymentMethod(id, paymentMethod);
    res.status(200).json(updated);
  } catch (error) {
    console.error("Erro ao atualizar forma de pagamento:", error);
    if (error.statusCode === 403) {
      return res.status(403).json({ error: error.message });
    }
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === "Pedido não encontrado") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Erro ao atualizar forma de pagamento." });
  }
};

// DUPLICATE - Duplicar pedido/orçamento
exports.duplicate = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await orderService.findById(id);
    assertOrderAccess(req, existing);
    const duplicated = await orderService.duplicate(id);
    res.status(201).json(duplicated);
  } catch (error) {
    console.error("Erro ao duplicar pedido:", error);
    if (error.statusCode === 403) {
      return res.status(403).json({ error: error.message });
    }
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === "Pedido não encontrado") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Erro ao duplicar pedido." });
  }
};

// GET CLIENT ITEM PRICE HISTORY
exports.getClientItemPriceHistory = async (req, res) => {
  try {
    const { clientId, productId } = req.params;
    const { limit } = req.query;
    const rows = await orderService.getClientItemPriceHistory(
      parseInt(clientId, 10),
      parseInt(productId, 10),
      req.user,
      limit,
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erro ao buscar histórico de preço cliente/produto:", error);
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    res
      .status(500)
      .json({ error: "Erro ao buscar histórico de preço do cliente." });
  }
};

// GET CLIENT STATS - Estatísticas do cliente
exports.getClientStats = async (req, res) => {
  try {
    const { clientId } = req.params;
    const stats = await orderService.getClientStats(clientId, req.user);
    res.status(200).json(stats);
  } catch (error) {
    console.error("Erro ao buscar estatísticas do cliente:", error);
    res.status(400).json({ error: error.message });
  }
};

module.exports = exports;
