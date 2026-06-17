// services/apiService.jsx

import {
  AUTH_NOTICE_FORBIDDEN,
  AUTH_NOTICE_KEY,
  AUTH_NOTICE_SESSION_EXPIRED,
} from "../constants/authNotice";

export const API_URL =
  process.env.REACT_APP_API_URL || "https://api-blum.jwsoftware.com.br/api/v2";

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
    try {
      sessionStorage.setItem(
        AUTH_NOTICE_KEY,
        status === 403 ? AUTH_NOTICE_FORBIDDEN : AUTH_NOTICE_SESSION_EXPIRED,
      );
    } catch (_) {
      /* ignore */
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  }
};

const pickServerMessage = (payload) => {
  if (payload == null || typeof payload !== "object") return null;
  const tryString = (v) =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : null;

  return (
    tryString(payload.error) ||
    tryString(payload.message) ||
    (payload.error &&
      typeof payload.error === "object" &&
      tryString(payload.error.message)) ||
    null
  );
};

const formatValidationDetails = (details) => {
  if (!Array.isArray(details) || details.length === 0) return "";
  return details
    .map((err) => {
      if (err == null) return "";
      const loc = err.path ?? err.param ?? err.type ?? "campo";
      const msg =
        err.msg ||
        err.message ||
        (typeof err === "string" ? err : JSON.stringify(err));
      return `${loc}: ${msg}`;
    })
    .filter(Boolean)
    .join("\n");
};

const apiRequest = async (url, options = {}) => {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "Sem ligação à internet ou servidor indisponível. Verifique a rede e tente novamente.",
    );
  }

  if (!response.ok) {
    handleAuthError(response.status);
    const rawText = await response.text();
    let error = {};
    try {
      error = rawText ? JSON.parse(rawText) : {};
    } catch {
      error = {
        message: rawText
          ? rawText.slice(0, 500)
          : "Resposta inválida do servidor",
      };
    }

    const serverText = pickServerMessage(error);
    const detailText = formatValidationDetails(error.details);
    const stringDetails =
      typeof error.details === "string" && error.details.trim() !== ""
        ? error.details.trim()
        : "";

    if (error.details && Array.isArray(error.details) && error.details.length) {
      const customError = new Error(
        detailText || serverText || `Erro: ${response.status}`
      );
      customError.details = error.details;
      customError.status = response.status;
      throw customError;
    }

    const messageWithDetails =
      serverText && stringDetails && !serverText.includes(stringDetails)
        ? `${serverText} ${stringDetails}`
        : serverText || (stringDetails ? `Erro: ${stringDetails}` : null);

    const customError = new Error(
      messageWithDetails ||
        (rawText && !serverText && rawText.length < 400
          ? rawText.trim()
          : null) ||
        `Erro HTTP ${response.status}`
    );
    customError.status = response.status;
    customError.code = error.code;
    customError.stockWarnings = error.stockWarnings;
    throw customError;
  }

  return response.json();
};

