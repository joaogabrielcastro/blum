const Client = require('../models/Client');

const clientController = {
  getAllClients: async (req, res) => {
    try {
      const clients = await Client.findAll();
      res.status(200).json(clients);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar clientes.' });
    }
  },
  createClient: async (req, res) => {
    try {
      const newClient = await Client.create(req.body);
      res.status(201).json(newClient);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao criar cliente.' });
    }
  },
  getClientById: async (req, res) => {
    try {
      const client = await Client.findByPk(req.params.id);
      if (client) {
        res.status(200).json(client);
      } else {
        res.status(404).json({ error: 'Cliente não encontrado.' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar cliente.' });
    }
  },
  updateClient: async (req, res) => {
    try {
      const client = await Client.findByPk(req.params.id);
      if (client) {
        await client.update(req.body);
        res.status(200).json(client);
      } else {
        res.status(404).json({ error: 'Cliente não encontrado.' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar cliente.' });
    }
  },
  deleteClient: async (req, res) => {
    try {
      const client = await Client.findByPk(req.params.id);
      if (client) {
        await client.destroy();
        res.status(204).json({ message: 'Cliente deletado com sucesso.' });
      } else {
        res.status(404).json({ error: 'Cliente não encontrado.' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Erro ao deletar cliente.' });
    }
  }
};

module.exports = clientController;
