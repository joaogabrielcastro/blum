import { useState, useEffect } from "react";
import apiService from "../services/apiService";

const OrdersForm = ({
  userId,
  clients,
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

  // Função segura para toFixed
  const safeToFixed = (value, decimals = 2) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "0.00";
    return num.toFixed(decimals);
  };

  // Calcular subtotal e desconto CORRETAMENTE
  const subtotal = items.reduce((total, item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity) || 1;
    return total + price * quantity;
  }, 0);

  const discountAmount = subtotal * (parseFloat(discount) / 100);
  const netTotal = subtotal - discountAmount;

  useEffect(() => {
    if (editingOrder) {
      const cid =
        editingOrder.clientId ?? editingOrder.clientid ?? editingOrder.client_id;
      setClientId(cid != null && cid !== "" ? String(cid) : "");
      setDescription(editingOrder.description || "");
      setItems(editingOrder.items || []);
      setDiscount(editingOrder.discount || 0);
      setTotalPrice(editingOrder.totalPrice ?? editingOrder.totalprice ?? 0);
      const firstBrand = editingOrder.items?.find((i) => i.brand)?.brand;
      if (firstBrand) setSelectedBrand(firstBrand);
    }
  }, [editingOrder, brands, clients]);

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

        // ✅ BUSCA AVANÇADA: Por nome, código ou subcódigo
        const searchTerm = productSearch.toLowerCase().trim();

        const filtered = products.filter(
          (product) =>
            // Filtra primeiro pela marca selecionada
            product.brand === selectedBrand &&
            // Busca por NOME
            (product.name.toLowerCase().includes(searchTerm) ||
              // Busca por CÓDIGO DO PRODUTO
              (product.productcode &&
                product.productcode.toLowerCase().includes(searchTerm)) ||
              // ✅ BUSCA POR SUBCÓDIGO
              (product.subcode &&
                product.subcode.toLowerCase().includes(searchTerm))),
        );

        // ✅ ORDENA POR RELEVÂNCIA
        const sortedResults = filtered.sort((a, b) => {
          const aNameMatch = a.name.toLowerCase().includes(searchTerm);
          const bNameMatch = b.name.toLowerCase().includes(searchTerm);
          const aCodeMatch =
            a.productcode && a.productcode.toLowerCase().includes(searchTerm);
          const bCodeMatch =
            b.productcode && b.productcode.toLowerCase().includes(searchTerm);
          const aSubcodeMatch =
            a.subcode && a.subcode.toLowerCase().includes(searchTerm);
          const bSubcodeMatch =
            b.subcode && b.subcode.toLowerCase().includes(searchTerm);

          // Prioridade: subcódigo > código > nome
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

    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleProductSelect = (product) => {
    if (product) {
      const existingItem = items.find(
        (item) => item.productName === product.name,
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
  };

  const removeItem = (index) => {
    setItems((prevItems) => prevItems.filter((_, i) => i !== index));
  };

  // ✅ FUNÇÃO AUXILIAR: Limpar busca
  const clearSearch = () => {
    setProductSearch("");
    setSearchResults([]);
  };

  const clientOptions = Object.entries(clients || {})
    .map(([id, name]) => ({
      id: String(id),
      label: name != null && String(name).trim() !== "" ? String(name) : `Cliente #${id}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

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
        })),
        discount: parseFloat(discount) || 0,
        totalprice: parseFloat(netTotal) || 0,
      };

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

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 lg:px-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">
        {editingOrder ? "Editar Pedido" : "Criar Novo Pedido"}
      </h2>
      <div className="overflow-x-auto max-[420px]:overflow-x-scroll scroll-smooth w-full">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-lg p-2 sm:p-4 md:p-8 space-y-8 min-w-[320px] w-full"
        >
          {/* --- Cliente e Representada --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um cliente</option>
                {clientOptions.map(({ id, label }) => (
                  <option key={id} value={id} title={label}>
                    {label}
                  </option>
                ))}
              </select>
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* --- Descrição e Desconto --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descrição do pedido (opcional)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Desconto (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* --- Seção de Produtos COM BUSCA AVANÇADA --- */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">
              Adicionar Produtos
            </h3>

            {/* ✅ BUSCA AVANÇADA */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔍 Buscar Produto (nome, código ou subcódigo)
              </label>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Digite nome, código do produto ou subcódigo..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  disabled={!selectedBrand}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  autoComplete="off"
                />

                {/* ✅ INDICADOR DE CARREGAMENTO */}
                {isSearching && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                )}

                {/* ✅ BOTÃO LIMPAR */}
                {productSearch && !isSearching && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* ✅ RESULTS DA BUSCA AVANÇADA */}
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => handleProductSelect(product)}
                      className="p-3 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {/* ✅ MOSTRA CÓDIGO E SUBCÓDIGO */}
                            <span className="bg-gray-100 px-2 py-1 rounded mr-2">
                              Código: {product.productcode}
                            </span>
                            {product.subcode && (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Subcódigo: {product.subcode}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {product.brand}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-green-600">
                            R$ {safeToFixed(product.price)}
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
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
                  ))}
                </div>
              )}

              {/* ✅ MENSAGEM DE NENHUM RESULTADO */}
              {productSearch && searchResults.length === 0 && !isSearching && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
                  <div className="text-center text-gray-500">
                    Nenhum produto encontrado para "{productSearch}"
                  </div>
                  <div className="text-xs text-gray-400 mt-2 text-center">
                    Tente buscar por nome, código do produto ou subcódigo
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* --- Tabela de Itens Adicionados --- */}
          {items.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Itens do Pedido
              </h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                        Produto
                      </th>
                      <th className="px-8 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                        Qtd.
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                        Preço Unit.
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                        Subtotal
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
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
                                  parseInt(e.target.value),
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
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <span className="text-sm text-gray-700">
                            R$ {safeToFixed(item.price)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            R$ {safeToFixed(item.price * item.quantity)}
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Remover Item"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- Total --- */}
          <div className="mt-6 bg-gray-50 p-6 rounded-lg border">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">R$ {safeToFixed(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between items-center text-gray-600">
                  <span>Desconto ({discount}%)</span>
                  <span className="font-medium text-red-500">
                    - R$ {safeToFixed(discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-gray-900 pt-3 border-t">
                <span className="text-xl font-bold">Total do Pedido</span>
                <span className="text-2xl font-bold text-green-700">
                  R$ {safeToFixed(totalPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* --- Ações --- */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              {editingOrder ? "Atualizar Pedido" : "Criar Pedido"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrdersForm;
