// services/apiService.js

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000/api/v1";


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
        throw new Error(
          errorData.details || errorData.error || "Erro ao atualizar produto."
        );
      }

      return response.json();
    } catch (error) {
      console.error("Erro detalhado ao atualizar produto:", error);
      throw error;
    }
  },

  queryCNPJ: async (cnpj) => {
    try {
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
    } catch (error) {
      console.error("Erro na consulta de CNPJ:", error);
      throw error;
    }
  },

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

  deleteClient: async (clientId) => {
    try {
      const response = await fetch(`${API_URL}/clients/${clientId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao deletar cliente");
      }

      return await response.json();
    } catch (error) {
      console.error("Erro ao deletar cliente:", error);
      throw error;
    }
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
      const response = await fetch(`${API_URL}/orders/stats/${clientId}`);
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

  // ✅ FUNÇÕES DE COMPRAS/IMPORTAÇÃO
  processPurchasePdf: async (formData) => {
    try {
      const response = await fetch(`${API_URL}/purchases/process-pdf`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("A resposta da rede não foi OK");
      }
      return await response.json();
    } catch (error) {
      console.error("Erro ao processar PDF:", error);
      throw error;
    }
  },

  // ✅ NOVA FUNÇÃO: Processar CSV de compra
  // ✅ CORREÇÃO: Processar CSV de compra
  processPurchaseCsv: async (formData) => {
  try {
    console.log("📤 Enviando arquivo CSV para processamento...");
    
    const response = await fetch(`${API_URL}/purchases/process-csv`, {
      method: "POST",
      body: formData,
    });

    console.log("📥 Resposta do servidor:", response.status, response.statusText);

    if (!response.ok) {
      let errorMessage = `Erro ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // Se não conseguir parsear JSON, usa a mensagem padrão
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log("✅ CSV processado com sucesso:", data);

    // ✅ GARANTIR que retornamos um array
    if (!data) {
      throw new Error("Resposta vazia da API");
    }

    if (!Array.isArray(data)) {
      console.error("❌ Resposta não é array:", typeof data, data);
      throw new Error("Formato de resposta inválido da API");
    }

    return data;

  } catch (error) {
    console.error("💥 Erro ao processar CSV:", error);
    throw new Error(error.message || "Falha ao processar o CSV.");
  }
},


  // ✅ FUNÇÃO PARA FINALIZAR COMPRA DO CSV
  finalizePurchaseFromCsv: async (payload) => {
    try {
      console.log(
        "📤 [CSV] Enviando dados para finalizar importação:",
        payload
      );

      const response = await fetch(`${API_URL}/purchases/finalize-csv`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("📥 [CSV] Resposta do servidor:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ [CSV] Erro da API:", errorData);
        throw new Error(
          errorData.error || `Erro ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("✅ [CSV] Importação finalizada com sucesso:", data);
      return data;
    } catch (error) {
      console.error("💥 [CSV] Erro ao finalizar importação:", error);
      throw error;
    }
  },

  finalizePurchase: async (items) => {
    try {
      console.log("📤 Enviando dados para finalizar compra:", items);

      const response = await fetch(`${API_URL}/purchases/finalize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items }),
      });

      console.log("📥 Resposta do servidor:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Erro da API:", errorData);
        throw new Error(
          errorData.error || `Erro ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("✅ Compra finalizada com sucesso:", data);
      return data;
    } catch (error) {
      console.error("💥 Erro ao finalizar compra:", error);
      throw error;
    }
  },

  // ✅ ADICIONE esta função no apiService.js
findProductBySubcode: async (subcode) => {
  try {
    console.log('🔍 Buscando produto por subcódigo:', subcode);
    
    const response = await fetch(`${API_URL}/products?subcode=${encodeURIComponent(subcode)}`);
    
    if (!response.ok) {
      return null;
    }
    
    const products = await response.json();
    
    if (products.length > 0) {
      console.log('✅ Produto encontrado por subcódigo:', products[0]);
      return products[0];
    }
    
    console.log('❌ Produto não encontrado por subcódigo:', subcode);
    return null;
    
  } catch (error) {
    console.error('❌ Erro ao buscar produto por subcódigo:', error);
    return null;
  }
},

  finalizePurchaseFromPdf: async (payload) => {
    try {
      const response = await fetch(`${API_URL}/purchases/finalize-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Erro no apiService.finalizePurchaseFromPdf:", error);
      throw error;
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

  // ✅ FUNÇÃO IMPORT CSV
  importCsv: async (formData) => {
    try {
      console.log("📤 Usando endpoint de importação CSV...");

      const response = await fetch(`${API_URL}/purchases/import-csv`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao importar CSV");
      }

      const data = await response.json();
      console.log("✅ CSV importado com sucesso:", data);

      // ✅ Mesma lógica de normalização
      if (Array.isArray(data)) return data;
      if (data.items && Array.isArray(data.items)) return data.items;
      if (data.data && Array.isArray(data.data)) return data.data;
      if (typeof data === "object") return [data];

      throw new Error("Formato de resposta inválido do endpoint de importação");
    } catch (error) {
      console.error("💥 Erro no apiService.importCsv:", error);
      throw error;
    }
  },

  getClientById: async (clientId) => {
    try {
      const response = await fetch(`${API_URL}/clients/${clientId}`);
      if (!response.ok) {
        throw new Error("Cliente não encontrado");
      }
      const clientData = await response.json();
      return clientData;
    } catch (error) {
      console.error("Erro ao buscar cliente:", error);
      throw error;
    }
  },

  updateBrand: async (oldName, brandData) => {
    try {
      const response = await fetch(
        `${API_URL}/brands/${encodeURIComponent(oldName)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(brandData),
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao atualizar marca");
      }

      return await response.json();
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // ✅ ADICIONE esta função no apiService.js
searchProducts: async (searchTerm) => {
  try {
    console.log('🔍 Buscando produtos por:', searchTerm);
    
    if (!searchTerm || searchTerm.trim() === '') {
      return [];
    }

    const response = await fetch(`${API_URL}/products/search?q=${encodeURIComponent(searchTerm)}`);
    
    if (!response.ok) {
      throw new Error('Erro ao buscar produtos');
    }

    const products = await response.json();
    console.log(`✅ ${products.length} produtos encontrados para: "${searchTerm}"`);
    
    return products;
  } catch (error) {
    console.error('❌ Erro na busca de produtos:', error);
    return [];
  }
},

  getBrandsWithCommission: async () => {
    try {
      const response = await fetch(`${API_URL}/brands`);

      if (!response.ok) {
        throw new Error("Erro ao buscar marcas");
      }

      return await response.json();
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // ✅ HISTÓRICO DE PREÇOS
  getPriceHistory: async (productId) => {
    const response = await fetch(
      `${API_URL}/purchases/price-history/${productId}`
    );

    if (!response.ok) {
      throw new Error("Erro ao buscar histórico de preços");
    }

    return response.json();
  },

  // ✅ ÚLTIMO PREÇO DE COMPRA
  getLastPurchasePrice: async (productId) => {
    const response = await fetch(
      `${API_URL}/purchases/last-price/${productId}`
    );

    if (!response.ok) {
      // Se não encontrar histórico, não é erro - retorna null
      if (response.status === 404) {
        return null;
      }
      throw new Error("Erro ao buscar último preço");
    }

    return response.json();
  },

  getOrdersBySeller: async (userId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_URL}/orders/seller/${userId}?${queryString}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Erro ao buscar pedidos do vendedor.");
    return response.json();
  },

  getClientOrders: async (clientId) => {
    try {
      const response = await fetch(`${API_URL}/orders?clientid=${clientId}`);

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
        items: Array.isArray(order.items) ? order.items : [],
      }));
    } catch (error) {
      console.error("Erro ao buscar pedidos do cliente:", error);
      throw error;
    }
  },
};

export default apiService;
