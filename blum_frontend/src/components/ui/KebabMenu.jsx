import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Discrete ⋯ action menu for list rows.
 * items: [{ id, label, onClick, tone?: 'default'|'danger'|'muted', icon? }]
 */
export default function KebabMenu({ items = [], align = "right", label = "Ações" }) {
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
      const menuW = 196;
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
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-zinc-400 transition-all duration-200 ease-in-out hover:border-zinc-200/80 hover:bg-zinc-50 hover:text-zinc-700 active:scale-[0.98]"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ top: coords.top, left: coords.left }}
              className="fixed z-[80] w-[196px] overflow-hidden rounded-xl border border-zinc-200/80 bg-white/95 p-1 shadow-glass backdrop-blur-md animate-fade-in"
            >
              {items.map((item) => {
                const tone =
                  item.tone === "danger"
                    ? "text-red-600 hover:bg-red-50"
                    : item.tone === "muted"
                      ? "text-zinc-500 hover:bg-zinc-50"
                      : "text-zinc-800 hover:bg-zinc-50";
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
                    {item.label}
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
