/** Nome da empresa para exibição — cobre respostas crus do PG e aliases legados. */
export function getClientDisplayName(client) {
  if (!client) return "";
  const candidates = [
    client.companyName,
    client.companyname,
    client.company_name,
    client.name,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim() !== "") return String(c).trim();
  }
  return "";
}
