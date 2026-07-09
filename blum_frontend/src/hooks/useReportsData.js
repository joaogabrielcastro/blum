import { useState, useEffect, useCallback, useRef } from "react";
import apiService from "../services/apiService";
import { useAppData } from "../context/AppDataProvider";
import {
  monthYearKey,
  getPreviousCalendarMonth,
} from "../utils/orderApiFields";

const now = new Date();
export const defaultMonthKey = monthYearKey(now.getFullYear(), now.getMonth() + 1);

export function parseMonthKey(key) {
  const [y, m] = String(key).split("-").map(Number);
  return { year: y, month: m };
}

/** Carrega pedidos, resumos mensais e meta de vendas. */
export function useReportsData({ userRole, userId }) {
  const { clientsList } = useAppData();
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonthKey, setSelectedMonthKey] = useState(defaultMonthKey);
  const [monthlySummaries, setMonthlySummaries] = useState([]);
  const [salesTarget, setSalesTarget] = useState(null);
  const [targetDraft, setTargetDraft] = useState("");
  const [savingTarget, setSavingTarget] = useState(false);
  const [sellerFilterKey, setSellerFilterKey] = useState("");
  const [clients, setClients] = useState({});
  const [usersById, setUsersById] = useState({});
  const mountedRef = useRef(false);

  const { year: selectedYear, month: selectedMonth } =
    parseMonthKey(selectedMonthKey);
  const previousMonth = getPreviousCalendarMonth(selectedYear, selectedMonth);

  const targetSellerKey =
    userRole === "salesperson" ? String(userId) : sellerFilterKey || null;

  const fetchReports = useCallback(
    async (opts = { showSpinner: true }) => {
      try {
        if (opts.showSpinner) setLoading(true);
        const summarySellerArg =
          userRole === "salesperson" ? userId : sellerFilterKey || undefined;

        const [ordersData, usersData, summariesData] = await Promise.all([
          apiService.getOrders({}),
          userRole === "admin"
            ? apiService.getUsers().catch(() => [])
            : Promise.resolve([]),
          apiService.getMonthlySalesSummaries(summarySellerArg).catch(() => []),
        ]);

        const clientsMap = {};
        clientsList.forEach((client) => {
          const cid = client.id;
          clientsMap[cid] = client.companyName || client.companyname;
        });
        setClients(clientsMap);

        const teamMap = {};
        if (Array.isArray(usersData)) {
          usersData.forEach((u) => {
            if (u?.id != null) teamMap[String(u.id)] = u;
          });
        }
        setUsersById(teamMap);

        const finishedOrders = ordersData.filter(
          (order) => order.status === "Entregue",
        );
        setAllOrders(finishedOrders);
        setMonthlySummaries(Array.isArray(summariesData) ? summariesData : []);
      } catch (error) {
        console.error("Erro ao buscar relatórios:", error);
      } finally {
        if (opts.showSpinner) setLoading(false);
      }
    },
    [userRole, sellerFilterKey, userId, clientsList],
  );

  const loadSalesTarget = useCallback(async () => {
    try {
      const data = await apiService.getSalesTarget({
        year: selectedYear,
        month: selectedMonth,
        sellerUserId: targetSellerKey,
      });
      const amount = data?.targetAmount ?? null;
      setSalesTarget(amount);
      setTargetDraft(amount != null ? String(amount) : "");
    } catch (error) {
      console.error("Erro ao buscar meta:", error);
      setSalesTarget(null);
      setTargetDraft("");
    }
  }, [selectedYear, selectedMonth, targetSellerKey]);

  const saveSalesTarget = useCallback(
    async (amount) => {
      setSavingTarget(true);
      try {
        await apiService.saveSalesTarget({
          year: selectedYear,
          month: selectedMonth,
          targetAmount: amount,
          sellerUserId: targetSellerKey,
        });
        setSalesTarget(amount);
        setTargetDraft(String(amount));
      } finally {
        setSavingTarget(false);
      }
    },
    [selectedYear, selectedMonth, targetSellerKey],
  );

  useEffect(() => {
    if (userId && userRole) {
      fetchReports({ showSpinner: true });
      mountedRef.current = true;
    }
  }, [userRole, userId, fetchReports]);

  useEffect(() => {
    loadSalesTarget();
  }, [loadSalesTarget]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && mountedRef.current) {
        fetchReports({ showSpinner: false });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchReports]);

  return {
    allOrders,
    monthlySummaries,
    loading,
    selectedMonthKey,
    setSelectedMonthKey,
    monthlySummaries,
    salesTarget,
    targetDraft,
    setTargetDraft,
    savingTarget,
    sellerFilterKey,
    setSellerFilterKey,
    clients,
    usersById,
    selectedYear,
    selectedMonth,
    previousMonth,
    targetSellerKey,
    fetchReports,
    saveSalesTarget,
  };
}
