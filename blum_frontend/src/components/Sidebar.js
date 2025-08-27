import React from 'react';

const Sidebar = ({ onNavigate, onLogout }) => (
  <div className="w-64 bg-gray-800 text-white flex flex-col p-4 rounded-tr-3xl rounded-br-3xl shadow-xl">
    <div className="text-2xl font-bold text-center mb-10 text-blue-400">Blum</div>
    <nav className="flex-grow">
      <ul className="space-y-4">
        <li>
          <button onClick={() => onNavigate('dashboard')} className="w-full flex items-center p-3 rounded-xl transition-colors duration-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 00-2 2H5a2 2 00-2-2v-3a2 2 012-2m14 0V9a2 2 00-2-2H5a2 2 00-2 2v2m7-2h2m-7 2h2m-7 2h2"></path></svg>
            Painel
          </button>
        </li>
        <li>
          <button onClick={() => onNavigate('products')} className="w-full flex items-center p-3 rounded-xl transition-colors duration-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 011 1v3a2 2 01-2 2H5a2 2 01-2-2v-3a2 2 012-2m14 0V9a2 2 00-2-2H5a2 2 00-2 2v2m7-2h2m-7 2h2m-7 2h2"></path></svg>
            Produtos
          </button>
        </li>
        <li>
          <button onClick={() => onNavigate('clients')} className="w-full flex items-center p-3 rounded-xl transition-colors duration-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h-4a2 2 00-2-2V4h6v14a2 2 01-2 2zm2 0h-4a2 2 00-2-2V4h6v14a2 2 01-2 2zm2-2V4h-6v14a2 2 01-2 2h4a2 2 00-2-2zM9 20V4H3v14a2 2 002 2h4a2 2 012-2z"></path></svg>
            Clientes
          </button>
        </li>
        <li>
          <button onClick={() => onNavigate('orders')} className="w-full flex items-center p-3 rounded-xl transition-colors duration-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 000-2h2a2 2 000-2zM9 13H7a2 2 000-2h2a2 2 000-2zM9 21H7a2 2 000-2h2a2 2 000-2z"></path></svg>
            Pedidos
          </button>
        </li>
      </ul>
    </nav>
    <button 
      onClick={onLogout}
      className="w-full flex items-center justify-center p-3 mt-4 rounded-xl text-red-400 bg-gray-700 hover:bg-red-800 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
    >
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 01-3 3H6a3 3 01-3-3V7a3 3 013-3h4a3 3 013 3v1"></path></svg>
      Sair
    </button>
  </div>
);

export default Sidebar;
