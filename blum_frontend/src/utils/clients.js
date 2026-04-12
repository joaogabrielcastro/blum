/** Aceita array direto ou payloads comuns `{ data }` / `{ clients }`. */
export function normalizeClientsResponse(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.clients)) return data.clients;
  return [];
}

function firstNonEmpty(fieldList) {
  for (const v of fieldList) {
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

/** Nome para exibição: empresa, campos de importação BR, contato ou CNPJ. */
export function getClientDisplayName(client) {
  if (!client) return "";
  const label = firstNonEmpty([
    client.displayName,
    client.companyName,
    client.companyname,
    client.company_name,
    client.name,
    client.razao_social,
    client.razaoSocial,
    client.nome_fantasia,
    client.nomeFantasia,
    client.nome,
    client.trade_name,
    client.business_name,
    client.contactPerson,
    client.contactperson,
  ]);
  if (label) return label;
  if (client.cnpj != null && String(client.cnpj).trim() !== "") {
    return `CNPJ ${String(client.cnpj).trim()}`;
  }
  return "";
}
