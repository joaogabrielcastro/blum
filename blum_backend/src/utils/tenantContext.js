function requireTenantId(tenantId, label = "tenantId") {
  const id = Number(tenantId);
  if (!Number.isInteger(id) || id < 1) {
    const err = new Error(`${label} é obrigatório`);
    err.statusCode = 400;
    err.expose = true;
    throw err;
  }
  return id;
}

function tenantIdFromAuth(authUser) {
  if (!authUser?.tenantId) {
    const err = new Error("Contexto de tenant ausente");
    err.statusCode = 401;
    err.expose = true;
    throw err;
  }
  return requireTenantId(authUser.tenantId);
}

module.exports = { requireTenantId, tenantIdFromAuth };
