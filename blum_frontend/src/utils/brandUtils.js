/** Corrige problemas de encoding em nomes de representada */
export const fixEncoding = (str) => {
  if (!str || typeof str !== "string") return "";

  try {
    return decodeURIComponent(escape(str));
  } catch {
    return str;
  }
};

/** Normaliza item de representada vindo da API */
export const normalizeBrand = (brand) => {
  const displayName =
    typeof brand?.name === "string"
      ? brand.name
      : brand?.name && typeof brand.name === "object"
        ? brand.name.label || brand.name.value || "Nome inválido"
        : String(brand?.name || "Sem nome");

  const commissionValue =
    typeof brand?.commission_rate === "number"
      ? brand.commission_rate
      : typeof brand?.commission_rate === "string"
        ? parseFloat(brand.commission_rate) || 0
        : brand?.commission_rate && typeof brand.commission_rate === "object"
          ? parseFloat(
              brand.commission_rate.value || brand.commission_rate.rate,
            ) || 0
          : 0;

  const brandId = brand?.id || displayName;

  return {
    id: brandId,
    displayName: fixEncoding(displayName),
    commission: commissionValue,
    raw: brand,
  };
};
