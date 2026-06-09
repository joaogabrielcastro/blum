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
      companyname, nome_fantasia, contactperson, phone, region, cnpj, email, tenant_id,
      street, number, complement, neighborhood, city, zipcode
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    payload,
  );
}

async function updateClient(payload) {
  return sql(
    `UPDATE clients
     SET companyname = $1, nome_fantasia = $2, contactperson = $3, phone = $4, region = $5, cnpj = $6, email = $7,
         street = $8, number = $9, complement = $10, neighborhood = $11, city = $12, zipcode = $13
     WHERE id = $14 AND tenant_id = $15
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
