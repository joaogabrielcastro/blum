/**
 * Compact theme switcher: Claro / Escuro / Sistema.
 */
import { useTheme } from "../../context/ThemeContext";

const OPTIONS = [
  { id: "light", label: "Claro", title: "Tema claro" },
  { id: "dark", label: "Escuro", title: "Tema escuro" },
  { id: "system", label: "Auto", title: "Seguir sistema" },
];

export default function ThemeToggle({ className = "" }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={`inline-flex rounded-xl border border-edge bg-surface-muted p-0.5 ${className}`}
      role="group"
      aria-label="Tema da interface"
    >
      {OPTIONS.map((opt) => {
        const active = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            title={opt.title}
            aria-pressed={active}
            onClick={() => setTheme(opt.id)}
            className={`min-h-9 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
              active
                ? "bg-surface text-ink shadow-soft"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
