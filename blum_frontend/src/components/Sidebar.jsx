const Sidebar = ({ isOpen, onClose, onNavigate, onLogout, userRole}) => {
  // Função para lidar com a navegação e fechar o menu no mobile
  const handleNavigate = (page) => {
    onNavigate(page);
    onClose(); // Fecha o menu ao clicar em um item
  };

  return (
    <div
      className={`
        fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col bg-gray-800 p-4 text-white
        shadow-xl transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:relative md:translate-x-0 md:rounded-tr-3xl md:rounded-br-3xl
      `}
    >
      <div className="mb-10 text-center text-2xl font-bold text-blue-400">
        Blum
      </div>
      <nav className="flex-grow">
        <ul className="space-y-4">
          <li>
            <button
              onClick={() => handleNavigate("dashboard")}
              className="w-full flex items-center p-3 rounded-xl transition-colors duration-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 mr-3"
              >
                <path d="M3 12L12 3L21 12M12 21V12"></path>
              </svg>
              Painel
            </button>
          </li>
          <li>
            <button
              onClick={() => handleNavigate("products")}
              className="w-full flex items-center p-3 rounded-xl transition-colors duration-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 mr-3"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 8v4l3 3"></path>
              </svg>
              Produtos
            </button>
          </li>
          <li>
            <button
              onClick={() => handleNavigate("clients")}
              className="w-full flex items-center p-3 rounded-xl transition-colors duration-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 mr-3"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <path d="M20 8v6M23 11h-6"></path>
              </svg>
              Clientes
            </button>
          </li>
          <li>
            <button
              onClick={() => handleNavigate("orders")}
              className="w-full flex items-center p-3 rounded-xl transition-colors duration-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 mr-3"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              Pedidos
            </button>
          </li>
          <li>
            <button
              onClick={() => handleNavigate("reports")}
              className="w-full flex items-center p-3 rounded-xl transition-colors duration-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 mr-3"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Relatórios
            </button>
          </li>
          {userRole === "admin" && (
            <li>
              <button
                onClick={() => handleNavigate("purchases")}
                className="w-full flex items-center p-3 rounded-xl transition-colors duration-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5 mr-3"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Compras
              </button>
            </li>
          )}
        </ul>
      </nav>
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center p-3 mt-4 rounded-xl text-red-400 bg-gray-700 hover:bg-red-800 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 mr-2"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
        Sair
      </button>
    </div>
  );
};

export default Sidebar;
