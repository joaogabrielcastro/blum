import { getOrderStatusMeta } from "../../utils/orderStatus";

const TONE_CLASS = {
  success:
    "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800",
  warning:
    "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800",
  info: "bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-800",
  danger:
    "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-200 dark:border-red-800",
  neutral: "bg-surface-muted text-ink border-edge",
};

/**
 * Badge de status semântico. Use `status` para pedidos (normaliza PT/EN)
 * ou `label` + `tone` para qualquer outro uso.
 */
export default function StatusBadge({
  status,
  label,
  tone = "neutral",
  className = "",
}) {
  const meta = status != null ? getOrderStatusMeta(status) : null;
  const text = label ?? meta?.label ?? "—";
  const resolvedTone = meta?.tone ?? tone;
  const colors = TONE_CLASS[resolvedTone] || TONE_CLASS.neutral;

  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold ${colors} ${className}`}
    >
      {text}
    </span>
  );
}
