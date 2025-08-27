import React, { useState } from 'react';
import Login from '/components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ProductsPage from './Pages/ProductsPage';
import ClientsPage from './Pages/ClientsPage';
import OrdersPage from './Pages/OrdersPage';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPage('login');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'products':
        return <ProductsPage />;
      case 'clients':
        return <ClientsPage />;
      case 'orders':
        return <OrdersPage />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="font-sans text-gray-800 antialiased bg-gray-50">
      {isLoggedIn ? (
        <div className="flex min-h-screen">
          <Sidebar onNavigate={setCurrentPage} onLogout={handleLogout} />
          <div className="flex-1 overflow-auto">
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