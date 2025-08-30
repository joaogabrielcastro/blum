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
  const [userRole, setUserRole] = useState(null);
  const [username, setUsername] = useState(null);
  const [brands, setBrands] = useState([]);

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

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onNavigate={setCurrentPage} username={username} />;
      case "orders":
        return (
          <OrdersPage
            userRole={userRole}
            brands={brands}
            setBrands={setBrands}
          />
        );
      case "clients":
        return <ClientsPage username={username} />;
      case "products":
        return (
          <ProductsPage
            userRole={userRole}
            brands={brands}
            setBrands={setBrands}
          />
        );
      case "reports":
        return <ReportsPage userRole={userRole} userId={username} />;
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
