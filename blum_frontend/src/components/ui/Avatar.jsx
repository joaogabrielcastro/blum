const PASTELS = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
];

function hashHue(seed = "") {
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i += 1) h = (h + s.charCodeAt(i) * 17) % PASTELS.length;
  return PASTELS[h];
}

/**
 * Minimal initials avatar with pastel palette (no generic solid blue block).
 */
export default function Avatar({
  name = "",
  size = "md",
  className = "",
}) {
  const initial = (String(name).trim().charAt(0) || "?").toUpperCase();
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };
  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${sizes[size] || sizes.md} ${hashHue(name)} ${className}`}
      aria-hidden
    >
      {initial}
    </div>
  );
}
