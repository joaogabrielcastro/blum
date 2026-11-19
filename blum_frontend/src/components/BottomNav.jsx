import { NavLink, useNavigate } from "react-router-dom";
import { Icon } from "./Sidebar";

const ITEMS = [
  { to: "/dashboard", label: "Painel", icon: Icon.panel },
  { to: "/orders", label: "Pedidos", icon: Icon.orders },
  null, // ação central
  { to: "/clients", label: "Clientes", icon: Icon.clients },
  { to: "/products", label: "Produtos", icon: Icon.products },
];

/**
 * Navegação inferior do celular: as áreas de uso diário a um toque e
 * "Novo orçamento" sempre disponível no centro.
 */
export default function BottomNav() {
  const navigate = useNavigate();

  return (
    <nav
      aria-label="Navegação rápida"
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-edge bg-surface md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {ITEMS.map((item) =>
          item ? (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium touch-manipulation [&_svg]:h-5 [&_svg]:w-5 ${
                    isActive ? "text-brand" : "text-ink-muted"
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            </li>
          ) : (
            <li key="new" className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => navigate("/orders/new")}
                aria-label="Novo orçamento"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
