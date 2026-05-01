function pickCreatedAt(row) {
  if (!row) return undefined;
  return row.createdat ?? row.createdAt ?? row.created_at;
}

function pickCompanyName(row) {
  if (!row) return undefined;
  const candidates = [
    row.companyname,
    row.companyName,
    row.company_name,
    row.name,
    row.razao_social,
    row.razaoSocial,
    row.nome_fantasia,
    row.nomeFantasia,
    row.nome,
    row.trade_name,
    row.business_name,
  ];
  for (const value of candidates) {
    if (value == null) continue;
    const normalized = String(value).trim();
    if (normalized !== "") return normalized;
  }
  return undefined;
}

function pickContactPerson(row) {
  if (!row) return undefined;
  return row.contactperson ?? row.contactPerson ?? row.contact_person;
}

function normalizeClientBody(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Dados do cliente inválidos");
  }

  const companyName = pickCompanyName(raw);
  const contactPerson = pickContactPerson(raw);
  const phone = raw.phone ?? raw.telefone ?? "";
  const region = raw.region ?? raw.regiao ?? raw.estado ?? "";
  const email = raw.email != null ? String(raw.email).trim() : "";
  const cnpj = String(raw.cnpj ?? "").replace(/\D/g, "");

  const street =
    raw.street ?? raw.logradouro ?? raw.address ?? raw.endereco ?? "";
  const number = raw.number ?? raw.numero ?? "";
  const complement = raw.complement ?? raw.complemento ?? "";
  const neighborhood = raw.neighborhood ?? raw.bairro ?? "";
  const city = raw.city ?? raw.cidade ?? raw.municipio ?? "";
  const zipRaw = raw.zipcode ?? raw.cep ?? raw.zip ?? "";

  return {
    companyName: companyName != null ? String(companyName).trim() : "",
    contactPerson:
      contactPerson != null && String(contactPerson).trim() !== ""
        ? String(contactPerson).trim()
        : "",
    phone: phone != null ? String(phone).trim() : "",
    region: region != null ? String(region).trim() : "",
    cnpj,
    email,
    street: street != null ? String(street).trim() : "",
    number: number != null ? String(number).trim() : "",
    complement: complement != null ? String(complement).trim() : "",
    neighborhood: neighborhood != null ? String(neighborhood).trim() : "",
    city: city != null ? String(city).trim() : "",
    zipcode: zipRaw != null ? String(zipRaw).trim() : "",
  };
}

function mapClientRow(row) {
  if (!row) return row;
  const companyName = pickCompanyName(row);
  const contactPerson = pickContactPerson(row);
  const cnpj =
    row.cnpj != null && String(row.cnpj).trim() !== ""
      ? String(row.cnpj).trim()
      : undefined;
  const contactLabel =
    contactPerson != null && String(contactPerson).trim() !== ""
      ? String(contactPerson).trim()
      : undefined;
  const displayName =
    companyName || contactLabel || (cnpj ? `CNPJ ${cnpj}` : undefined);

  return {
    ...row,
    companyName,
    contactPerson,
    street: row.street ?? row.logradouro,
    number: row.number ?? row.numero,
    complement: row.complement ?? row.complemento,
    neighborhood: row.neighborhood ?? row.bairro,
    city: row.city ?? row.cidade,
    zipcode: row.zipcode ?? row.cep,
    createdAt: pickCreatedAt(row),
    displayName,
  };
}

function mapClients(rows) {
  return rows.map(mapClientRow);
}

module.exports = {
  normalizeClientBody,
  mapClientRow,
  mapClients,
};