// ==================== AUTHENTICATION ====================
export const login = async (username, password) => {
  let response;
  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new Error(
      "Sem ligação à internet ou servidor indisponível. Verifique a rede e tente novamente.",
    );
  }

  if (!response.ok) {
    if (response.status >= 502 && response.status <= 504) {
      throw new Error(
        `A API não foi alcançada (${response.status}). Reveja o proxy/Nginx ou a variável BACKEND_PROXY_HOST; não indica senha errada.`,
      );
    }
    const error = await response.json().catch(() => ({}));
    const fromServer =
      (typeof error.error === "string" && error.error.trim()) ||
      (typeof error.message === "string" && error.message.trim()) ||
      "";
    const fallback429 =
      response.status === 429
        ? "Muitas tentativas de login. Aguarde alguns minutos e tente novamente."
        : "";
    throw new Error(fromServer || fallback429 || "Credenciais inválidas");
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
      orderDate: order.createdAt ?? order.createdat ?? null,
      seller: order.userRef ?? order.userId ?? order.user_ref ?? order.userid,
      status: order.status || "pending",
      totalAmount: order.totalPrice ?? order.totalprice ?? 0,
      discount: order.discount || 0,
      paymentMethod: order.paymentMethod ?? order.payment_method ?? "Não informado",
      notes: order.description || "",
      items: Array.isArray(order.items) ? order.items : [],
    }));
  },

  // ==================== PRODUCTS ====================
  getProducts: async (
    brand = "all",
    page = 1,
    limit = 50,
    q = "",
    brandId,
  ) => {
    const params = new URLSearchParams();
    if (brand && brand !== "all") params.append("brand", brand);
    if (brandId != null && brandId !== "")
      params.append("brandId", String(brandId));
    params.append("page", page);
    params.append("limit", limit);
    const qt = typeof q === "string" ? q.trim() : "";
    if (qt) params.append("q", qt);

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

  bulkAdjustPrices: async (payload) => {
    return apiRequest(`${API_URL}/products/bulk-price-adjust`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getProductById: async (productId) => {
    return apiRequest(`${API_URL}/products/${productId}`);
  },

  /** Busca exata por código na representada (nome ou brandId). */
  lookupProductByCode: async (productCode, brand, brandId) => {
    const code = String(productCode ?? "").trim();
    if (!code) return null;
    const params = new URLSearchParams();
    params.append("productcode", code);
    if (brand && brand !== "all") params.append("brand", brand);
    if (brandId != null && brandId !== "") params.append("brandId", String(brandId));
    try {
      return await apiRequest(`${API_URL}/products/by-code?${params.toString()}`);
    } catch (err) {
      if (err?.status === 404) return null;
      throw err;
    }
  },

  searchProducts: async (searchTerm, brand, brandId) => {
    if (!searchTerm || searchTerm.trim() === "") {
      return [];
    }
    const params = new URLSearchParams();
    params.append("q", searchTerm.trim());
    if (brand && brand !== "all") params.append("brand", brand);
    if (brandId != null && brandId !== "")
      params.append("brandId", String(brandId));
    return apiRequest(`${API_URL}/products/search?${params.toString()}`);
  },

  // ==================== ORDERS ====================
  getOrders: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`${API_URL}/orders?${query}`);
  },

  getOrderById: async (orderId) => {
    return apiRequest(`${API_URL}/orders/${orderId}`);
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

  updateOrderPaymentMethod: async (orderId, payment_method) => {
    return apiRequest(`${API_URL}/orders/${orderId}/payment-method`, {
      method: "PUT",
      body: JSON.stringify({
        payment_method,
        paymentMethod: payment_method,
      }),
    });
  },

  duplicateOrder: async (orderId) => {
    return apiRequest(`${API_URL}/orders/${orderId}/duplicate`, {
      method: "POST",
    });
  },

  getClientItemPriceHistory: async (clientId, productId, limit = 8) => {
    return apiRequest(
      `${API_URL}/orders/clients/${clientId}/products/${productId}/price-history?limit=${limit}`,
    );
  },

  convertOrderToPedido: async (orderId, options = {}) => {
    return apiRequest(`${API_URL}/orders/${orderId}/convert-to-pedido`, {
      method: "PUT",
      body: JSON.stringify({
        confirmStockWarning: options.confirmStockWarning === true,
      }),
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

  // ==================== TEAM / USERS (admin) ====================
  getUsers: async () => {
    return apiRequest(`${API_URL}/auth/users`);
  },

  createUser: async (payload) => {
    return apiRequest(`${API_URL}/auth/users`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getUserAllowedBrands: async (userId) => {
    return apiRequest(`${API_URL}/auth/users/${userId}/allowed-brands`);
  },

  setUserAllowedBrands: async (userId, brandIds) => {
    return apiRequest(`${API_URL}/auth/users/${userId}/allowed-brands`, {
      method: "PUT",
      body: JSON.stringify({ brandIds }),
    });
  },

  adminResetUserPassword: async (userId, newPassword) => {
    return apiRequest(`${API_URL}/auth/users/${userId}/password`, {
      method: "PUT",
      body: JSON.stringify({ newPassword }),
    });
  },

  deleteUser: async (userId) => {
    return apiRequest(`${API_URL}/auth/users/${userId}`, {
      method: "DELETE",
    });
  },

  // ==================== REPORTS ====================
  getSalesByRep: async () => {
    return apiRequest(`${API_URL}/reports/sales-by-rep`);
  },

  getReportStats: async (filters) => {
    const queryString = new URLSearchParams(filters).toString();
    return apiRequest(`${API_URL}/reports/stats?${queryString}`);
  },

  getMonthlySalesSummaries: async (sellerUserId) => {
    const params = new URLSearchParams();
    if (sellerUserId) params.append("sellerUserId", String(sellerUserId));
    const qs = params.toString();
    return apiRequest(
      `${API_URL}/reports/monthly-sales${qs ? `?${qs}` : ""}`,
    );
  },

  getSalesTarget: async ({ year, month, sellerUserId }) => {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
    });
    if (sellerUserId != null && sellerUserId !== "") {
      params.append("sellerUserId", String(sellerUserId));
    }
    return apiRequest(`${API_URL}/reports/sales-target?${params.toString()}`);
  },

  saveSalesTarget: async ({ year, month, targetAmount, sellerUserId }) => {
    return apiRequest(`${API_URL}/reports/sales-target`, {
      method: "PUT",
      body: JSON.stringify({ year, month, targetAmount, sellerUserId }),
    });
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

    const razaoSocial = data.razao_social || "";
    const nomeFantasia = data.estabelecimento?.nome_fantasia || "";

    return {
      nome: razaoSocial || nomeFantasia || "",
      razaoSocial,
      nomeFantasia,
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
