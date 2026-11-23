import Button from "./Button";

/**
 * Painel base: superfície definida por borda (sem blur/sombra pesada).
 */
export default function Surface({
  as: Tag = "div",
  className = "",
  children,
  padded = true,
  ...rest
}) {
  return (
    <Tag
      className={`rounded-2xl border border-edge bg-surface ${
        padded ? "p-4 sm:p-5" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export { Surface as Panel };

export function PageHeader({ title, description, actions, meta }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-muted">
            {description}
          </p>
        ) : null}
        {meta ? <div className="mt-2">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Indicador numérico (KPI). Use `onClick` para torná-lo navegável.
 */
export function Stat({ label, value, hint, tone = "default", onClick, className = "" }) {
  const valueTone =
    tone === "success"
      ? "text-emerald-700"
      : tone === "warning"
        ? "text-amber-700"
        : "text-ink";
  const content = (
    <>
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className={`mt-1.5 text-2xl font-semibold tracking-tight tabular-nums ${valueTone}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </>
  );
  const base = `rounded-2xl border border-edge bg-surface p-4 text-left ${className}`;
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} transition-colors hover:border-brand/40 hover:bg-surface-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40`}
      >
        {content}
      </button>
    );
  }
  return <div className={base}>{content}</div>;
}

/* Atalhos legados — delegam para o Button único. */
export function PrimaryButton(props) {
  return <Button variant="primary" {...props} />;
}

export function SecondaryButton(props) {
  return <Button variant="secondary" {...props} />;
}

export function GhostButton(props) {
  return <Button variant="ghost" {...props} />;
}

