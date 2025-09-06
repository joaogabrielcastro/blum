import { useState, useEffect } from "react";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Dashboard from "./Pages/Dashboard";
import ProductsPage from "./Pages/ProductsPage";
import ClientsPage from "./Pages/ClientsPage";
import OrdersPage from "./Pages/OrdersPage";
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

  // Adicionado: Estado para monitorar o status da conexão
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // NOVO ESTADO AQUI

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
        clientsMap[client.id] = client.companyName;
      });
      setClients(clientsMap);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
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
    setCurrentPage("clientHistory");
    setSelectedClientId(clientId);
  };

  // Adicionado: useEffect para monitorar o status da conexão
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

  // useEffect para buscar os clientes ao logar
  useEffect(() => {
    if (isLoggedIn) {
      fetchClients();
    }
  }, [isLoggedIn]);

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onNavigate={setCurrentPage} username={username} />;
      case "orders":
        return <OrdersPage userId={userId} brands={brands} reps={reps} />;
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
            onClose={() => setIsSidebarOpen(false)} // Passa a função para fechar
            onNavigate={setCurrentPage}
            onLogout={handleLogout}
          />

          {/* Overlay para escurecer o fundo quando o menu estiver aberto no mobile */}
          {isSidebarOpen && (
            <div
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
            ></div>
          )}

          <div className="flex flex-1 flex-col overflow-y-auto">
            {/* Botão Hambúrguer - Visível apenas em telas pequenas */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-4 text-gray-500 hover:text-gray-600 md:hidden"
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
                Você está no modo offline.
              </div>
            )}
            {renderPage()}
          </div>
        </div>
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App;
