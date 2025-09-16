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

  const filteredProducts = products.filter((product) =>
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

      {/* Scroll horizontal em telas menores que 420px */}
      <div className="overflow-x-auto max-[420px]:overflow-x-scroll scroll-smooth">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-lg p-8 space-y-8 min-w-[420px]"
        >
          {/* Cliente e Desconto */}
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

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descrição do pedido (opcional)"
            />
          </div>

          {/* Produtos */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Produtos</h3>
              <div className="flex gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  list="product-list"
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="product-list">
                  {filteredProducts.map((product) => (
                    <option key={product.id} value={product.name} />
                  ))}
                </datalist>
                <button
                  type="button"
                  onClick={() => {
                    const productToAdd = products.find(
                      (p) =>
                        p.name.toLowerCase() === productSearch.toLowerCase()
                    );
                    if (productToAdd) {
                      handleProductSelect(productToAdd);
                    } else {
                      alert("Produto não encontrado.");
                    }
                  }}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600"
                >
                  Adicionar
                </button>
              </div>
            </div>

            {/* Lista de itens */}
            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50"
              >
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    value={item.productName}
                    onChange={(e) =>
                      handleItemChange(index, "productName", e.target.value)
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={item.brand}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    disabled
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantidade
                  </label>
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
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço Unitário *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(e) =>
                      handleItemChange(index, "price", e.target.value)
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    disabled
                  />
                </div>

                <div className="md:col-span-2 flex items-end">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-600 w-full"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-700">
                Total do Pedido:
              </span>
              <span className="text-2xl font-bold text-green-700">
                R$ {safeToFixed(totalPrice)}
              </span>
            </div>
            {discount > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                <span>Desconto: {discount}%</span>
                <span className="ml-2">
                  (Desconto de R$ {safeToFixed(discountAmount)})
                </span>
              </div>
            )}
          </div>

          {/* Ações */}
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
