export const DECIMAL_QUANTITY_BRANDS = new Set(["solo fino", "colombocal"]);

export const normalizeBrandName = (brand) =>
  String(brand || "")
    .trim()
    .toLocaleLowerCase("pt-BR");

export const allowsDecimalQuantityBrand = (brand) =>
  DECIMAL_QUANTITY_BRANDS.has(normalizeBrandName(brand));

export const parseQuantityByBrand = (value, brand) => {
  const raw = String(value ?? "")
    .trim()
    .replace(",", ".");
  const parsed = parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  if (allowsDecimalQuantityBrand(brand)) {
    return Math.round(parsed * 1000) / 1000;
  }
  return Math.max(1, Math.round(parsed));
};

export const toDateTimeLocalValue = (dateInput) => {
  const dt = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(dt.getTime())) return "";
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  const hours = String(dt.getHours()).padStart(2, "0");
  const minutes = String(dt.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const safeToFixed = (value, decimals = 2) => {
  const num = parseFloat(value);
  if (isNaN(num)) return "0.00";
  return num.toFixed(decimals);
};
