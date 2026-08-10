/**
 * Abas horizontais simples para Progressive Disclosure.
 */
export default function Tabs({ tabs, value, onChange, className = "" }) {
  return (
    <div className={className}>
      <div
        role="tablist"
        className="flex gap-1 overflow-x-auto border-b border-edge pb-px"
      >
        {tabs.map((tab) => {
          const active = tab.id === value;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              id={`tab-${tab.id}`}
              onClick={() => onChange(tab.id)}
              className={`shrink-0 rounded-t-xl px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4 ${
                active
                  ? "border-b-2 border-brand text-brand"
                  : "text-ink-muted hover:bg-surface-muted hover:text-ink"
              }`}
            >
              {tab.label}
              {tab.badge != null ? (
                <span
                  className={`ml-2 rounded-md px-1.5 py-0.5 text-xs font-medium ${
                    active
                      ? "bg-brand-50 text-brand-700 dark:bg-brand/20 dark:text-brand"
                      : "bg-surface-muted text-ink-muted"
                  }`}
                >
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TabPanel({ id, activeId, children, className = "" }) {
  if (id !== activeId) return null;
  return (
    <div
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      className={className}
    >
      {children}
    </div>
  );
}
