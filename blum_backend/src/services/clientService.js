const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

class ClientService {
  /**
   * Busca todos os clientes
   * @returns {Promise<Array>} Lista de clientes
   */
  async findAll() {
    return await sql`SELECT * FROM clients ORDER BY "createdAt" DESC`;
  }

  /**
   * Busca cliente por ID
   * @param {number} id - ID do cliente
   * @returns {Promise<Object>} Cliente encontrado
   */
  async findById(id) {
    if (!id || isNaN(parseInt(id))) {
      throw new Error("ID do cliente inválido");
    }

    const clients = await sql`SELECT * FROM clients WHERE id = ${id}`;

    if (clients.length === 0) {
      throw new Error("Cliente não encontrado");
    }

    return clients[0];
  }

  /**
   * Busca cliente por CNPJ
   * @param {string} cnpj - CNPJ do cliente
   * @returns {Promise<Object|null>} Cliente encontrado ou null
   */
  async findByCnpj(cnpj) {
    const clients = await sql`SELECT * FROM clients WHERE cnpj = ${cnpj}`;
    return clients.length > 0 ? clients[0] : null;
  }

  /**
   * Cria um novo cliente
   * @param {Object} clientData - Dados do cliente
   * @returns {Promise<Object>} Cliente criado
   */
  async create(clientData) {
    const { companyName, contactPerson, phone, region, cnpj, email } =
      clientData;

    if (!companyName || !cnpj) {
      throw new Error("Nome da empresa e CNPJ são obrigatórios");
    }

    // Verifica se CNPJ já existe
    const existingClient = await this.findByCnpj(cnpj);
    if (existingClient) {
      throw new Error("Já existe um cliente com este CNPJ");
    }

    const result = await sql(
      `INSERT INTO clients ("companyName", "contactPerson", phone, region, cnpj, "email", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [companyName, contactPerson, phone, region, cnpj, email]
    );

    return result[0];
  }

  /**
   * Atualiza um cliente
   * @param {number} id - ID do cliente
   * @param {Object} clientData - Dados atualizados
   * @returns {Promise<Object>} Cliente atualizado
   */
  async update(id, clientData) {
    const { companyName, contactPerson, phone, region, cnpj } = clientData;

    if (!companyName) {
      throw new Error("Nome da empresa é obrigatório");
    }

    // Verifica se cliente existe
    await this.findById(id);

    const result = await sql(
      `UPDATE clients 
       SET "companyName" = $1, "contactPerson" = $2, phone = $3, region = $4, cnpj = $5
       WHERE id = $6
       RETURNING *`,
      [companyName, contactPerson, phone, region, cnpj, id]
    );

    return result[0];
  }

  /**
   * Deleta um cliente
   * @param {number} id - ID do cliente
   * @returns {Promise<void>}
   */
  async delete(id) {
    if (!id || isNaN(parseInt(id))) {
      throw new Error("ID do cliente inválido");
    }

    const result = await sql`DELETE FROM clients WHERE id = ${id} RETURNING *`;

    if (result.length === 0) {
      throw new Error("Cliente não encontrado");
    }
  }

  /**
   * Busca clientes por região
   * @param {string} region - Região (UF)
   * @returns {Promise<Array>} Lista de clientes
   */
  async findByRegion(region) {
    return await sql`SELECT * FROM clients WHERE region = ${region} ORDER BY "companyName"`;
  }

  /**
   * Busca clientes por termo de busca
   * @param {string} searchTerm - Termo de busca
   * @returns {Promise<Array>} Lista de clientes
   */
  async search(searchTerm) {
    if (!searchTerm || searchTerm.trim() === "") {
      return await this.findAll();
    }

    return await sql`
      SELECT * FROM clients 
      WHERE 
        "companyName" ILIKE ${"%" + searchTerm + "%"} OR
        "contactPerson" ILIKE ${"%" + searchTerm + "%"} OR
        cnpj ILIKE ${"%" + searchTerm + "%"}
      ORDER BY "companyName"
    `;
  }

  /**
   * Verifica se cliente tem pedidos
   * @param {number} clientId - ID do cliente
   * @returns {Promise<boolean>}
   */
  async hasOrders(clientId) {
    const orders =
      await sql`SELECT COUNT(*) as count FROM orders WHERE clientid = ${clientId}`;
    return orders[0].count > 0;
  }
}

module.exports = new ClientService();
