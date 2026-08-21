/**
 * Campo numérico decimal amigável ao iPhone/Android (vírgula ou ponto).
 * Evita type="number", que no iOS muitas vezes bloqueia a vírgula/ponto.
 */
export default function DecimalInput({
  value,
  onChange,
  disabled = false,
  className = "",
  allowEmpty = false,
  ...rest
}) {
  const display =
    value === "" || value == null
      ? ""
      : typeof value === "number"
        ? String(value)
        : String(value);

  return (
    <input
      type="text"
      inputMode="decimal"
      enterKeyHint="done"
      autoComplete="off"
      disabled={disabled}
      value={display}
      onChange={(e) => {
        const next = sanitize(e.target.value);
        if (!allowEmpty && next === "" && display !== "") {
          onChange?.("");
          return;
        }
        onChange?.(next);
      }}
      className={className}
      {...rest}
    />
  );
}

function sanitize(raw) {
  let s = String(raw ?? "").replace(/[^\d.,]/g, "");
  const sepIndex = Math.max(s.lastIndexOf(","), s.lastIndexOf("."));
  if (sepIndex === -1) return s.replace(/[.,]/g, "");
  const intPart = s.slice(0, sepIndex).replace(/[.,]/g, "");
  const fracPart = s
    .slice(sepIndex + 1)
    .replace(/[.,]/g, "")
    .slice(0, 4);
  const sep = s[sepIndex];
  if (s.endsWith(",") || s.endsWith(".")) return `${intPart}${sep}${fracPart}`;
  return fracPart.length > 0 ? `${intPart}${sep}${fracPart}` : intPart;
}
