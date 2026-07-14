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
      className={`rounded-2xl border border-zinc-200/80 bg-white/80 shadow-soft backdrop-blur-md ${
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
    <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.65rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
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

export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 ease-in-out hover:bg-brand-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-soft backdrop-blur-md transition-all duration-200 ease-in-out hover:bg-zinc-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
