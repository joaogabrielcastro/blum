import {
  addPendingOrder,
  countPendingOrders,
  deletePendingOrder,
  getAllPendingOrders,
} from "./db";

export async function enqueuePendingOrder({
  payload,
  clientLabel,
  totalPrice,
}) {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const entry = {
    id,
    queuedAt: new Date().toISOString(),
    payload,
    clientLabel: clientLabel || "Cliente",
    totalPrice: totalPrice || 0,
  };

  await addPendingOrder(entry);
  return entry;
}

export async function getPendingOrdersCount() {
  return countPendingOrders();
}

export async function listPendingOrders() {
  return getAllPendingOrders();
}

export async function syncPendingOrders(api) {
  const pending = await getAllPendingOrders();
  const result = { synced: 0, failed: [] };

  for (const entry of pending) {
    try {
      await api.createOrder(entry.payload);
      await deletePendingOrder(entry.id);
      result.synced += 1;
    } catch (error) {
      result.failed.push({
        id: entry.id,
        message: error?.message || "Falha ao enviar orçamento.",
      });
    }
  }

  return result;
}

export function pendingOrderToListItem(entry, clientsMap = {}) {
  const clientId = entry.payload?.clientid ?? entry.payload?.clientId;
  const clientName =
    entry.clientLabel ||
    clientsMap[clientId] ||
    (clientId ? `Cliente #${clientId}` : "Cliente");

  return {
    id: `offline-${entry.id}`,
    offlinePendingId: entry.id,
    isOfflinePending: true,
    clientId,
    clientid: clientId,
    clientName,
    description: entry.payload?.description || "",
    status: "Aguardando envio",
    documentType: "orcamento",
    document_type: "orcamento",
    paymentMethod: entry.payload?.payment_method ?? entry.payload?.paymentMethod,
    totalPrice: entry.totalPrice ?? entry.payload?.totalprice ?? 0,
    totalprice: entry.totalPrice ?? entry.payload?.totalprice ?? 0,
    createdAt: entry.queuedAt,
    createdat: entry.queuedAt,
    items: entry.payload?.items || [],
    discount: entry.payload?.discount || 0,
  };
}
