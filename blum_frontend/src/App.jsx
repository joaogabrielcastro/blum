import { useState, useEffect, useCallback } from "react";
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
import ProductsPage from "./Pages/ProductsPage";
import ClientsPage from "./Pages/ClientsPage";
import OrdersPage from "./Pages/OrdersPage";
import PurchasesPage from "./Pages/PurchasesPage";
import ReportsPage from "./Pages/ReportsPage";
import ClientHistoryPage from "./Pages/ClientHistoryPage";
import apiService from "./services/apiService";
import {
  getClientDisplayName,
  normalizeClientsResponse,
} from "./utils/clients";
import { verifyToken } from "./services/apiService";

const PAGE_PATH = {
  dashboard: "/dashboard",
  products: "/products",
  clients: "/clients",
  orders: "/orders",
  reports: "/reports",
  purchases: "/purchases",
};

function AppShell() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [brands, setBrands] = useState([]);
  const [clients, setClients] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isLoggedIn = !!user;
  const userRole = user?.role;
  const username = user?.username;
  const userId = user?.id;

  const navigateByPage = useCallback(
    (page) => {
      navigate(PAGE_PATH[page] || "/dashboard");
    },
    [navigate],
  );

  const fetchClients = async () => {
    try {
      const clientsData = await apiService.getClients();
      const list = normalizeClientsResponse(clientsData);
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
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    }
  };

  const fetchBrands = async () => {
    try {
      const brandsData = await apiService.getBrands();
      setBrands(brandsData);
    } catch (error) {
      console.error("Erro ao carregar marcas:", error);
    }
  };

  const handleLogin = (role, uid, userData) => {
    const userInfo = {
      id: uid,
      role,
      username: userData.username,
      name: userData.name,
    };
    setUser(userInfo);
    navigate("/dashboard", { replace: true });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (token && savedUser) {
        try {
          await verifyToken();
          setUser(JSON.parse(savedUser));
        } catch (error) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

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
    if (isLoggedIn) {
      fetchClients();
      fetchBrands();
    }
  }, [isLoggedIn]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="font-sans text-gray-800 antialiased bg-gray-50 min-h-screen">
      <div className="relative flex flex-col md:flex-row h-screen overflow-hidden bg-gray-100">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onLogout={handleLogout}
          userRole={userRole}
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
            <div className="bg-yellow-500 text-white text-center font-bold py-2 shadow-md">
              ⚠️ Você está no modo offline. Algumas funcionalidades podem estar
              limitadas.
            </div>
          )}

          <main className="flex-1 p-2 sm:p-4 md:p-6 max-w-full">
            <Routes>
              <Route
                path="/"
                element={<Navigate to="/dashboard" replace />}
              />
              <Route
                path="/dashboard"
                element={
                  <Dashboard
                    onNavigate={navigateByPage}
                    username={username}
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
                  />
                }
              />
              <Route
                path="/purchases"
                element={
                  userRole === "admin" ? (
                    <PurchasesPage />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                }
              />
              <Route path="/clients" element={<ClientsPage />} />
              <Route
                path="/clients/:clientId/history"
                element={
                  <ClientHistoryPage clients={clients} />
                }
              />
              <Route
                path="/products"
                element={
                  <ProductsPage
                    userRole={userRole}
                    brands={brands}
                    setBrands={setBrands}
                  />
                }
              />
              <Route
                path="/reports"
                element={
                  <ReportsPage userRole={userRole} userId={userId} />
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
