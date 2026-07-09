function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function allSameDigits(digits) {
  return /^(\d)\1+$/.test(digits);
}

function validateCpfDigits(digits) {
  if (digits.length !== 11 || allSameDigits(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(digits[i]) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  if (rev !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(digits[i]) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  return rev === Number(digits[10]);
}

function validateCnpjDigits(digits) {
  if (digits.length !== 14 || allSameDigits(digits)) return false;

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i += 1) sum += Number(digits[i]) * w1[i];
  let rev = sum % 11;
  rev = rev < 2 ? 0 : 11 - rev;
  if (rev !== Number(digits[12])) return false;

  sum = 0;
  for (let i = 0; i < 13; i += 1) sum += Number(digits[i]) * w2[i];
  rev = sum % 11;
  rev = rev < 2 ? 0 : 11 - rev;
  return rev === Number(digits[13]);
}

function detectTaxIdType(digits) {
  if (digits.length === 11) return "cpf";
  if (digits.length === 14) return "cnpj";
  return null;
}

function validateTenantTaxId(raw) {
  const digits = onlyDigits(raw);
  if (!digits) {
    return { ok: false, taxId: "", type: null, error: "CNPJ ou CPF é obrigatório" };
  }

  const type = detectTaxIdType(digits);
  if (!type) {
    return {
      ok: false,
      taxId: digits,
      type: null,
      error: "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos)",
    };
  }

  const valid = type === "cpf" ? validateCpfDigits(digits) : validateCnpjDigits(digits);
  if (!valid) {
    return {
      ok: false,
      taxId: digits,
      type,
      error: type === "cpf" ? "CPF inválido" : "CNPJ inválido",
    };
  }

  return { ok: true, taxId: digits, type, error: null };
}

function formatTaxIdDisplay(taxId, type) {
  const digits = onlyDigits(taxId);
  if (type === "cpf" && digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (type === "cnpj" && digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return digits;
}

module.exports = {
  onlyDigits,
  validateCpfDigits,
  validateCnpjDigits,
  detectTaxIdType,
  validateTenantTaxId,
  formatTaxIdDisplay,
};
