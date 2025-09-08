const API_URL = "http://localhost:3000/api/v1";

const apiService = {
  getClients: async () => {
    const response = await fetch(`${API_URL}/clients`);
    if (!response.ok) throw new Error("Erro ao buscar clientes.");
    return response.json();
  },

  createClient: async (newClientData) => {
    const response = await fetch(`${API_URL}/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newClientData),
    });
    if (!response.ok) throw new Error("Erro ao criar cliente.");
    return response.json();
  },

  updateClient: async (clientId, clientData) => {
    const response = await fetch(`${API_URL}/clients/${clientId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientData),
    });
    if (!response.ok) throw new Error("Falha ao atualizar cliente.");
    return response.json();
  },

  updateOrder: async (orderId, orderData) => {
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erro ao atualizar pedido.");
    }
    return response.json();
  },

  getProducts: async (brand = "all") => {
    const query = brand !== "all" ? `?brand=${brand}` : "";
    const response = await fetch(`${API_URL}/products${query}`);
    if (!response.ok) throw new Error("Erro ao buscar produtos.");
    return response.json();
  },

  createProduct: async (newProductData) => {
    const response = await fetch(`${API_URL}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProductData),
    });
    if (!response.ok) throw new Error("Erro ao criar produto.");
    return response.json();
  },

  getOrders: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = `${API_URL}/orders?${query}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Erro ao buscar pedidos.");
    return response.json();
  },

  createOrder: async (newOrderData) => {
    const response = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newOrderData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erro ao criar pedido.");
    return data;
  },

  deleteOrder: async (orderId) => {
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Erro ao excluir pedido.");
  },

  finalizeOrder: async (orderId) => {
    const response = await fetch(`${API_URL}/orders/${orderId}/finalize`, {
      method: "PUT",
    });
    if (!response.ok) throw new Error("Erro ao finalizar pedido.");
    return response.json();
  },

  getClientStats: async (clientId) => {
    const response = await fetch(`${API_URL}/orders/stats/${clientId}`);
    if (!response.ok)
      throw new Error("Falha ao buscar estatísticas do cliente.");
    return response.json();
  },

  getSalesByRep: async () => {
    const response = await fetch(`${API_URL}/reports/sales-by-rep`);
    if (!response.ok)
      throw new Error("Erro ao buscar relatório de vendas por representante.");
    return response.json();
  },

  // <<< MUDANÇA CRÍTICA AQUI >>>
  // A função agora está DENTRO do objeto apiService.
  getReportStats: async (filters) => {
    const queryString = new URLSearchParams(filters).toString();
    const response = await fetch(`${API_URL}/reports/stats?${queryString}`);
    if (!response.ok) {
      throw new Error("Erro ao buscar estatísticas do relatório.");
    }
    return response.json();
  },

  getBrands: async () => {
    const response = await fetch(`${API_URL}/brands`);
    if (!response.ok) throw new Error("Erro ao buscar marcas.");
    return response.json();
  },

  createBrand: async (newBrandData) => {
    const response = await fetch(`${API_URL}/brands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBrandData),
    });
    if (!response.ok) throw new Error("Erro ao criar marca.");
    return response.json();
  },

  getStatus: async () => {
    const response = await fetch(`${API_URL}/status`);
    if (!response.ok) throw new Error("Erro ao buscar o status da API.");
    return response.json();
  },
};

export default apiService;
