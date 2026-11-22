import { Suspense, lazy, useState, useEffect, useCallback } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import SignupPage from "./Pages/SignupPage";
import { verifyToken, logout as apiLogout } from "./services/apiService";
import { useToast } from "./context/ToastContext";
import { AppDataProvider, useAppData } from "./context/AppDataProvider";
import PlanUpgradePrompt from "./components/billing/PlanUpgradePrompt";
import StarterUpgradeBanner from "./components/billing/StarterUpgradeBanner";
import { PLAN_FEATURE_REQUIRED_EVENT } from "./utils/planFeatures";

const Dashboard = lazy(() => import("./Pages/Dashboard"));
const ProductsPage = lazy(() => import("./Pages/ProductsPage"));
const ClientsPage = lazy(() => import("./Pages/ClientsPage"));
const OrdersPage = lazy(() => import("./Pages/OrdersPage"));
const OrderFormPage = lazy(() => import("./Pages/OrderFormPage"));
const PurchasesPage = lazy(() => import("./Pages/PurchasesPage"));
const ReportsPage = lazy(() => import("./Pages/ReportsPage"));
const ClientHistoryPage = lazy(() => import("./Pages/ClientHistoryPage"));
const TeamPage = lazy(() => import("./Pages/TeamPage"));
const SubscriptionPage = lazy(() => import("./Pages/SubscriptionPage"));
const PlatformAdminPage = lazy(() => import("./Pages/PlatformAdminPage"));

const PAGE_PATH = {
  dashboard: "/dashboard",
  products: "/products",
  clients: "/clients",
  orders: "/orders",
  reports: "/reports",
  purchases: "/purchases",
  team: "/team",
  subscription: "/subscription",
  platform: "/platform",
};

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-edge border-t-brand" />
    </div>
  );
}

