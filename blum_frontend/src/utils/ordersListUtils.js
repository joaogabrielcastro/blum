import {
  orderSellerUserKey,
  orderSellerName,
  orderSellerUsername,
} from "../utils/orderApiFields";

export function formatOpenDays(createdAt, status) {
  if (!createdAt || status === "Entregue") return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(
    0,
    Math.floor((Date.now() - d.getTime()) / 86400000),
  );
}

export function formatDaySectionLabel(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const thatDay = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tt = new Date(thatDay);
  tt.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today - tt) / 86400000);
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  return thatDay.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function groupOrdersByDay(orders) {
  const groups = new Map();
  for (const order of orders) {
    const raw = order.createdAt ?? order.createdat;
    if (!raw) continue;
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) continue;
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(order);
  }
  const keys = [...groups.keys()].sort((a, b) => b.localeCompare(a));
  return keys.map((dateKey) => ({
    dateKey,
    label: formatDaySectionLabel(dateKey),
    orders: groups.get(dateKey),
  }));
}

export function buildSellerOptions(orders) {
  const byKey = new Map();
  for (const order of orders) {
    const key = orderSellerUserKey(order);
    if (byKey.has(key)) continue;
    const name = orderSellerName(order);
    const user = orderSellerUsername(order);
    const label = name && user ? `${name} (@${user})` : name || user || key;
    byKey.set(key, { key, label });
  }
  return [...byKey.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "pt-BR"),
  );
}
