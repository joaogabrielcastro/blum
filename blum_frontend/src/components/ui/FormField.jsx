/**
 * Campo de formulário padronizado (label + controle + erro/ajuda).
 */
export default function FormField({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  children,
  className = "",
}) {
  return (
    <div className={className}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
      ) : null}
      {children}
      {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
      {!error && hint ? (
        <p className="mt-1 text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export const inputClassName = (hasError = false) =>
  `w-full rounded-xl border bg-surface px-3 py-2.5 text-sm text-ink transition-all duration-200 placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted ${
    hasError ? "border-red-400" : "border-edge"
  }`;
