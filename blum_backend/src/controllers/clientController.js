const clientService = require('../services/clientService');

exports.getAll = async (req, res) => {
  try {
    const clients = await clientService.findAll();
    res.status(200).json(clients);
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await clientService.findById(id);
    res.status(200).json(client);
  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    const status = error.message.includes('inválido') || error.message.includes('não encontrado') ? 404 : 500;
    res.status(status).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const client = await clientService.create(req.body);
    res.status(201).json(client);
  } catch (error) {
    console.error("Erro ao criar cliente:", error);
    res.status(400).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await clientService.update(id, req.body);
    res.status(200).json(client);
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);
    const status = error.message.includes('não encontrado') ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await clientService.delete(id);
    res.status(200).json({ message: "Cliente deletado com sucesso." });
  } catch (error) {
    console.error("Erro ao deletar cliente:", error);
    const status = error.message.includes('inválido') || error.message.includes('não encontrado') ? 404 : 500;
    res.status(status).json({ error: error.message });
  }
};

// Certifique-se de exportar todas as funções
module.exports = exports;