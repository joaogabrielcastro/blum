import { useState, useEffect } from "react";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Dashboard from "./Pages/Dashboard";
import ProductsPage from "./Pages/ProductsPage";
import ClientsPage from "./Pages/ClientsPage";
import OrdersPage from "./Pages/OrdersPage";
import ReportsPage from "./Pages/ReportsPage";
import ClientHistoryPage from "./Pages/ClientHistoryPage";
import apiService from "./apiService";

const App = () => {
  // 1. DECLARAÇÃO DOS ESTADOS
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [userRole, setUserRole] = useState(null);
  const [username, setUsername] = useState(null);
  const [brands, setBrands] = useState([]);
  const [clients, setClients] = useState({});
  const [selectedClientId, setSelectedClientId] = useState(null);

  const userId = username;
  const reps = {
    admin_1: "Admin",
    siane_1: "Siane",
    eduardo_1: "Eduardo",
  };

  // 2. FUNÇÕES DE MANIPULAÇÃO
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

  // A FUNÇÃO handleNavigateToClientHistory VEM AQUI
  const handleNavigateToClientHistory = (clientId) => {
    setCurrentPage("clientHistory");
    setSelectedClientId(clientId);
  };

  // 3. O useEffect USA AS FUNÇÕES DE MANIPULAÇÃO
  useEffect(() => {
    if (isLoggedIn) {
      fetchClients();
    }
  }, [isLoggedIn]);

  // 4. A FUNÇÃO DE RENDERIZAÇÃO VEM POR ÚLTIMO
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
        <div className="flex min-h-screen">
          <Sidebar onNavigate={setCurrentPage} onLogout={handleLogout} />
          <div className="flex-1 overflow-auto">{renderPage()}</div>
        </div>
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App;
