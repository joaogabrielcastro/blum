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

/** Linhas de endereço para PDF / impressão (cadastro PR). */
export function formatClientAddressLines(client) {
  if (!client) return [];
  const street = client.street ?? client.logradouro ?? "";
  const number = client.number ?? client.numero ?? "";
  const line1 = [street, number]
    .filter((x) => x != null && String(x).trim() !== "")
    .join(", ");
  const nbh = client.neighborhood ?? client.bairro ?? "";
  const city = client.city ?? client.cidade ?? "";
  const line2 = [nbh, city]
    .filter((x) => x != null && String(x).trim() !== "")
    .join(" — ");
  const zip = client.zipcode ?? client.cep ?? "";
  const lines = [];
  if (line1) lines.push(line1);
  if (line2) lines.push(line2);
  if (zip && String(zip).trim() !== "") lines.push(`CEP ${String(zip).trim()}`);
  const comp = client.complement ?? client.complemento ?? "";
  if (comp && String(comp).trim() !== "") lines.push(String(comp).trim());
  return lines;
}
