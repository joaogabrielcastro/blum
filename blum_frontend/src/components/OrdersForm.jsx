import { useState, useEffect, useMemo } from "react";
import apiService from "../services/apiService";
import {
  getClientDisplayName,
  normalizeClientsResponse,
} from "../utils/clients";
import { normalizeOrderLineItems } from "../utils/format";
import { productMatchesFlexible } from "../utils/productSearch";
import ClientItemPriceHistoryModal from "./ClientItemPriceHistoryModal";

const OrdersForm = ({
  userId,
  clients,
  clientsList = [],
  onOrderAdded,
  onCancel,
  brands,
  editingOrder,
}) => {
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [totalPrice, setTotalPrice] = useState(0);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mobileProductPickerOpen, setMobileProductPickerOpen] =
    useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [historyModalItem, setHistoryModalItem] = useState(null);

  // Função segura para toFixed
  const safeToFixed = (value, decimals = 2) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "0.00";
    return num.toFixed(decimals);
  };

  const lineNetTotal = (item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity, 10) || 1;
    const ld = parseFloat(item.lineDiscount) || 0;
    const factor = 1 - Math.min(100, Math.max(0, ld)) / 100;
    return price * quantity * factor;
  };

  const subtotalAfterLineDiscounts = items.reduce(
    (total, item) => total + lineNetTotal(item),
    0,
  );

  const discountAmount =
    subtotalAfterLineDiscounts * (parseFloat(discount) / 100);
  const netTotal = subtotalAfterLineDiscounts - discountAmount;
  const canApplyGeneralDiscount =
    paymentMethod === "pix" || paymentMethod === "dinheiro";

  useEffect(() => {
    if (editingOrder) {
      const cid =
        editingOrder.clientId ?? editingOrder.clientid ?? editingOrder.client_id;
      setClientId(cid != null && cid !== "" ? String(cid) : "");
      setDescription(editingOrder.description || "");
      const lines = normalizeOrderLineItems(editingOrder.items);
      setItems(lines);
      setDiscount(editingOrder.discount || 0);
      setTotalPrice(editingOrder.totalPrice ?? editingOrder.totalprice ?? 0);
      const firstBrand = lines.find((i) => i.brand)?.brand;
      if (firstBrand) setSelectedBrand(firstBrand);
      setPaymentMethod(editingOrder.paymentMethod || "");
    } else {
      setClientId("");
      setClientSearchTerm("");
      setDescription("");
      setItems([]);
      setDiscount(0);
      setSelectedBrand("");
      setTotalPrice(0);
      setProductSearch("");
      setSearchResults([]);
      setPaymentMethod("");
    }
  }, [editingOrder, brands, clients]);

  // Preenche código/subcódigo/estoque a partir do catálogo ao editar
  useEffect(() => {
    if (!editingOrder?.id || !Array.isArray(products) || products.length === 0) {
      return;
    }
    setItems((prev) => {
      if (!prev.length) return prev;
      return prev.map((item) => {
        const pid = item.productId;
        if (pid == null) return item;
        const p = products.find((x) => String(x.id) === String(pid));
        if (!p) return item;
        return {
          ...item,
          productcode: item.productcode || p.productcode,
          subcode: item.subcode ?? p.subcode,
          availableStock:
            item.availableStock != null ? item.availableStock : p.stock,
          brand: item.brand || p.brand,
        };
      });
    });
  }, [editingOrder?.id, products]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // ✅ BUSCAR TODOS OS PRODUTOS (sem paginação limitada)
        const productsResponse = await apiService.getProducts("all", 1, 10000);
        // ✅ COMPATIBILIDADE: Verifica se tem paginação ou array direto
        const productsData = productsResponse?.data || productsResponse;

        // ✅ GARANTIR QUE SEMPRE SEJA UM ARRAY
        const safeProducts = Array.isArray(productsData) ? productsData : [];
        setProducts(safeProducts);
      } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        setProducts([]); // ✅ Em caso de erro, define array vazio
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    // Atualiza o total sempre que items ou discount mudar
    setTotalPrice(netTotal);
  }, [items, discount, netTotal]);

  // ✅ NOVA FUNÇÃO: Busca avançada por nome, código ou subcódigo
  useEffect(() => {
    const searchProducts = async () => {
      if (!productSearch || productSearch.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // ✅ GARANTIR QUE PRODUCTS É ARRAY
        if (!Array.isArray(products)) {
          setSearchResults([]);
          setIsSearching(false);
          return;
        }

        const filtered = products.filter((product) =>
          productMatchesFlexible(product, productSearch, selectedBrand),
        );

        const firstTok =
          productSearch.toLowerCase().trim().split(/\s+/)[0] || "";

        const sortedResults = filtered.sort((a, b) => {
          const aNameMatch = firstTok && a.name.toLowerCase().includes(firstTok);
          const bNameMatch = firstTok && b.name.toLowerCase().includes(firstTok);
          const aCodeMatch =
            firstTok &&
            a.productcode &&
            a.productcode.toLowerCase().includes(firstTok);
          const bCodeMatch =
            firstTok &&
            b.productcode &&
            b.productcode.toLowerCase().includes(firstTok);
          const aSubcodeMatch =
            firstTok &&
            a.subcode &&
            a.subcode.toLowerCase().includes(firstTok);
          const bSubcodeMatch =
            firstTok &&
            b.subcode &&
            b.subcode.toLowerCase().includes(firstTok);

          if (aSubcodeMatch && !bSubcodeMatch) return -1;
          if (!aSubcodeMatch && bSubcodeMatch) return 1;
          if (aCodeMatch && !bCodeMatch) return -1;
          if (!aCodeMatch && bCodeMatch) return 1;
          if (aNameMatch && !bNameMatch) return -1;
          if (!aNameMatch && bNameMatch) return 1;

          return a.name.localeCompare(b.name);
        });

        setSearchResults(sortedResults);
      } catch (error) {
        console.error("Erro na busca:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchProducts, 300); // Debounce de 300ms
    return () => clearTimeout(timeoutId);
  }, [productSearch, products, selectedBrand]);

  useEffect(() => {
    if (!mobileProductPickerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileProductPickerOpen]);

  useEffect(() => {
    if (!mobileProductPickerOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setMobileProductPickerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileProductPickerOpen]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];

    // Valida quantidade contra estoque disponível
    if (field === "quantity" && newItems[index].availableStock) {
      if (value > newItems[index].availableStock) {
        alert(
          `Quantidade solicitada (${value}) excede o estoque disponível (${newItems[index].availableStock}) para "${newItems[index].productName}"`,
        );
        return; // Não permite a mudança
      }
      if (value < 1) {
        alert("A quantidade deve ser no mínimo 1");
        return;
      }
    }

    if (field === "lineDiscount") {
      let v = parseFloat(value);
      if (!Number.isFinite(v)) v = 0;
      v = Math.min(100, Math.max(0, v));
      newItems[index][field] = v;
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const handleProductSelect = (product) => {
    if (product) {
      const existingItem = items.find(
        (item) =>
          (item.productId != null &&
            String(item.productId) === String(product.id)) ||
          (!item.productId && item.productName === product.name),
      );
      if (!existingItem) {
        // Verifica se há estoque disponível
        if (product.stock <= 0) {
          alert(`Produto "${product.name}" sem estoque disponível!`);
          return;
        }

        const newItem = {
          productName: product.name,
          brand: product.brand,
          quantity: 1,
          price: product.price,
          lineDiscount: 0,
          productId: product.id,
          productcode: product.productcode,
          subcode: product.subcode,
          availableStock: product.stock, // Armazena estoque disponível
        };
        setItems((prevItems) => [...prevItems, newItem]);
      } else {
        alert("Este produto já foi adicionado ao pedido.");
      }
    }
    setProductSearch("");
    setSearchResults([]);
    setMobileProductPickerOpen(false);
  };

  const removeItem = (index) => {
    setItems((prevItems) => prevItems.filter((_, i) => i !== index));
  };

  // ✅ FUNÇÃO AUXILIAR: Limpar busca
  const clearSearch = () => {
    setProductSearch("");
    setSearchResults([]);
  };

  const clientOptions = useMemo(() => {
    const list = normalizeClientsResponse(clientsList);
    if (list.length > 0) {
      return list
        .map((c) => {
          const id = c.id ?? c.Id;
          if (id == null) return null;
          const label =
            getClientDisplayName(c) ||
            (c.cnpj != null && String(c.cnpj).trim()
              ? `CNPJ ${String(c.cnpj).trim()}`
              : `Cliente #${id}`);
          return { id: String(id), label };
        })
        .filter(Boolean)
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    }
    return Object.entries(clients || {})
      .map(([id, name]) => ({
        id: String(id),
        label:
          name != null && String(name).trim() !== ""
            ? String(name)
            : `Cliente #${id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [clientsList, clients]);

  const filteredClientOptions = useMemo(() => {
    const term = clientSearchTerm.trim().toLowerCase();
    if (!term) return clientOptions.slice(0, 200);
    return clientOptions
      .filter(({ label, id }) => {
        const lower = String(label).toLowerCase();
        return lower.includes(term) || String(id).includes(term);
      })
      .slice(0, 200);
  }, [clientOptions, clientSearchTerm]);

  useEffect(() => {
    if (!clientId) {
      setClientSearchTerm("");
      return;
    }
    const selected = clientOptions.find((option) => option.id === String(clientId));
    if (selected) setClientSearchTerm(selected.label);
  }, [clientId, clientOptions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientId) {
      alert("Por favor, selecione um cliente.");
      return;
    }

    if (!selectedBrand) {
      alert("Por favor, selecione uma representada.");
      return;
    }

    if (items.length === 0) {
      alert("Adicione pelo menos um item ao pedido.");
      return;
    }

    if (items.some((item) => !item.productName || !item.price)) {
      alert("Por favor, preencha todos os campos dos produtos.");
      return;
    }
    const discountValue = parseFloat(discount) || 0;
    if (!canApplyGeneralDiscount && discountValue > 0) {
      alert(
        "Desconto geral só é permitido para PIX ou dinheiro (máximo 2%).",
      );
      return;
    }
    if (canApplyGeneralDiscount && discountValue > 2) {
      alert("Para PIX ou dinheiro, o desconto geral máximo permitido é 2%.");
      return;
    }
    if (!userId) {
      alert(
        "ID do usuário não disponível. Por favor, tente fazer login novamente.",
      );
      return;
    }

    // Valida estoque antes de submeter
    const stockErrors = [];
    items.forEach((item) => {
      if (item.availableStock && item.quantity > item.availableStock) {
        stockErrors.push(
          `"${item.productName}": Solicitado ${item.quantity}, Disponível ${item.availableStock}`,
        );
      }
    });

    if (stockErrors.length > 0) {
      alert(
        `Estoque insuficiente para os seguintes produtos:\n\n${stockErrors.join(
          "\n",
        )}\n\nPor favor, ajuste as quantidades antes de continuar.`,
      );
      return;
    }

    try {
      const orderData = {
        clientid: parseInt(clientId),
        userid: userId,
        description: description,
        items: items.map((item) => ({
          ...item,
          price: parseFloat(item.price) || 0,
          quantity: parseInt(item.quantity) || 1,
          lineDiscount: Math.min(
            100,
            Math.max(0, parseFloat(item.lineDiscount) || 0),
          ),
        })),
        discount: parseFloat(discount) || 0,
        totalprice: parseFloat(netTotal) || 0,
        document_type: editingOrder
          ? editingOrder.documentType === "pedido"
            ? "pedido"
            : "orcamento"
          : "orcamento",
      };

      orderData.payment_method = paymentMethod || null;

      if (editingOrder) {
        await apiService.updateOrder(editingOrder.id, orderData);
      } else {
        await apiService.createOrder(orderData);
      }

      onOrderAdded();
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);

      // Mostra detalhes de validação se disponíveis
      let errorMessage = `Falha ao ${
        editingOrder ? "atualizar" : "criar"
      } o pedido.`;

      if (error.details && Array.isArray(error.details)) {
        const fieldErrors = error.details
          .map(
            (err) =>
              `${err.path || err.param || "Campo"}: ${err.msg || err.message}`,
          )
          .join("\n");
        errorMessage += `\n\nErros de validação:\n${fieldErrors}`;
      } else if (error.message) {
        errorMessage += `\n${error.message}`;
      }

      alert(errorMessage);
    }
  };

  const renderProductResultRow = (product) => (
    <div
      key={product.id}
      role="button"
      tabIndex={0}
      onClick={() => handleProductSelect(product)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleProductSelect(product);
        }
      }}
      className="p-3 cursor-pointer hover:bg-blue-50 active:bg-blue-100 border-b border-gray-100 last:border-b-0"
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900">{product.name}</div>
          <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-1">
            <span className="bg-gray-100 px-2 py-1 rounded text-xs">
              Codigo: {product.productcode}
            </span>
            {product.subcode && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                Sub: {product.subcode}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500 mt-1">{product.brand}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-medium text-green-600">
            R$ {safeToFixed(product.price)}
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${
              product.stock > 0
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            Estoque: {product.stock}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="w-full max-w-none md:max-w-4xl md:mx-auto px-0 sm:px-0 md:px-4 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-8 px-3 md:px-0 pt-1 md:pt-0">
          {editingOrder
            ? editingOrder.documentType === "orcamento"
              ? "Editar orçamento"
              : "Editar pedido"
            : "Novo orçamento"}
        </h2>
        <div className="w-full">
          <form
            id="order-form-main"
            onSubmit={handleSubmit}
            className="bg-white rounded-none md:rounded-xl shadow-sm md:shadow-lg border-y border-gray-200 md:border border-gray-200 p-3 sm:p-4 md:p-8 space-y-6 sm:space-y-8 w-full pb-28 md:pb-8"
          >
          {/* --- Cliente e Representada --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente *
              </label>
              <input
                type="text"
                value={clientSearchTerm}
                onChange={(e) => {
                  const value = e.target.value;
                  setClientSearchTerm(value);
                  const exact = clientOptions.find(
                    ({ label }) =>
                      label.toLowerCase().trim() === value.toLowerCase().trim(),
                  );
                  if (exact) {
                    setClientId(exact.id);
                  } else {
                    setClientId("");
                  }
                }}
                list="orders-client-options"
                placeholder="Digite para buscar cliente"
                className="w-full p-3.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="orders-client-options">
                {filteredClientOptions.map(({ id, label }) => (
                  <option key={id} value={label} />
                ))}
              </datalist>
              <p className="mt-1 text-xs text-gray-500">
                Digite nome/CNPJ para filtrar clientes.
              </p>
              {clientOptions.length === 0 && (
                <p className="mt-1 text-sm text-amber-700">
                  Nenhum cliente cadastrado. Cadastre clientes em Clientes.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Representada *
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full p-3.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione uma representada</option>
                {Array.isArray(brands) &&
                  brands.map((brand) => (
                    <option
                      key={brand.id ?? brand.name}
                      value={brand.name}
                    >
                      {brand.name}
                    </option>
                  ))}
              </select>
              {Array.isArray(brands) && brands.length === 0 && (
                <p className="mt-1 text-sm text-amber-700">
                  Nenhuma representada cadastrada. Cadastre em Produtos.
                </p>
              )}
            </div>
          </div>

          {/* --- Descrição, pagamento e desconto --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condição / forma de pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  const nextMethod = e.target.value;
                  setPaymentMethod(nextMethod);
                  const currentDiscount = parseFloat(discount) || 0;
                  if (nextMethod === "pix" || nextMethod === "dinheiro") {
                    if (currentDiscount > 2) {
                      setDiscount(2);
                      alert(
                        "Para PIX ou dinheiro, o desconto geral foi ajustado para o máximo de 2%.",
                      );
                    }
                  } else if (currentDiscount > 0) {
                    setDiscount(0);
                    alert(
                      "Para esta forma de pagamento, desconto geral não é permitido.",
                    );
                  }
                }}
                className="w-full p-3.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione (opcional)</option>
                <option value="carteira">Carteira (não pago / em aberto)</option>
                <option value="boleto">Pagamento em boleto</option>
                <option value="pix">Pagamento via PIX</option>
                <option value="cheque">Pagamento via cheque</option>
                <option value="dinheiro">Pagamento em dinheiro</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Desconto geral só é permitido em PIX ou dinheiro.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full p-3.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descrição do pedido (opcional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Desconto geral no pedido (%)
              </label>
              <input
                type="number"
                min="0"
                max={canApplyGeneralDiscount ? "2" : "0"}
                step="0.01"
                value={discount}
                onChange={(e) => {
                  const raw = parseFloat(e.target.value) || 0;
                  const capped = canApplyGeneralDiscount
                    ? Math.min(2, Math.max(0, raw))
                    : 0;
                  setDiscount(capped);
                }}
                className="w-full p-3.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                disabled={!canApplyGeneralDiscount}
              />
              <p className="mt-1 text-xs text-gray-500">
                Aplicado sobre o subtotal já com descontos por item.
              </p>
              {canApplyGeneralDiscount ? (
                <p className="mt-1 text-xs font-medium text-amber-700">
                  Para PIX ou dinheiro, desconto geral limitado a 2%.
                </p>
              ) : (
                <p className="mt-1 text-xs font-medium text-gray-500">
                  Para esta forma de pagamento, desconto geral deve ser 0%.
                </p>
              )}
            </div>
          </div>

          {/* --- Seção de Produtos (mobile: tela cheia; desktop: dropdown) --- */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">
              Adicionar Produtos
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar produto (várias palavras, sem precisar igual ao cadastro)
              </label>

              <button
                type="button"
                className="md:hidden w-full min-h-12 p-3.5 border border-gray-300 rounded-lg text-base text-left focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                disabled={!selectedBrand}
                onClick={() => setMobileProductPickerOpen(true)}
              >
                <span
                  className={
                    productSearch.trim() ? "text-gray-900" : "text-gray-400"
                  }
                >
                  {productSearch.trim()
                    ? productSearch
                    : "Toque para buscar e adicionar produto"}
                </span>
              </button>

              <div className="relative hidden md:block">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Digite nome, codigo do produto ou subcodigo..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    disabled={!selectedBrand}
                    className="w-full p-3.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    autoComplete="off"
                  />

                  {isSearching && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                    </div>
                  )}

                  {productSearch && !isSearching && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      aria-label="Limpar busca"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((product) =>
                      renderProductResultRow(product),
                    )}
                  </div>
                )}

                {productSearch &&
                  searchResults.length === 0 &&
                  !isSearching && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
                      <div className="text-center text-gray-500">
                        Nenhum produto encontrado para &quot;{productSearch}
                        &quot;
                      </div>
                      <div className="text-xs text-gray-400 mt-2 text-center">
                        Tente buscar por nome, codigo do produto ou subcodigo
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* --- Tabela de Itens Adicionados --- */}
          {items.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Itens do Pedido
              </h3>
              <div className="space-y-3 md:hidden">
                {items.map((item, index) => (
                  <div
                    key={item.productId || index}
                    className="border border-gray-200 rounded-lg p-3 space-y-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {item.productName}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                          Codigo: {item.productcode}
                        </span>
                        {item.subcode && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                            Sub: {item.subcode}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{item.brand}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 items-end">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          Quantidade
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={item.availableStock || undefined}
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "quantity",
                              parseInt(e.target.value, 10),
                            )
                          }
                          className="w-full p-2.5 border border-gray-300 rounded-md text-center text-base focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {item.availableStock && (
                          <span className="text-xs text-gray-500 mt-1 inline-block">
                            Disponivel: {item.availableStock}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="h-11 px-3 border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                        title="Remover Item"
                      >
                        Remover item
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-gray-500 block">
                        Desconto no item (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.lineDiscount ?? 0}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "lineDiscount",
                            e.target.value,
                          )
                        }
                        className="w-full p-2 border border-gray-300 rounded-md text-center text-base"
                      />
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Unitário: R$ {safeToFixed(item.price)}
                      </span>
                      <span className="font-semibold text-gray-900">
                        Subtotal: R$ {safeToFixed(lineNetTotal(item))}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHistoryModalItem(item)}
                      disabled={!clientId || !item.productId}
                      className="w-full rounded-md border border-blue-300 px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Ver histórico deste produto no cliente
                    </button>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded-lg hidden md:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                        Produto
                      </th>
                      <th className="px-8 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                        Qtd.
                      </th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                        Desc. %
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                        Preço Unit.
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                        Subtotal
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item, index) => (
                      <tr key={item.productId || index}>
                        <td className="px-4 py-4">
                          <div className="max-w-[300px]">
                            <div
                              className="text-sm font-medium text-gray-900 truncate"
                              title={item.productName}
                            >
                              {item.productName}
                            </div>
                            <div className="text-sm text-gray-500 space-y-1">
                              {/* ✅ MOSTRA CÓDIGO E SUBCÓDIGO NA TABELA */}
                              <div className="flex flex-wrap gap-1">
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                                  Código: {item.productcode}
                                </span>
                                {item.subcode && (
                                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                                    Sub: {item.subcode}
                                  </span>
                                )}
                              </div>
                              <div title={item.brand}>{item.brand}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              max={item.availableStock || undefined}
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "quantity",
                                  parseInt(e.target.value, 10),
                                )
                              }
                              className="w-full p-2 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            {item.availableStock && (
                              <span className="text-xs text-gray-500">
                                Disponível: {item.availableStock}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.lineDiscount ?? 0}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "lineDiscount",
                                e.target.value,
                              )
                            }
                            className="w-full max-w-[4.5rem] p-1.5 border border-gray-300 rounded-md text-center text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <span className="text-sm text-gray-700">
                            R$ {safeToFixed(item.price)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            R$ {safeToFixed(lineNetTotal(item))}
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-center">
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="px-3 py-1.5 border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors text-sm font-medium"
                              title="Remover Item"
                            >
                              Excluir
                            </button>
                            <button
                              type="button"
                              onClick={() => setHistoryModalItem(item)}
                              disabled={!clientId || !item.productId}
                              className="px-2 py-1 border border-blue-200 text-blue-700 rounded-md hover:bg-blue-50 transition-colors text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Histórico cliente
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- Total --- */}
          <div className="mt-6 bg-gray-50 p-4 sm:p-6 rounded-lg border">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-gray-600">
                <span>Subtotal (após descontos nos itens)</span>
                <span className="font-medium">
                  R$ {safeToFixed(subtotalAfterLineDiscounts)}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between items-center text-gray-600">
                  <span>Desconto geral ({discount}%)</span>
                  <span className="font-medium text-red-500">
                    - R$ {safeToFixed(discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-gray-900 pt-3 border-t">
                <span className="text-lg sm:text-xl font-bold">Total do Pedido</span>
                <span className="text-xl sm:text-2xl font-bold text-green-700">
                  R$ {safeToFixed(totalPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* --- Ações (desktop) --- */}
          <div className="hidden md:flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto min-h-11 px-6 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto min-h-11 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              {editingOrder ? "Atualizar Pedido" : "Criar Pedido"}
            </button>
          </div>
        </form>
      </div>

      {/* Barra fixa: acoes no mobile */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-sm px-3 pt-3 md:hidden"
        style={{
          paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="max-w-4xl mx-auto flex flex-col-reverse gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full min-h-11 px-6 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="order-form-main"
            className="w-full min-h-12 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            {editingOrder ? "Atualizar Pedido" : "Criar Pedido"}
          </button>
        </div>
      </div>
    </div>

      {mobileProductPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-white md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Buscar produto"
        >
          <div className="flex items-center gap-2 border-b border-gray-200 p-3 pt-[max(12px,env(safe-area-inset-top,0px))]">
            <button
              type="button"
              onClick={() => setMobileProductPickerOpen(false)}
              className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              Voltar
            </button>
            <div className="relative flex-1 min-w-0">
              <input
                type="search"
                placeholder={
                  selectedBrand
                    ? "Nome, codigo ou subcodigo..."
                    : "Selecione uma representada"
                }
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                disabled={!selectedBrand}
                className="w-full p-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                autoComplete="off"
                autoFocus
              />
              {isSearching && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain">
            {!selectedBrand && (
              <p className="p-4 text-center text-gray-500">
                Selecione uma representada para buscar produtos.
              </p>
            )}
            {selectedBrand &&
              productSearch.trim().length > 0 &&
              productSearch.trim().length < 2 && (
                <p className="p-4 text-center text-gray-500">
                  Digite pelo menos 2 caracteres.
                </p>
              )}
            {selectedBrand &&
              productSearch.trim().length >= 2 &&
              searchResults.length > 0 &&
              searchResults.map((product) => renderProductResultRow(product))}
            {selectedBrand &&
              productSearch.trim().length >= 2 &&
              searchResults.length === 0 &&
              !isSearching && (
                <div className="p-6 text-center text-gray-500">
                  Nenhum produto encontrado para &quot;{productSearch}&quot;
                </div>
              )}
          </div>
        </div>
      )}
      {historyModalItem && (
        <ClientItemPriceHistoryModal
          clientId={clientId}
          item={historyModalItem}
          onClose={() => setHistoryModalItem(null)}
        />
      )}
    </>
  );
};

export default OrdersForm;
