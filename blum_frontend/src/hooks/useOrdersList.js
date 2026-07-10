import { useState, useEffect, useMemo, useCallback } from "react";
import apiService from "../services/apiService";
import formatCurrency, { formatOrderData } from "../utils/format";
import { getClientDisplayName } from "../utils/clients";
import { orderSellerUserKey } from "../utils/orderApiFields";
import {
  getCachedClients,
  listPendingOrders,
  pendingOrderToListItem,
  isBrowserOnline,
} from "../offline";
import {
  groupOrdersByDay,
  buildSellerOptions,
} from "../utils/ordersListUtils";

/** Lista de pedidos: fetch, clientes, filtros e agrupamento por dia. */
export function useOrdersList({ sharedClientsList, toast, userId, userRole }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState({});
  const [clientsList, setClientsList] = useState([]);
  const [listFetchError, setListFetchError] = useState(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [sellerFilterKey, setSellerFilterKey] = useState("");
  const [visibleDayGroups, setVisibleDayGroups] = useState(10);
  const [offlinePendingOrders, setOfflinePendingOrders] = useState([]);

  const applyClientsList = useCallback((list) => {
    setClientsList(list);
    const clientsMap = {};
    list.forEach((client) => {
      const id = client.id ?? client.Id;
      if (id == null) return;
      clientsMap[id] =
        getClientDisplayName(client) ||
        (client.cnpj != null && String(client.cnpj).trim()
          ? `CNPJ ${String(client.cnpj).trim()}`
          : "");
    });
    setClients(clientsMap);
    return clientsMap;
  }, []);

  const loadOfflinePendingOrders = useCallback(async (clientsMap = {}) => {
    try {
      const pending = await listPendingOrders();
      setOfflinePendingOrders(
        pending.map((entry) => pendingOrderToListItem(entry, clientsMap)),
      );
    } catch (error) {
      console.error("Erro ao carregar orçamentos offline:", error);
    }
  }, []);

  const loadCachedClientsIfNeeded = useCallback(async () => {
    const cached = await getCachedClients();
    if (!cached.length) return false;
    applyClientsList(cached);
    toast.info(
      "Sem internet — usando clientes guardados neste aparelho para o orçamento.",
    );
    return true;
  }, [applyClientsList, toast]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setListFetchError(null);
      const ordersData = await apiService.getOrders({});
      const formattedOrders = ordersData.map((order) => formatOrderData(order));
      setOrders(formattedOrders);

      const clientsMap = applyClientsList(sharedClientsList);
      await loadOfflinePendingOrders(clientsMap);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      const usedCache = await loadCachedClientsIfNeeded();
      await loadOfflinePendingOrders();
      if (!usedCache && !isBrowserOnline()) {
        const msg =
          error?.message ||
          "Sem internet e sem dados locais. Baixe os dados offline antes de ir para o campo.";
        setListFetchError(msg);
        toast.error(msg);
      } else if (!usedCache) {
        const msg =
          error?.message || "Não foi possível carregar pedidos e clientes.";
        setListFetchError(msg);
        toast.error(msg);
      } else {
        setListFetchError(null);
      }
    } finally {
      setLoading(false);
    }
  }, [
    sharedClientsList,
    applyClientsList,
    loadOfflinePendingOrders,
    loadCachedClientsIfNeeded,
    toast,
  ]);

  useEffect(() => {
    if (userId && userRole) fetchData();
  }, [userId, userRole, fetchData]);

  useEffect(() => {
    setVisibleDayGroups(10);
  }, [orderSearch, orders.length, sellerFilterKey]);

  const sellerOptions = useMemo(() => buildSellerOptions(orders), [orders]);

  const ordersForList = useMemo(() => {
    const merged = [...offlinePendingOrders, ...orders];
    if (!sellerFilterKey) return merged;
    return merged.filter(
      (o) => o.isOfflinePending || orderSellerUserKey(o) === sellerFilterKey,
    );
  }, [orders, offlinePendingOrders, sellerFilterKey]);

  const ordersByDay = useMemo(
    () => groupOrdersByDay(ordersForList),
    [ordersForList],
  );

  const filteredOrdersByDay = useMemo(() => {
    const term = orderSearch.trim().toLocaleLowerCase("pt-BR");
    if (!term) return ordersByDay;
    return ordersByDay
      .map((group) => ({
        ...group,
        orders: group.orders.filter((order) => {
          const clientLabel = clients[order.clientId] || "";
          const haystack = [
            order.id,
            order.description,
            order.status,
            order.representadas,
            order.sellerName,
            order.sellerUsername,
            clientLabel,
          ]
            .map((v) => String(v || "").toLocaleLowerCase("pt-BR"))
            .join(" ");
          return haystack.includes(term);
        }),
      }))
      .filter((group) => group.orders.length > 0);
  }, [ordersByDay, orderSearch, clients]);

  const filteredOrdersByDayPaged = useMemo(
    () => filteredOrdersByDay.slice(0, visibleDayGroups),
    [filteredOrdersByDay, visibleDayGroups],
  );

  return {
    orders,
    setOrders,
    loading,
    clients,
    clientsList,
    listFetchError,
    orderSearch,
    setOrderSearch,
    sellerFilterKey,
    setSellerFilterKey,
    visibleDayGroups,
    setVisibleDayGroups,
    offlinePendingOrders,
    sellerOptions,
    filteredOrdersByDay,
    filteredOrdersByDayPaged,
    fetchData,
    formatCurrency,
  };
}
