// services/apiService.jsx

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000/api/v1";

// ==================== HELPER FUNCTIONS ====================
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleAuthError = (status) => {
  if (status === 401 || status === 403) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  }
};

const apiRequest = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    handleAuthError(response.status);
    const error = await response
      .json()
      .catch(() => ({ message: "Erro desconhecido" }));

    // Se houver detalhes de validação, formata a mensagem
    if (error.details && Array.isArray(error.details)) {
      const errorMessages = error.details
        .map((err) => err.msg || err.message)
        .join(", ");
      const customError = new Error(
        errorMessages || error.message || `Erro: ${response.status}`
      );
      customError.details = error.details;
      customError.status = response.status;
      throw customError;
    }

    const customError = new Error(error.message || `Erro: ${response.status}`);
    customError.status = response.status;
    throw customError;
  }

  return response.json();
};

// ==================== AUTHENTICATION ====================
export const login = async (username, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Credenciais inválidas" }));
    throw new Error(error.message || "Credenciais inválidas");
  }

  return response.json();
};

export const verifyToken = async () => {
  return apiRequest(`${API_URL}/auth/verify`);
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

// ==================== API SERVICE ====================
const apiService = {
  // ==================== CLIENTS ====================
  getClients: async () => {
    return apiRequest(`${API_URL}/clients`);
  },

  createClient: async (newClientData) => {
    return apiRequest(`${API_URL}/clients`, {
      method: "POST",
      body: JSON.stringify(newClientData),
    });
  },

  updateClient: async (clientid, clientData) => {
    return apiRequest(`${API_URL}/clients/${clientid}`, {
      method: "PUT",
      body: JSON.stringify(clientData),
    });
  },

  deleteClient: async (clientId) => {
    return apiRequest(`${API_URL}/clients/${clientId}`, {
      method: "DELETE",
    });
  },

  getClientById: async (clientId) => {
    return apiRequest(`${API_URL}/clients/${clientId}`);
  },

  getClientStats: async (clientId) => {
    try {
      return await apiRequest(`${API_URL}/orders/stats/${clientId}`);
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      return { totalOrders: 0, totalSpent: 0 };
    }
  },

  getClientOrders: async (clientId) => {
    const orders = await apiRequest(`${API_URL}/orders?clientid=${clientId}`);
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
      items: Array.isArray(order.items) ? order.items : [],
    }));
  },

  // ==================== PRODUCTS ====================
  getProducts: async (brand = "all", page = 1, limit = 50) => {
    const params = new URLSearchParams();
    if (brand !== "all") params.append("brand", brand);
    params.append("page", page);
    params.append("limit", limit);

    return apiRequest(`${API_URL}/products?${params.toString()}`);
  },

  createProduct: async (newProductData) => {
    return apiRequest(`${API_URL}/products`, {
      method: "POST",
      body: JSON.stringify(newProductData),
    });
  },

  updateProduct: async (productId, productData) => {
    return apiRequest(`${API_URL}/products/${productId}`, {
      method: "PUT",
      body: JSON.stringify(productData),
    });
  },

  deleteProduct: async (productId) => {
    return apiRequest(`${API_URL}/products/${productId}`, {
      method: "DELETE",
    });
  },

  searchProducts: async (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === "") {
      return [];
    }
    return apiRequest(
      `${API_URL}/products/search?q=${encodeURIComponent(searchTerm)}`
    );
  },

  findProductBySubcode: async (subcode) => {
    try {
      const products = await apiRequest(
        `${API_URL}/products?subcode=${encodeURIComponent(subcode)}`
      );
      return products.length > 0 ? products[0] : null;
    } catch (error) {
      console.error("Erro ao buscar produto por subcódigo:", error);
      return null;
    }
  },

  // ==================== ORDERS ====================
  getOrders: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`${API_URL}/orders?${query}`);
  },

  createOrder: async (newOrderData) => {
    return apiRequest(`${API_URL}/orders`, {
      method: "POST",
      body: JSON.stringify(newOrderData),
    });
  },

  updateOrder: async (orderId, orderData) => {
    return apiRequest(`${API_URL}/orders/${orderId}`, {
      method: "PUT",
      body: JSON.stringify(orderData),
    });
  },

  deleteOrder: async (orderId) => {
    return apiRequest(`${API_URL}/orders/${orderId}`, {
      method: "DELETE",
    });
  },

  finalizeOrder: async (orderId) => {
    return apiRequest(`${API_URL}/orders/${orderId}/finalize`, {
      method: "PUT",
    });
  },

  getOrdersBySeller: async (userId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`${API_URL}/orders/seller/${userId}?${queryString}`);
  },

  // ==================== BRANDS ====================
  getBrands: async () => {
    return apiRequest(`${API_URL}/brands`);
  },

  createBrand: async (newBrandData) => {
    return apiRequest(`${API_URL}/brands`, {
      method: "POST",
      body: JSON.stringify(newBrandData),
    });
  },

  updateBrand: async (oldName, brandData) => {
    return apiRequest(`${API_URL}/brands/${encodeURIComponent(oldName)}`, {
      method: "PUT",
      body: JSON.stringify(brandData),
    });
  },

  deleteBrand: async (brandId) => {
    return apiRequest(`${API_URL}/brands/${brandId}`, {
      method: "DELETE",
    });
  },

  getBrandsWithCommission: async () => {
    return apiRequest(`${API_URL}/brands`);
  },

  // ==================== PURCHASES ====================
  processPurchasePdf: async (formData) => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_URL}/purchases/process-pdf`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      handleAuthError(response.status);
      throw new Error("Erro ao processar PDF");
    }

    return response.json();
  },

  processPurchaseCsv: async (formData) => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_URL}/purchases/process-csv`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      handleAuthError(response.status);
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Formato de resposta inválido da API");
    }

    return data;
  },

  finalizePurchase: async (items) => {
    return apiRequest(`${API_URL}/purchases/finalize`, {
      method: "POST",
      body: JSON.stringify({ items }),
    });
  },

  finalizePurchaseFromCsv: async (payload) => {
    return apiRequest(`${API_URL}/purchases/finalize-csv`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  finalizePurchaseFromPdf: async (payload) => {
    return apiRequest(`${API_URL}/purchases/finalize-pdf`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  importCsv: async (formData) => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_URL}/purchases/import-csv`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      handleAuthError(response.status);
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Erro ao importar CSV");
    }

    const data = await response.json();

    if (Array.isArray(data)) return data;
    if (data.items && Array.isArray(data.items)) return data.items;
    if (data.data && Array.isArray(data.data)) return data.data;
    if (typeof data === "object") return [data];

    throw new Error("Formato de resposta inválido do endpoint de importação");
  },

  getPriceHistory: async (productId) => {
    return apiRequest(`${API_URL}/purchases/price-history/${productId}`);
  },

  getLastPurchasePrice: async (productId) => {
    try {
      return await apiRequest(`${API_URL}/purchases/last-price/${productId}`);
    } catch (error) {
      if (error.message.includes("404")) {
        return null;
      }
      throw error;
    }
  },

  // ==================== REPORTS ====================
  getSalesByRep: async () => {
    return apiRequest(`${API_URL}/reports/sales-by-rep`);
  },

  getReportStats: async (filters) => {
    const queryString = new URLSearchParams(filters).toString();
    return apiRequest(`${API_URL}/reports/stats?${queryString}`);
  },

  // ==================== EXTERNAL APIS ====================
  queryCNPJ: async (cnpj) => {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    const response = await fetch(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(
          "Limite de consultas excedido. Tente novamente mais tarde."
        );
      }
      throw new Error("CNPJ não encontrado");
    }

    const data = await response.json();

    return {
      nome: data.razao_social || data.estabelecimento?.nome_fantasia || "",
      telefone:
        data.estabelecimento?.telefone1 ||
        data.estabelecimento?.telefone2 ||
        "",
      uf: data.estabelecimento?.estado?.sigla || "",
      email: data.estabelecimento?.email || "",
    };
  },

  // ==================== STATUS ====================
  getStatus: async () => {
    return apiRequest(`${API_URL}/status`);
  },
};

export default apiService;
