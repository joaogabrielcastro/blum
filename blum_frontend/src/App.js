import { useState, useEffect } from "react";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Dashboard from "./Pages/Dashboard";
import ProductsPage from "./Pages/ProductsPage";
import ClientsPage from "./Pages/ClientsPage";
import OrdersPage from "./Pages/OrdersPage";
import ReportsPage from "./Pages/ReportsPage";
import apiService from "./apiService";

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    setUserId("representante_1");
  }, []);

  const handleLogin = (role) => {
    setIsLoggedIn(true);
    setUserRole(role);
    setCurrentPage("dashboard");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPage("login");
    setUserRole(null);
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onNavigate={setCurrentPage} />;
      case "products":
        return <ProductsPage userRole={userRole} />;
      case "clients":
        return <ClientsPage />;
      case "orders":
        return <OrdersPage userId={userId} />;
      case "reports":
        return <ReportsPage userRole={userRole} userId={userId} />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
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
