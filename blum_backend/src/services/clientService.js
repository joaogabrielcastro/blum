const { sql } = require("../config/database");

/** Colunas de data: schema SQL usa createdat; algumas bases (Neon/import) têm "createdAt". */
function pickCreatedAt(row) {
  if (!row) return undefined;
  return row.createdat ?? row.createdAt ?? row.created_at;
}

/** Colunas de texto: aceita snake_case ou camelCase vindos do driver. */
function pickCompanyName(row) {
  if (!row) return undefined;
  return row.companyname ?? row.companyName;
}

function pickContactPerson(row) {
  if (!row) return undefined;
  return row.contactperson ?? row.contactPerson;
}

/** Normaliza linha do PG para o contrato esperado pelo frontend. */
function mapClientRow(row) {
  if (!row) return row;
  return {
    ...row,
    companyName: pickCompanyName(row),
    contactPerson: pickContactPerson(row),
    createdAt: pickCreatedAt(row),
  };
}

function mapClients(rows) {
  return rows.map(mapClientRow);
}

class ClientService {
  async findAll() {
    // Evita ORDER BY createdat vs "createdAt" conforme a base; id é sempre válido.
    const rows = await sql`SELECT * FROM clients ORDER BY id DESC`;
    return mapClients(rows);
  }

  async findById(id) {
    if (!id || isNaN(parseInt(id))) {
      throw new Error("ID do cliente inválido");
    }

    const clients = await sql`SELECT * FROM clients WHERE id = ${id}`;

    if (clients.length === 0) {
      throw new Error("Cliente não encontrado");
    }

    return mapClientRow(clients[0]);
  }

  async findByCnpj(cnpj) {
    const clients = await sql`SELECT * FROM clients WHERE cnpj = ${cnpj}`;
    return clients.length > 0 ? mapClientRow(clients[0]) : null;
  }

  async create(clientData) {
    const { companyName, contactPerson, phone, region, cnpj, email } =
      clientData;

    if (!companyName || !cnpj) {
      throw new Error("Nome da empresa e CNPJ são obrigatórios");
    }

    const existingClient = await this.findByCnpj(cnpj);
    if (existingClient) {
      throw new Error("Já existe um cliente com este CNPJ");
    }

    const result = await sql(
      `INSERT INTO clients (companyname, contactperson, phone, region, cnpj, email)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        companyName,
        contactPerson,
        phone,
        region,
        cnpj,
        email || null,
      ],
    );

    return mapClientRow(result[0]);
  }

  async update(id, clientData) {
    const { companyName, contactPerson, phone, region, cnpj, email } =
      clientData;

    if (!companyName) {
      throw new Error("Nome da empresa é obrigatório");
    }

    await this.findById(id);

    const result = await sql(
      `UPDATE clients
       SET companyname = $1, contactperson = $2, phone = $3, region = $4, cnpj = $5, email = $6
       WHERE id = $7
       RETURNING *`,
      [companyName, contactPerson, phone, region, cnpj, email || null, id],
    );

    return mapClientRow(result[0]);
  }

  async delete(id) {
    if (!id || isNaN(parseInt(id))) {
      throw new Error("ID do cliente inválido");
    }

    const result = await sql`DELETE FROM clients WHERE id = ${id} RETURNING *`;

    if (result.length === 0) {
      throw new Error("Cliente não encontrado");
    }
  }

  async findByRegion(region) {
    const rows =
      await sql`SELECT * FROM clients WHERE region = ${region} ORDER BY id DESC`;
    return mapClients(rows);
  }

  async search(searchTerm) {
    if (!searchTerm || searchTerm.trim() === "") {
      return await this.findAll();
    }

    const term = "%" + searchTerm + "%";
    const rows = await sql`
      SELECT * FROM clients
      WHERE
        companyname ILIKE ${term} OR
        contactperson ILIKE ${term} OR
        cnpj ILIKE ${term}
      ORDER BY id DESC
    `;
    return mapClients(rows);
  }

  async hasOrders(clientId) {
    const orders =
      await sql`SELECT COUNT(*) as count FROM orders WHERE clientid = ${clientId}`;
    return orders[0].count > 0;
  }
}

module.exports = new ClientService();
