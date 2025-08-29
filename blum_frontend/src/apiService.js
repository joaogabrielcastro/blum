const API_URL = 'http://localhost:3000/api/v1';

const apiService = {
  getClients: async () => {
    const response = await fetch(`${API_URL}/clients`);
    if (!response.ok) throw new Error('Erro ao buscar clientes.');
    return response.json();
  },
  createClient: async (newClientData) => {
    const response = await fetch(`${API_URL}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClientData),
    });
    if (!response.ok) throw new Error('Erro ao criar cliente.');
    return response.json();
  },
  getProducts: async (brand = 'all') => {
    const query = brand !== 'all' ? `?brand=${brand}` : '';
    const response = await fetch(`${API_URL}/products${query}`);
    if (!response.ok) throw new Error('Erro ao buscar produtos.');
    return response.json();
  },
  createProduct: async (newProductData) => {
    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProductData),
    });
    if (!response.ok) throw new Error('Erro ao criar produto.');
    return response.json();
  },
  getOrders: async (userId) => {
    const response = await fetch(`${API_URL}/orders?userId=${userId}`);
    if (!response.ok) throw new Error('Erro ao buscar pedidos.');
    return response.json();
  },
  createOrder: async (newOrderData) => {
    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrderData),
    });
    if (!response.ok) throw new Error('Erro ao criar pedido.');
    return response.json();
  },
  deleteOrder: async (orderId) => {
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Erro ao excluir pedido.');
  },
  finalizeOrder: async (orderId) => {
    const response = await fetch(`${API_URL}/orders/${orderId}/finalize`, {
      method: 'PUT',
    });
    if (!response.ok) throw new Error('Erro ao finalizar pedido.');
    return response.json();
  },
  getSalesByRep: async () => {
    const response = await fetch(`${API_URL}/reports/sales-by-rep`);
    if (!response.ok) throw new Error('Erro ao buscar relatório de vendas por representante.');
    return response.json();
  },
  checkStatus: async () => {
  const response = await fetch(`${API_URL}/status`);
  if (!response.ok) throw new Error('Erro ao verificar status do servidor.');
  return response.json();
},

getDashboardStats: async () => {
  const response = await fetch(`${API_URL}/reports/dashboard-stats`);
  if (!response.ok) throw new Error('Erro ao buscar estatísticas do dashboard.');
  return response.json();
}
};

export default apiService;