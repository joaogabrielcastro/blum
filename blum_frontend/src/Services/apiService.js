// URL base da sua API de backend
const API_URL = 'http://localhost:3000/api/v1';

const apiService = {
  getProducts: async () => {
    const response = await fetch(`${API_URL}/products`);
    if (!response.ok) {
      throw new Error('Erro ao buscar produtos.');
    }
    return response.json();
  },
  getClients: async () => {
    const response = await fetch(`${API_URL}/clients`);
    if (!response.ok) {
      throw new Error('Erro ao buscar clientes.');
    }
    return response.json();
  },
  getOrders: async () => {
    const response = await fetch(`${API_URL}/orders`);
    if (!response.ok) {
      throw new Error('Erro ao buscar pedidos.');
    }
    return response.json();
  },
  // Adicione aqui outras funções para criar, atualizar e deletar dados
};

export default apiService;