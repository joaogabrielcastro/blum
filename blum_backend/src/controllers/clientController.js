const clientService = require("../services/clientService");
const {
  mapClientResponse,
  mapClientsPayload,
} = require("../mappers/apiResponseMapper");

exports.getAll = async (req, res) => {
  try {
    const mapOptions = { camelOnly: req.apiVersion === "v2" };
    const clients = await clientService.findAll(req.user.tenantId);
    res.status(200).json(mapClientsPayload(clients, mapOptions));
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getClientById = async (req, res) => {
  try {
    const mapOptions = { camelOnly: req.apiVersion === "v2" };
    const { id } = req.params;
    const client = await clientService.findById(id, req.user.tenantId);
    res.status(200).json(mapClientResponse(client, mapOptions));
  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    const status =
      error.message.includes("inválido") ||
      error.message.includes("não encontrado")
        ? 404
        : 500;
    res.status(status).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const mapOptions = { camelOnly: req.apiVersion === "v2" };
    const client = await clientService.create(req.body, req.user.tenantId);
    res.status(201).json(mapClientResponse(client, mapOptions));
  } catch (error) {
    console.error("Erro ao criar cliente:", error);
    res.status(400).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const mapOptions = { camelOnly: req.apiVersion === "v2" };
    const { id } = req.params;
    const client = await clientService.update(id, req.body, req.user.tenantId);
    res.status(200).json(mapClientResponse(client, mapOptions));
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);
    const status = error.message.includes("não encontrado") ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await clientService.delete(id, req.user.tenantId);
    res.status(200).json({ message: "Cliente deletado com sucesso." });
  } catch (error) {
    console.error("Erro ao deletar cliente:", error);
    const status =
      error.message.includes("inválido") ||
      error.message.includes("não encontrado")
        ? 404
        : 500;
    res.status(status).json({ error: error.message });
  }
};

// Certifique-se de exportar todas as funções
module.exports = exports;
