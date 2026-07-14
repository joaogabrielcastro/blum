import { Suspense, lazy, useState, useEffect, useCallback } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Dashboard from "./Pages/Dashboard";
import SignupPage from "./Pages/SignupPage";
import { verifyToken, logout as apiLogout } from "./services/apiService";
import { useToast } from "./context/ToastContext";
import { AppDataProvider, useAppData } from "./context/AppDataProvider";
import PlanUpgradePrompt from "./components/billing/PlanUpgradePrompt";
import StarterUpgradeBanner from "./components/billing/StarterUpgradeBanner";
import { PLAN_FEATURE_REQUIRED_EVENT } from "./utils/planFeatures";

const ProductsPage = lazy(() => import("./Pages/ProductsPage"));
const ClientsPage = lazy(() => import("./Pages/ClientsPage"));
const OrdersPage = lazy(() => import("./Pages/OrdersPage"));
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
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
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

  return (
    <div className="font-sans text-gray-800 antialiased bg-gray-50 min-h-screen">
      <div className="relative flex flex-col md:flex-row h-screen overflow-hidden bg-gray-100">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onLogout={onLogout}
          userRole={userRole}
          isPlatformAdmin={isPlatformAdmin}
        />

        {isSidebarOpen && (
          <div
            role="presentation"
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
          />
        )}

        <div className="flex flex-1 flex-col overflow-y-auto w-full max-w-full">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-4 text-gray-500 hover:text-gray-600 md:hidden z-20"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16m-7 6h7"
              />
            </svg>
          </button>

          {!isOnline && (
            <div className="bg-yellow-500 text-white text-center font-semibold py-2.5 px-3 shadow-md text-sm sm:text-base leading-snug">
              Sem internet — modo campo ativo. Use Orçamentos para criar vendas
              offline; os dados serão enviados ao voltar online.
            </div>
          )}

          {subscription?.accessBlocked && userRole !== "admin" && (
            <div className="bg-red-600 text-white text-center font-semibold py-2.5 px-3 shadow-md text-sm sm:text-base">
              A assinatura da empresa está inativa. Contacte o administrador.
            </div>
          )}

          <StarterUpgradeBanner subscription={subscription} />

          <main className="max-w-full flex-1 bg-zinc-50/50 p-2 sm:p-4 md:p-6">
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
                <Route path="/clients" element={<ClientsPage />} />
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

          <footer className="bg-white border-t border-gray-200 py-4 px-6 mt-auto">
            <div className="text-center text-sm text-gray-500">
              Sistema de Gestão © {new Date().getFullYear()}
            </div>
          </footer>
        </div>
      </div>
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
      String(userData.name || userData.username || "").trim() || "utilizador";
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
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
