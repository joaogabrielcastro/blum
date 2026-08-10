import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import apiService from "../services/apiService";
import SalesChart from "../components/SalesChart";
import LoadingSpinner from "../components/LoadingSpinner";
import StatusBadge from "../components/ui/StatusBadge";
import Surface, {
  PageHeader,
  PrimaryButton,
  GhostButton,
} from "../components/ui/Surface";
import {
  orderCreatedAt,
  formatOrderDateLabel,
  prepareCumulativeSalesChartData,
} from "../utils/orderApiFields";
import { useAppData } from "../context/AppDataProvider";

const Dashboard = ({ onNavigate, userId, userRole }) => {
  const navigate = useNavigate();
  const { clientsList } = useAppData();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    clients: 0,
    products: 0,
    orders: 0,
    revenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [currentDate, setCurrentDate] = useState("");
  const mountedRef = useRef(false);

  const loadDashboard = useCallback(
    async (opts = { showSpinner: true }) => {
      try {
        if (opts.showSpinner) setLoading(true);

        const [productsResponse, ordersResponse, salesResponse] =
          await Promise.all([
            apiService.getProducts("all", 1, 1),
            apiService.getOrders({ limit: 50 }),
            apiService.getReportStats({}),
          ]);

        const ordersList = Array.isArray(ordersResponse) ? ordersResponse : [];

        const clientsCount = clientsList.length;
        const productsCount =
          productsResponse?.pagination?.total ??
          (Array.isArray(productsResponse?.data)
            ? productsResponse.data.length
            : 0);

        setStats({
          clients: clientsCount,
          products: productsCount,
          orders: salesResponse?.totalOrders ?? 0,
          revenue: salesResponse?.totalSales ?? 0,
        });

        setRecentOrders(ordersList.slice(0, 5));

        const finishedOrders = ordersList.filter(
          (order) => order.status === "Entregue",
        );

        setSalesData(prepareCumulativeSalesChartData(finishedOrders));
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
      } finally {
        if (opts.showSpinner) setLoading(false);
      }
    },
    [clientsList],
  );

  useEffect(() => {
    const formatDate = () => {
      const today = new Date();
      const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      setCurrentDate(today.toLocaleDateString("pt-BR", options));
    };

    formatDate();
    loadDashboard({ showSpinner: true });
    mountedRef.current = true;
  }, [loadDashboard, userId, userRole]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && mountedRef.current) {
        loadDashboard({ showSpinner: false });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadDashboard]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  if (loading) {
    return <LoadingSpinner message="Carregando painel…" />;
  }

  const kpis = [
    {
      key: "orders",
      label: "Pedidos",
      value: stats.orders,
      hint: "Total registrados",
      page: "orders",
    },
    {
      key: "revenue",
      label: "Receita",
      value: formatCurrency(stats.revenue),
      hint: "Total acumulado",
      page: "reports",
    },
    {
      key: "clients",
      label: "Clientes",
      value: stats.clients,
      hint: "Cadastrados",
      page: "clients",
    },
    {
      key: "products",
      label: "Produtos",
      value: stats.products,
      hint: "No catálogo",
      page: "products",
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
          <PageHeader
            title="Painel"
            description={currentDate}
            actions={
              <PrimaryButton onClick={() => navigate("/orders/new")}>
                Novo orçamento
              </PrimaryButton>
            }
          />

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <button
                key={kpi.key}
                type="button"
                onClick={() => onNavigate(kpi.page)}
                className="rounded-2xl border border-edge bg-surface p-5 text-left shadow-soft transition-colors hover:border-brand/30 hover:bg-brand-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
              >
                <p className="text-sm font-medium text-ink-muted">{kpi.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  {kpi.value}
                </p>
                <p className="mt-1 text-xs text-ink-muted">{kpi.hint}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Surface className="xl:col-span-2 flex min-h-[320px] flex-col">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-ink">
                  Desempenho de vendas
                </h2>
                <GhostButton
                  onClick={() => onNavigate("reports")}
                  className="!px-2 !py-1.5 text-brand hover:text-brand-700"
                >
                  Ver relatórios
                </GhostButton>
              </div>
              <div className="min-h-[260px] flex-1">
                <SalesChart data={salesData} simplified={true} />
              </div>
            </Surface>

            <Surface className="flex min-h-[320px] flex-col">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-ink">
                  Atividade recente
                </h2>
                <GhostButton
                  onClick={() => onNavigate("orders")}
                  className="!px-2 !py-1.5 text-brand hover:text-brand-700"
                >
                  Ver todos
                </GhostButton>
              </div>
              <div className="flex-1 space-y-2 overflow-auto">
                {recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-edge px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          Pedido #{order.id}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {formatOrderDateLabel(orderCreatedAt(order))}
                        </p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                  ))
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                    <p className="text-sm font-medium text-ink">
                      Nenhum pedido recente
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      Crie um orçamento para começar.
                    </p>
                    <PrimaryButton
                      className="mt-4"
                      onClick={() => navigate("/orders/new")}
                    >
                      Novo orçamento
                    </PrimaryButton>
                  </div>
                )}
              </div>
            </Surface>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
