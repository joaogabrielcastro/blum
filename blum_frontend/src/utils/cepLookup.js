/**
 * Consulta ViaCEP (público). Retorna null se CEP inválido / não encontrado.
 */
export async function lookupCep(zipcode) {
  const clean = String(zipcode || "").replace(/\D/g, "");
  if (clean.length !== 8) return null;
  const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
  if (!response.ok) {
    throw new Error("Não foi possível consultar o CEP.");
  }
  const data = await response.json();
  if (data?.erro) return null;
  return {
    street: data.logradouro || "",
    neighborhood: data.bairro || "",
    city: data.localidade || "",
    region: data.uf || "",
    zipcode: clean,
    complement: data.complemento || "",
  };
}

export function formatCepDisplay(zipcode) {
  const clean = String(zipcode || "").replace(/\D/g, "").slice(0, 8);
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 5)}-${clean.slice(5)}`;
}
