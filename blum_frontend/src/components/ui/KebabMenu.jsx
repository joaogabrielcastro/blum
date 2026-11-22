import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Discrete ⋯ action menu for list rows.
 * items: [{ id, label, onClick, tone?: 'default'|'danger'|'muted', icon? }]
 */
export default function KebabMenu({
  items = [],
  align = "right",
  label = "Ações",
  triggerLabel = null,
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return undefined;
    const update = () => {
      const el = btnRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const menuW = 220;
      const left =
        align === "left"
          ? rect.left
          : Math.max(8, rect.right - menuW);
      setCoords({
        top: rect.bottom + 6,
        left,
      });
    };
    update();
    const onDoc = (e) => {
      if (
        menuRef.current?.contains(e.target) ||
        btnRef.current?.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, align]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={triggerLabel ? undefined : label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={
          triggerLabel
            ? "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-edge bg-surface px-3.5 text-sm font-medium text-ink transition-colors hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            : "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-ink-muted transition-colors hover:border-edge hover:bg-surface-muted hover:text-ink"
        }
      >
        {triggerLabel ? (
          <>
            {triggerLabel}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
            </svg>
          </>
        ) : (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="5" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="19" r="1.6" />
          </svg>
        )}
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ top: coords.top, left: coords.left }}
              className="fixed z-[80] w-[220px] overflow-hidden rounded-xl border border-edge bg-surface-elevated p-1 shadow-pop animate-fade-in"
            >
              {items.map((item) => {
                const tone =
                  item.tone === "danger"
                    ? "text-red-600 hover:bg-red-50"
                    : item.tone === "muted"
                      ? "text-ink-muted hover:bg-surface-muted"
                      : "text-ink hover:bg-surface-muted";
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all duration-200 ease-in-out disabled:opacity-40 ${tone}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                      item.onClick?.();
                    }}
                  >
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
