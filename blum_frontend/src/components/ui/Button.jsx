import { forwardRef } from "react";

const BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation";

const VARIANTS = {
  primary: "bg-brand text-white hover:bg-brand-600",
  secondary:
    "border border-edge bg-surface text-ink hover:bg-surface-muted",
  ghost: "text-ink-muted hover:bg-surface-muted hover:text-ink",
  danger: "bg-red-600 text-white hover:bg-red-500",
  "danger-outline":
    "border border-red-200 bg-surface text-red-700 hover:bg-red-50",
};

const SIZES = {
  sm: "min-h-8 px-2.5 text-xs",
  md: "min-h-10 px-3.5 text-sm",
  lg: "min-h-11 px-4 text-sm",
  icon: "h-10 w-10 p-0",
};

function Spinner() {
  return (
    <span
      aria-hidden
      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

/**
 * Botão único do sistema.
 * `loading` desativa o botão e mostra indicador — evita envio duplicado.
 */
const Button = forwardRef(function Button(
  {
    variant = "secondary",
    size = "md",
    loading = false,
    disabled,
    type = "button",
    className = "",
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${BASE} ${VARIANTS[variant] || VARIANTS.secondary} ${
        SIZES[size] || SIZES.md
      } ${className}`}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
});

export default Button;
