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

  const rawCommission =
    brand?.commission_rate ?? brand?.commissionRate ?? brand?.commission;

  const commissionValue =
    typeof rawCommission === "number"
      ? rawCommission
      : typeof rawCommission === "string"
        ? parseFloat(rawCommission.replace(",", ".")) || 0
        : rawCommission && typeof rawCommission === "object"
          ? parseFloat(
              rawCommission.value || rawCommission.rate,
            ) || 0
          : 0;

  const brandId = brand?.id ?? displayName;
  const rawLogo = brand?.logo_url ?? brand?.logoUrl;
  const logoUrl =
    typeof rawLogo === "string" && rawLogo.trim() !== ""
      ? rawLogo.trim()
      : null;

  return {
    id: brandId,
    displayName: fixEncoding(displayName),
    commission: commissionValue,
    logoUrl,
    raw: brand,
  };
};
