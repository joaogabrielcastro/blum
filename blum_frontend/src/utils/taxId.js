export function onlyTaxIdDigits(value) {
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

export function detectTaxIdType(digits) {
  if (digits.length <= 11) return "cpf";
  return "cnpj";
}

export function validateTaxIdClient(raw) {
  const digits = onlyTaxIdDigits(raw);
  if (!digits) {
    return { ok: false, digits: "", type: null, error: "CNPJ ou CPF é obrigatório" };
  }
  if (digits.length <= 11) {
    if (digits.length < 11) {
      return { ok: false, digits, type: "cpf", error: "CPF deve ter 11 dígitos" };
    }
    if (!validateCpfDigits(digits)) {
      return { ok: false, digits, type: "cpf", error: "CPF inválido" };
    }
    return { ok: true, digits, type: "cpf", error: null };
  }
  if (digits.length < 14) {
    return { ok: false, digits, type: "cnpj", error: "CNPJ deve ter 14 dígitos" };
  }
  const cnpj = digits.slice(0, 14);
  if (!validateCnpjDigits(cnpj)) {
    return { ok: false, digits: cnpj, type: "cnpj", error: "CNPJ inválido" };
  }
  return { ok: true, digits: cnpj, type: "cnpj", error: null };
}

export function formatTaxIdInput(value) {
  const digits = onlyTaxIdDigits(value).slice(0, 14);
  if (digits.length <= 11) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function formatTaxIdLabel(type) {
  return type === "cnpj" ? "CNPJ" : "CPF";
}
