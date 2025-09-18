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
  const [clientSearch, setClientSearch] = useState("");

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
      setClientId(editingOrder.clientid);
      setDescription(editingOrder.description || "");
      setItems(editingOrder.items || []);
      setDiscount(editingOrder.discount || 0);
      setTotalPrice(editingOrder.totalprice || 0);
    }
  }, [editingOrder, brands, clients]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsData = await apiService.getProducts();
        setProducts(productsData);
      } catch (error) {
        console.error("Erro ao buscar produtos:", error);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    // Atualiza o total sempre que items ou discount mudar
    setTotalPrice(netTotal);
  }, [items, discount, netTotal]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleProductSelect = (product) => {
    if (product) {
      const existingItem = items.find(
        (item) => item.productName === product.name
      );
      if (!existingItem) {
        const newItem = {
          productName: product.name,
          brand: product.brand,
          quantity: 1,
          price: product.price,
          productId: product.id,
        };
        setItems((prevItems) => [...prevItems, newItem]);
      } else {
        alert("Este produto já foi adicionado ao pedido.");
      }
    }
    setProductSearch("");
  };

  const removeItem = (index) => {
    setItems((prevItems) => prevItems.filter((_, i) => i !== index));
  };

  const filteredProducts = products
    // 1. Filtra primeiro pela marca selecionada
    .filter((product) => product.brand === selectedBrand)
    // 2. Depois, filtra pelo texto de busca
    .filter((product) =>
      product.name.toLowerCase().includes(productSearch.toLowerCase())
    );

  const filteredClients = Object.entries(clients).filter(([id, name]) =>
    name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const handleClientSearch = (e) => {
    const selectedName = e.target.value;
    setClientSearch(selectedName);
    const client = Object.entries(clients).find(
      ([id, name]) => name.toLowerCase() === selectedName.toLowerCase()
    );
    if (client) {
      setClientId(client[0]);
    } else {
      setClientId("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientId) {
      alert("Por favor, selecione um cliente.");
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
        "ID do usuário não disponível. Por favor, tente fazer login novamente."
      );
      return;
    }
    try {
      const orderData = {
        clientid: parseInt(clientId),
        userid: userId, // ← userid em minúsculo
        description: description,
        items: items.map((item) => ({
          ...item,
          price: parseFloat(item.price) || 0,
          quantity: parseInt(item.quantity) || 1,
        })),
        discount: parseFloat(discount) || 0,
        totalprice: parseFloat(netTotal) || 0, // ← totalprice em minúsculo
      };

      if (editingOrder) {
        await apiService.updateOrder(editingOrder.id, orderData);
      } else {
        await apiService.createOrder(orderData);
      }

      onOrderAdded();
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
      alert("Falha ao salvar o pedido. Tente novamente.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">
        {editingOrder ? "Editar Pedido" : "Criar Novo Pedido"}
      </h2>
      <div className="overflow-x-auto max-[420px]:overflow-x-scroll scroll-smooth">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-lg p-8 space-y-8 min-w-[420px]"
        >
          {/* --- Cliente e Representada --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente *
              </label>
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={clientSearch}
                onChange={handleClientSearch}
                list="client-list"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="client-list">
                {filteredClients.map(([id, name]) => (
                  <option key={id} value={name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Representada *
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                disabled={!clientId}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Selecione uma representada</option>
                {Array.isArray(brands) &&
                  brands.map((brand) => (
                    <option key={brand.name} value={brand.name}>
                      {brand.name}
                    </option>
                  ))}
              </select>
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

          {/* --- Seção de Produtos --- */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">
              Adicionar Produtos
            </h3>
            <div className="relative">
              <label htmlFor="product-search" className="sr-only">
                Buscar produto
              </label>
              <input
                id="product-search"
                type="text"
                placeholder="Digite para buscar um produto..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                disabled={!selectedBrand}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                autoComplete="off"
              />
              {productSearch && filteredProducts.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <li
                      key={product.id}
                      onClick={() => handleProductSelect(product)}
                      className="p-3 cursor-pointer hover:bg-blue-50"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{product.name}</p>
                          <p className="text-sm text-gray-500">
                            {product.brand}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-700">
                            R$ {safeToFixed(product.price)}
                          </p>
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
                    </li>
                  ))}
                </ul>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qtd.
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Preço Unit.
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subtotal
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item, index) => (
                      <tr key={item.productId || index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {item.productName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.brand}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap w-24">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "quantity",
                                parseInt(e.target.value)
                              )
                            }
                            className="w-full p-1 border border-gray-300 rounded-md text-center"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm text-gray-700">
                            R$ {safeToFixed(item.price)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            R$ {safeToFixed(item.price * item.quantity)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-900"
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
