const { sql } = require("../config/database");

async function findAllByTenant(tenantId) {
  return sql`SELECT * FROM clients WHERE tenant_id = ${tenantId} ORDER BY id DESC`;
}

async function findByIdAndTenant(id, tenantId) {
  return sql`SELECT * FROM clients WHERE id = ${id} AND tenant_id = ${tenantId}`;
}

async function findByCnpjAndTenant(cnpj, tenantId) {
  return sql`SELECT * FROM clients WHERE cnpj = ${cnpj} AND tenant_id = ${tenantId}`;
}

async function insertClient(payload) {
  return sql(
    `INSERT INTO clients (
      companyname, contactperson, phone, region, cnpj, email, tenant_id,
      street, number, complement, neighborhood, city, zipcode
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    payload,
  );
}

async function updateClient(payload) {
  return sql(
    `UPDATE clients
     SET companyname = $1, contactperson = $2, phone = $3, region = $4, cnpj = $5, email = $6,
         street = $7, number = $8, complement = $9, neighborhood = $10, city = $11, zipcode = $12
     WHERE id = $13 AND tenant_id = $14
     RETURNING *`,
    payload,
  );
}

async function deleteClient(id, tenantId) {
  return sql`DELETE FROM clients WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING *`;
}

module.exports = {
  findAllByTenant,
  findByIdAndTenant,
  findByCnpjAndTenant,
  insertClient,
  updateClient,
  deleteClient,
};
