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

  updateClient: async (clientid, clientData) => {
    const response = await fetch(`${API_URL}/clients/${clientid}`, {
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

  updateProduct: async (productId, productData) => {
  try {
    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      // Mensagem de erro mais específica
      throw new Error(errorData.details || errorData.error || "Erro ao atualizar produto.");
    }
    
    return response.json();
  } catch (error) {
    console.error("Erro detalhado ao atualizar produto:", error);
    throw error;
  }
},
queryCNPJ: async (cnpj) => {
  try {
    // Remove caracteres não numéricos
    const cleanCnpj = cnpj.replace(/\D/g, '');
    
    const response = await fetch(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`);
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Limite de consultas excedido. Tente novamente mais tarde.");
      }
      throw new Error("CNPJ não encontrado");
    }
    
    const data = await response.json();
    
    // Extrai apenas as informações necessárias para o formulário
    return {
      nome: data.razao_social || data.estabelecimento?.nome_fantasia || '',
      telefone: data.estabelecimento?.telefone1 || data.estabelecimento?.telefone2 || '',
      uf: data.estabelecimento?.estado?.sigla || '',
      email: data.estabelecimento?.email || '',
    };
  } catch (error) {
    console.error("Erro na consulta de CNPJ:", error);
    throw error;
  }
},

  // <<< NOVA FUNÇÃO PARA CORRESPONDER AO BACKEND >>>
  deleteProduct: async (productId) => {
    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Erro ao excluir produto.");
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

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erro ao criar pedido.");
    }

    return response.json();
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
    try {
      const response = await fetch(`${API_BASE_URL}/orders/stats/${clientId}`);
      if (!response.ok) {
        return { totalOrders: 0, totalSpent: 0 };
      }
      const stats = await response.json();
      return stats;
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      return { totalOrders: 0, totalSpent: 0 };
    }
  },

  getSalesByRep: async () => {
    const response = await fetch(`${API_URL}/reports/sales-by-rep`);
    if (!response.ok)
      throw new Error("Erro ao buscar relatório de vendas por representante.");
    return response.json();
  },

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

  deleteBrand: async (brandName) => {
    const response = await fetch(
      `${API_URL}/brands/${encodeURIComponent(brandName)}`,
      {
        method: "DELETE",
      }
    );
    if (!response.ok) throw new Error("Erro ao excluir marca.");
  },

  getStatus: async () => {
    const response = await fetch(`${API_URL}/status`);
    if (!response.ok) throw new Error("Erro ao buscar o status da API.");
    return response.json();
  },
};

export const getClientById = async (clientId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/clients/${clientId}`);
    if (!response.ok) {
      throw new Error("Cliente não encontrado");
    }
    const clientData = await response.json();
    return clientData;
  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    throw error;
  }
};

export const updateBrand = async (oldName, brandData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/brands/${oldName}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(brandData),
    });

    if (!response.ok) {
      throw new Error("Erro ao atualizar marca");
    }

    return await response.json();
  } catch (error) {
    throw new Error(error.message);
  }
};

export const getBrandsWithCommission = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/brands`);

    if (!response.ok) {
      throw new Error("Erro ao buscar marcas");
    }

    return await response.json();
  } catch (error) {
    throw new Error(error.message);
  }
};

export const getClientOrders = async (clientId) => {
  try {
    // Use clientid como parâmetro de query (minúsculo)
    const response = await fetch(`${API_BASE_URL}/orders?clientid=${clientId}`);

    if (!response.ok) {
      throw new Error("Erro ao buscar pedidos do cliente");
    }

    const orders = await response.json();

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.id.toString(),
      orderDate: order.createdat,
      seller: order.userid,
      status: order.status || "pending",
      totalAmount: order.totalprice || 0,
      discount: order.discount || 0,
      paymentMethod: "Não informado",
      notes: order.description || "",
      items: Array.isArray(order.items)
        ? order.items
        : tryParseJSON(order.items),
    }));
  } catch (error) {
    console.error("Erro ao buscar pedidos do cliente:", error);
    throw error;
  }
};

export default apiService;
