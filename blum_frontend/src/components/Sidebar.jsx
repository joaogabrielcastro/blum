import { NavLink } from "react-router-dom";
import Avatar from "./ui/Avatar";
import ThemeToggle from "./ui/ThemeToggle";

export const Icon = {
  panel: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  orders: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  purchases: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  clients: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M20 8v6M23 11h-6" />
    </svg>
  ),
  products: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  ),
  reports: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  team: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  subscription: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  platform: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  logout: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

function buildNavGroups({ userRole, isPlatformAdmin }) {
  const isAdmin = userRole === "admin";

  const groups = [
    {
      id: "operacao",
      label: "Operação",
      items: [
        { to: "/dashboard", label: "Painel", icon: Icon.panel },
        { to: "/orders", label: "Pedidos", icon: Icon.orders },
        ...(isAdmin
          ? [{ to: "/purchases", label: "Compras", icon: Icon.purchases }]
          : []),
      ],
    },
    {
      id: "cadastros",
      label: "Cadastros",
      items: [
        { to: "/clients", label: "Clientes", icon: Icon.clients },
        { to: "/products", label: "Produtos", icon: Icon.products },
      ],
    },
    {
      id: "analise",
      label: "Análise",
      items: [{ to: "/reports", label: "Relatórios", icon: Icon.reports }],
    },
  ];

  if (isAdmin) {
    groups.push({
      id: "conta",
      label: "Conta",
      items: [
        { to: "/team", label: "Equipe", icon: Icon.team },
        { to: "/subscription", label: "Assinatura", icon: Icon.subscription },
      ],
    });
  }

  if (isPlatformAdmin) {
    groups.push({
      id: "sistema",
      label: "Sistema",
      items: [
        { to: "/platform", label: "Plataforma", icon: Icon.platform },
      ],
    });
  }

  return groups;
}

function NavItem({ to, label, icon, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
          isActive
            ? "bg-surface-muted text-ink [&_svg]:text-brand"
            : "text-ink-muted hover:bg-surface-muted/70 hover:text-ink"
        }`
      }
    >
      <span className="shrink-0 [&_svg]:h-[18px] [&_svg]:w-[18px]">{icon}</span>
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export function roleLabelFor(userRole) {
  if (userRole === "admin") return "Administrador";
  if (["salesperson", "seller", "representante"].includes(userRole)) {
    return "Vendedor";
  }
  return userRole || "";
}

const Sidebar = ({
  isOpen,
  onClose,
  onLogout,
  userRole,
  isPlatformAdmin,
  username,
  displayName,
  companyName,
}) => {
  const groups = buildNavGroups({ userRole, isPlatformAdmin });
  const name = String(displayName || username || "").trim() || "Usuário";
  const roleLabel = roleLabelFor(userRole);

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 flex w-4/5 max-w-xs transform flex-col
        border-r border-edge bg-surface text-ink
        transition-transform duration-200 ease-out
        md:relative md:w-60 md:max-w-none md:translate-x-0
        ${isOpen ? "translate-x-0 shadow-pop" : "-translate-x-full"}
      `}
      aria-label="Navegação principal"
    >
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white">
          B
        </div>
        <div className="min-w-0">
          <div
            className="truncate text-sm font-semibold leading-tight text-ink"
            title={companyName || undefined}
          >
            {companyName || "Blum"}
          </div>
          <div className="truncate text-xs text-ink-muted">
            {companyName ? "Blum · Gestão comercial" : "Gestão comercial"}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        <ul className="space-y-4">
          {groups.map((group) => (
            <li key={group.id}>
              <p className="mb-1 px-2.5 text-[11px] font-medium text-ink-muted/80">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavItem
                      to={item.to}
                      label={item.label}
                      icon={item.icon}
                      onNavigate={onClose}
                    />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      <div className="safe-bottom mt-auto space-y-2 border-t border-edge p-2.5">
        <ThemeToggle className="w-full [&>button]:flex-1" />
        <div className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5">
          <Avatar name={name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{name}</p>
            {roleLabel ? (
              <p className="truncate text-xs text-ink-muted">{roleLabel}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="Sair"
            aria-label="Sair"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 [&_svg]:h-[18px] [&_svg]:w-[18px]"
          >
            {Icon.logout}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
