import React from 'react';

const Dashboard = ({ onNavigate }) => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Bem-vindo(a) ao Painel Blum</h1>
      <p className="text-lg text-gray-600 mb-8">Selecione uma opção abaixo para começar a gerenciar.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          onClick={() => onNavigate('products')} 
          className="bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Catálogo de Produtos</h2>
          <p className="text-gray-600">Gerencie produtos, estoque e preços.</p>
        </div>
        <div 
          onClick={() => onNavigate('clients')} 
          className="bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Gestão de Clientes</h2>
          <p className="text-gray-600">Acesse a carteira de clientes e dados de contato.</p>
        </div>
        <div 
          onClick={() => onNavigate('orders')} 
          className="bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Gerenciamento de Pedidos</h2>
          <p className="text-gray-600">Acompanhe o fluxo de orçamentos e pedidos.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
