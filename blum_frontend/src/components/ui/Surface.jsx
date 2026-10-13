/**
 * Glass surface container.
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
      className={`rounded-[1.25rem] border border-edge/80 bg-surface/90 shadow-soft backdrop-blur-xl transition-shadow duration-200 hover:shadow-glass ${
        padded ? "p-5 sm:p-6" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function PageHeader({ title, description, actions, meta }) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-[-0.025em] text-ink sm:text-[1.75rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">{description}</p>
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

export function PrimaryButton({
  children,
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.22)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:from-blue-600 hover:to-blue-700 hover:shadow-[0_12px_26px_rgba(37,99,235,0.28)] active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-edge bg-surface/90 px-4 py-2.5 text-sm font-semibold text-ink shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-md transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-brand/30 hover:bg-surface hover:shadow-soft active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-muted transition-all duration-200 ease-in-out hover:bg-surface-muted hover:text-ink active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function DangerButton({
  children,
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 ease-in-out hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
