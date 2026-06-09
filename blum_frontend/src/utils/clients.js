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

/** CNPJ com máscara quando há 14 dígitos; senão só dígitos informados. */
export function formatCnpjForDisplay(cnpj) {
  const digits = String(cnpj ?? "").replace(/\D/g, "");
  if (digits.length === 14) {
    return digits.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5",
    );
  }
  return digits;
}

/** Cidade e UF/estado em uma linha (ex.: "Curitiba, Paraná"). */
export function getClientCityRegionLine(client) {
  if (!client) return "";
  const city = firstNonEmpty([
    client.city,
    client.cidade,
    client.municipio,
  ]);
  const region = firstNonEmpty([
    client.region,
    client.regiao,
    client.estado,
    client.uf,
  ]);
  if (city && region) return `${city}, ${region}`;
  return city || region || "";
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

/**
 * Dados para busca/seleção de cliente no pedido (linha estilo Mercos: nomes + CNPJ + local).
 */
export function buildClientOrderSearchOption(client, id) {
  if (client == null || id == null) return null;
  const fantasy = firstNonEmpty([
    client.nome_fantasia,
    client.nomeFantasia,
    client.trade_name,
    client.business_name,
  ]);
  const legal = firstNonEmpty([
    client.companyName,
    client.companyname,
    client.company_name,
    client.razao_social,
    client.razaoSocial,
    client.name,
  ]);
  const fallbackName = getClientDisplayName(client);
  const cnpjFmt = formatCnpjForDisplay(client.cnpj);
  const cnpjDigits = String(client.cnpj ?? "").replace(/\D/g, "");

  let primary = "";
  const namesDiffer =
    fantasy &&
    legal &&
    fantasy.localeCompare(legal, "pt-BR", { sensitivity: "accent" }) !== 0;
  if (namesDiffer) {
    primary = cnpjFmt ? `${fantasy} — ${legal} — ${cnpjFmt}` : `${fantasy} — ${legal}`;
  } else {
    const name = fallbackName || legal || fantasy || `Cliente #${id}`;
    primary = cnpjFmt ? `${name} — ${cnpjFmt}` : name;
  }

  const secondary = getClientCityRegionLine(client);
  const label =
    fallbackName ||
    legal ||
    fantasy ||
    (cnpjFmt ? `CNPJ ${cnpjFmt}` : `Cliente #${id}`);

  const filterBlob = [
    primary,
    secondary,
    label,
    cnpjDigits,
    fantasy,
    legal,
    id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    id: String(id),
    label,
    primary,
    secondary,
    fantasyName: fantasy || "",
    legalName: legal || "",
    filterBlob,
  };
}

/** Busca por razão social, fantasia, CNPJ, cidade (várias palavras). */
export function clientMatchesSearchTerm(option, searchTerm) {
  const term = String(searchTerm ?? "").trim().toLowerCase();
  if (!term || !option) return false;

  const digits = term.replace(/\D/g, "");
  const blob = option.filterBlob || "";
  if (String(option.id).includes(term)) return true;
  if (digits.length >= 4 && blob.includes(digits)) return true;

  const words = term.split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  return words.every((word) => blob.includes(word));
}

/** Correspondência exata ao digitar (fantasia, razão ou rótulo exibido). */
export function findClientOptionByTypedValue(options, value) {
  const typed = String(value ?? "").trim().toLowerCase();
  if (!typed) return null;

  return (
    options.find((opt) => {
      const candidates = [
        opt.label,
        opt.primary,
        opt.fantasyName,
        opt.legalName,
      ]
        .filter(Boolean)
        .map((s) => String(s).trim().toLowerCase());
      return candidates.some((c) => c === typed);
    }) || null
  );
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
