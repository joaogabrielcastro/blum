const { sql } = require("../config/database");
const clientRepository = require("../repositories/clientRepository");
const {
  normalizeClientBody,
  mapClientRow,
  mapClients,
} = require("../mappers/clientMapper");

class ClientService {
  async findAll(tenantId = 1) {
    // Evita ORDER BY createdat vs "createdAt" conforme a base; id é sempre válido.
    const rows = await clientRepository.findAllByTenant(tenantId);
    return mapClients(rows);
  }

  async findById(id, tenantId = 1) {
    if (!id || isNaN(parseInt(id))) {
      throw new Error("ID do cliente inválido");
    }

    const clients = await clientRepository.findByIdAndTenant(id, tenantId);

    if (clients.length === 0) {
      throw new Error("Cliente não encontrado");
    }

    return mapClientRow(clients[0]);
  }

  async findByCnpj(cnpj, tenantId = 1) {
    const clients = await clientRepository.findByCnpjAndTenant(cnpj, tenantId);
    return clients.length > 0 ? mapClientRow(clients[0]) : null;
  }

  async create(clientData, tenantId = 1) {
    const {
      companyName,
      contactPerson,
      phone,
      region,
      cnpj,
      email,
      street,
      number,
      complement,
      neighborhood,
      city,
      zipcode,
    } = normalizeClientBody(clientData);

    if (!companyName || !cnpj) {
      throw new Error("Nome da empresa e CNPJ são obrigatórios");
    }

    const existingClient = await this.findByCnpj(cnpj, tenantId);
    if (existingClient) {
      throw new Error("Já existe um cliente com este CNPJ");
    }

    const result = await clientRepository.insertClient([
      companyName,
      contactPerson,
      phone,
      region,
      cnpj,
      email || null,
      tenantId,
      street || null,
      number || null,
      complement || null,
      neighborhood || null,
      city || null,
      zipcode || null,
    ]);

    return mapClientRow(result[0]);
  }

  async update(id, clientData, tenantId = 1) {
    const {
      companyName,
      contactPerson,
      phone,
      region,
      cnpj,
      email,
      street,
      number,
      complement,
      neighborhood,
      city,
      zipcode,
    } = normalizeClientBody(clientData);

    if (!companyName) {
      throw new Error("Nome da empresa é obrigatório");
    }

    await this.findById(id, tenantId);

    const result = await clientRepository.updateClient([
      companyName,
      contactPerson,
      phone,
      region,
      cnpj,
      email || null,
      street || null,
      number || null,
      complement || null,
      neighborhood || null,
      city || null,
      zipcode || null,
      id,
      tenantId,
    ]);

    return mapClientRow(result[0]);
  }

  async delete(id, tenantId = 1) {
    if (!id || isNaN(parseInt(id))) {
      throw new Error("ID do cliente inválido");
    }

    const result = await clientRepository.deleteClient(id, tenantId);

    if (result.length === 0) {
      throw new Error("Cliente não encontrado");
    }
  }

  async findByRegion(region, tenantId = 1) {
    const rows =
      await sql`SELECT * FROM clients WHERE region = ${region} AND tenant_id = ${tenantId} ORDER BY id DESC`;
    return mapClients(rows);
  }

  async search(searchTerm, tenantId = 1) {
    if (!searchTerm || searchTerm.trim() === "") {
      return await this.findAll(tenantId);
    }

    const term = "%" + searchTerm + "%";
    const rows = await sql`
      SELECT * FROM clients
      WHERE
        tenant_id = ${tenantId} AND (
        companyname ILIKE ${term} OR
        contactperson ILIKE ${term} OR
        cnpj ILIKE ${term}
        )
      ORDER BY id DESC
    `;
    return mapClients(rows);
  }

  async hasOrders(clientId, tenantId = 1) {
    const orders =
      await sql`SELECT COUNT(*) as count FROM orders WHERE clientid = ${clientId} AND tenant_id = ${tenantId}`;
    return orders[0].count > 0;
  }
}

module.exports = new ClientService();
