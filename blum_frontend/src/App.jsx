import { useState, useEffect } from "react";
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

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [userRole, setUserRole] = useState(null);
  const [username, setUsername] = useState(null);
  const [brands, setBrands] = useState([]);
  const [clients, setClients] = useState({});
  const [selectedClientId, setSelectedClientId] = useState(null);

  // Estado para monitorar o status da conexão
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const userId = username;
  const reps = {
    admin_1: "Admin",
    siane_1: "Siane",
    eduardo_1: "Eduardo",
  };

  const fetchClients = async () => {
    try {
      const clientsData = await apiService.getClients();
      const clientsMap = {};
      clientsData.forEach((client) => {
        clientsMap[client.id] = client.companyName || client.companyname;
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

  const handleLogin = (role, user) => {
    setIsLoggedIn(true);
    setUserRole(role);
    setUsername(user);
    setCurrentPage("dashboard");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    setUsername(null);
    setCurrentPage("login");
  };

  // Função para navegar para o histórico de um cliente
  const handleNavigateToClientHistory = (clientId) => {
    console.log("Navegando para histórico do cliente:", clientId);
    if (!clientId) {
      console.error("ClientId não fornecido!");
      return;
    }
    setSelectedClientId(clientId);
    setCurrentPage("clientHistory");
  };

  // Função para voltar da página de histórico
  const handleBackFromHistory = () => {
    setCurrentPage("clients");
    setSelectedClientId(null);
  };

  // Monitorar status da conexão
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

  // Buscar clientes ao logar
  useEffect(() => {
    if (isLoggedIn) {
      fetchClients();
      fetchBrands();
    }
  }, [isLoggedIn]);

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onNavigate={setCurrentPage} username={username} />;
      case "orders":
        return (
          <OrdersPage
            userId={userId}
            userRole={userRole}
            brands={brands}
            reps={reps}
          />
        );
        
      case "purchases":
        return <PurchasesPage />;

      case "clients":
        return (
          <ClientsPage
            onNavigateToClientHistory={handleNavigateToClientHistory}
          />
        );
      case "products":
        return (
          <ProductsPage
            userRole={userRole}
            brands={brands}
            setBrands={setBrands}
          />
        );
      case "reports":
        return <ReportsPage userRole={userRole} userId={userId} reps={reps} />;
      case "clientHistory":
        return (
          <ClientHistoryPage
            clientId={selectedClientId}
            onBack={handleBackFromHistory}
            reps={reps}
            clients={clients}
          />
        );
      default:
        return <Dashboard onNavigate={setCurrentPage} username={username} />;
    }
  };

  return (
    <div className="font-sans text-gray-800 antialiased bg-gray-50">
      {isLoggedIn ? (
        <div className="relative flex h-screen overflow-hidden bg-gray-100">
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onNavigate={setCurrentPage}
            onLogout={handleLogout}
            currentPage={currentPage}
          />

          {/* Overlay para mobile */}
          {isSidebarOpen && (
            <div
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
            ></div>
          )}

          <div className="flex flex-1 flex-col overflow-y-auto">
            {/* Botão Hambúrguer - Visível apenas em mobile */}
            <button
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

            {/* Banner de status offline */}
            {!isOnline && (
              <div className="bg-yellow-500 text-white text-center font-bold py-2 shadow-md">
                ⚠️ Você está no modo offline. Algumas funcionalidades podem
                estar limitadas.
              </div>
            )}

            {/* Conteúdo principal */}
            <main className="flex-1 p-4 md:p-6">{renderPage()}</main>

            {/* Footer opcional */}
            <footer className="bg-white border-t border-gray-200 py-4 px-6 mt-auto">
              <div className="text-center text-sm text-gray-500">
                Sistema de Gestão © {new Date().getFullYear()}
              </div>
            </footer>
          </div>
        </div>
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App;