function AuthenticatedApp({
  user,
  userRole,
  isPlatformAdmin,
  username,
  userId,
  isOnline,
  isSidebarOpen,
  setIsSidebarOpen,
  subscription,
  onLogout,
  onNavigate,
}) {
  const { clientsMap, brands } = useAppData();
  const location = useLocation();
  const companyName = String(user?.tenantName || "").trim();
  const isOrderForm = /^\/orders\/(new|[^/]+\/edit)/.test(location.pathname);

  return (
    <div className="app-shell min-h-screen bg-surface-page font-sans text-ink antialiased">
      <div className="relative flex h-screen flex-col overflow-hidden md:flex-row">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onLogout={onLogout}
          userRole={userRole}
          isPlatformAdmin={isPlatformAdmin}
          username={username}
          displayName={user?.name || username}
          companyName={companyName}
        />

        {isSidebarOpen && (
          <div
            role="presentation"
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-overlay/50 md:hidden"
          />
        )}

        <div className="flex w-full max-w-full flex-1 flex-col overflow-y-auto overscroll-none">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-edge bg-surface px-2 md:hidden">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl text-ink-muted hover:bg-surface-muted hover:text-ink"
              aria-label={isSidebarOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={isSidebarOpen}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">
                {companyName || "Blum"}
              </span>
            </div>
            <span
              className={`mr-2 inline-flex items-center gap-1.5 text-xs font-medium ${isOnline ? "text-ink-muted" : "text-amber-700"}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-amber-500"}`}
                aria-hidden
              />
              {isOnline ? "Online" : "Offline"}
            </span>
          </header>

          {!isOnline ? (
            <div
              role="status"
              className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium leading-snug text-amber-900"
            >
              Sem internet — modo campo ativo. Você pode criar orçamentos
              normalmente; eles serão enviados quando a conexão voltar.
            </div>
          ) : null}

          {subscription?.accessBlocked && userRole !== "admin" ? (
            <div
              role="alert"
              className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-sm font-medium text-red-800"
            >
              A assinatura da empresa está inativa. Fale com o administrador.
            </div>
          ) : null}

          <StarterUpgradeBanner subscription={subscription} />

          <main
            className={`app-main page-enter mx-auto w-full max-w-[1440px] flex-1 px-4 pt-4 sm:px-6 sm:pt-6 md:pb-8 lg:px-8 ${
              isOrderForm ? "pb-8" : "pb-24"
            }`}
          >
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route
                  path="/dashboard"
                  element={
                    <Dashboard
                      onNavigate={onNavigate}
                      userId={userId}
                      userRole={userRole}
                    />
                  }
                />
                <Route
                  path="/orders/new"
                  element={
                    <OrderFormPage
                      userId={userId}
                      userRole={userRole}
                      brands={brands}
                      isOnline={isOnline}
                    />
                  }
                />
                <Route
                  path="/orders/:orderId/edit"
                  element={
                    <OrderFormPage
                      userId={userId}
                      userRole={userRole}
                      brands={brands}
                      isOnline={isOnline}
                    />
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <OrdersPage
                      userId={userId}
                      userRole={userRole}
                      brands={brands}
                      isOnline={isOnline}
                    />
                  }
                />
                <Route
                  path="/purchases"
                  element={
                    userRole === "admin" ? (
                      <PurchasesPage subscription={subscription} />
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
                  }
                />
                <Route
                  path="/team"
                  element={
                    userRole === "admin" ? (
                      <TeamPage />
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
                  }
                />
                <Route
                  path="/subscription"
                  element={
                    userRole === "admin" ? (
                      <SubscriptionPage />
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
                  }
                />
                {isPlatformAdmin ? (
                  <Route path="/platform" element={<PlatformAdminPage />} />
                ) : null}
                <Route path="/clients" element={<ClientsPage userRole={userRole} />} />
                <Route
                  path="/clients/:clientId/history"
                  element={<ClientHistoryPage clients={clientsMap} />}
                />
                <Route
                  path="/products"
                  element={
                    <ProductsPage
                      userRole={userRole}
                      subscription={subscription}
                    />
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ReportsPage
                      userRole={userRole}
                      userId={userId}
                      subscription={subscription}
                    />
                  }
                />
                <Route
                  path="/login"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route
                  path="*"
                  element={<Navigate to="/dashboard" replace />}
                />
              </Routes>
            </Suspense>
          </main>

        </div>
      </div>
      {isOrderForm ? null : <BottomNav />}
    </div>
  );
}

function AppShell() {
  const navigate = useNavigate();
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [planUpgrade, setPlanUpgrade] = useState(null);

  const isLoggedIn = !!user;
  const userRole = user?.role;
  const isPlatformAdmin = Boolean(user?.isPlatformAdmin);
  const username = user?.username;
  const userId = user?.id;

  const navigateByPage = useCallback(
    (page) => {
      navigate(PAGE_PATH[page] || "/dashboard");
    },
    [navigate],
  );

  const handleLogin = (role, uid, userData) => {
    const userInfo = {
      id: uid,
      role,
      username: userData.username,
      name: userData.name,
      tenantId: userData.tenantId,
      tenantSlug: userData.tenantSlug,
      tenantName: userData.tenantName,
      isPlatformAdmin: Boolean(userData.isPlatformAdmin),
    };
    setUser(userInfo);
    const displayName =
      String(userData.name || userData.username || "").trim() || "usuário";
    toast.success(`Bem-vindo, ${displayName}!`);
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    navigate(redirect || "/dashboard", { replace: true });
  };

  const handleLogout = async () => {
    await apiLogout();
    setUser(null);
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (token && savedUser) {
        if (navigator.onLine) {
          try {
            const verifyData = await verifyToken();
            const parsedUser = JSON.parse(savedUser);
            const mergedUser = {
              ...parsedUser,
              ...(verifyData?.user || {}),
            };
            setUser(mergedUser);
            localStorage.setItem("user", JSON.stringify(mergedUser));
            setSubscription(verifyData?.subscription || null);
            if (
              verifyData?.subscription?.accessBlocked &&
              parsedUser.role === "admin" &&
              !window.location.pathname.startsWith("/subscription")
            ) {
              navigate("/subscription", { replace: true });
            }
          } catch {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
          }
        } else {
          setUser(JSON.parse(savedUser));
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const onPlanFeature = (event) => {
      const detail = event?.detail || {};
      setPlanUpgrade({
        feature: detail.feature,
        requiredPlan: detail.requiredPlan || "professional",
      });
      toast.warning?.(
        detail.message ||
          "Este recurso está disponível no plano Profissional.",
      );
    };
    window.addEventListener(PLAN_FEATURE_REQUIRED_EVENT, onPlanFeature);
    return () =>
      window.removeEventListener(PLAN_FEATURE_REQUIRED_EVENT, onPlanFeature);
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-edge border-t-brand" />
          <p className="text-ink-muted">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <AppDataProvider enabled={isLoggedIn}>
      <AuthenticatedApp
        user={user}
        userRole={userRole}
        isPlatformAdmin={isPlatformAdmin}
        username={username}
        userId={userId}
        isOnline={isOnline}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        subscription={subscription}
        onLogout={handleLogout}
        onNavigate={navigateByPage}
      />
      <PlanUpgradePrompt
        open={Boolean(planUpgrade)}
        feature={planUpgrade?.feature}
        requiredPlan={planUpgrade?.requiredPlan}
        onClose={() => setPlanUpgrade(null)}
      />
    </AppDataProvider>
  );
}

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

export default function App() {
  return (
    <BrowserRouter future={routerFuture}>
      <AppShell />
    </BrowserRouter>
  );
}
