import { useState } from "react";
import ThemeToggle from "../ui/ThemeToggle";

const FEATURES = [
  "Orçamentos e pedidos em tempo real",
  "Gestão de clientes e representadas",
  "Relatórios e equipe comercial integrados",
];

const themeToggleOnDark =
  "border-white/20 bg-white/10 [&_button]:text-slate-300 [&_button[aria-pressed=true]]:bg-white [&_button[aria-pressed=true]]:text-slate-900 [&_button[aria-pressed=true]]:shadow-none";

export function AuthBrandMark({ size = "md" }) {
  const [logoError, setLogoError] = useState(false);
  const sizes = {
    sm: "h-10 w-10 rounded-xl text-base",
    md: "h-12 w-12 rounded-xl text-lg",
    lg: "h-14 w-14 rounded-2xl text-xl",
  };

  if (!logoError) {
    return (
      <img
        src="/images/BLU1M.jpg"
        alt=""
        className={`${sizes[size]} object-cover ring-1 ring-white/25`}
        onError={() => setLogoError(true)}
      />
    );
  }

  return (
    <div
      className={`flex ${sizes[size]} items-center justify-center bg-brand font-bold text-white shadow-soft ring-1 ring-white/25`}
      aria-hidden
    >
      B
    </div>
  );
}

/**
 * Shell compartilhado de autenticação (Login / Signup).
 */
export default function AuthShell({
  children,
  headline = "Vendas, clientes e equipe no mesmo lugar.",
  description = "Plataforma para representantes comerciais que precisam de agilidade no campo e controle na operação.",
}) {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-surface-page lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
      <aside className="relative hidden overflow-hidden bg-slate-950 px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">

        <div className="relative z-10 flex items-center gap-3">
          <AuthBrandMark size="md" />
          <div>
            <p className="text-2xl font-semibold tracking-tight">Blum</p>
            <p className="text-sm text-slate-300">Gestão comercial</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-blue-300">Operação comercial, simplificada</p>
          <h2 className="text-4xl font-semibold leading-[1.15] tracking-[-0.03em]">
            {headline}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300">
            {description}
          </p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-3 text-sm text-slate-200"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/25 text-blue-200">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            © {year} JW Soluções · Blum
          </p>
          <ThemeToggle className={themeToggleOnDark} />
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-6 py-7 text-white lg:hidden">
          <div className="flex items-center gap-3">
            <AuthBrandMark size="sm" />
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Blum</h1>
              <p className="text-sm text-slate-300">Gestão comercial</p>
            </div>
          </div>
          <ThemeToggle className={themeToggleOnDark} />
        </div>

        <div className="relative flex flex-1 flex-col justify-center overflow-hidden px-4 py-8 sm:px-8 lg:px-14 lg:py-10 xl:px-20">
          <div className="mx-auto w-full max-w-md">{children}</div>
          <p className="mt-6 text-center text-xs text-ink-muted lg:hidden">
            © {year} JW Soluções · Blum
          </p>
        </div>
      </div>
    </div>
  );
}
