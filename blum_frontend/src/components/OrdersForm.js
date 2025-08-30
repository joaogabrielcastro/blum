import { useState, useEffect } from "react";
import apiService from "../apiService";

const OrdersForm = ({ onOrderAdded, onCancel, userId }) => {
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [orderItems, setOrderItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [description, setDescription] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("all");

  useEffect(() => {
    const fetchClientsAndProducts = async () => {
      try {
        const clientsData = await apiService.getClients();
        setClients(clientsData);
        const productsData = await apiService.getProducts();
        setProducts(productsData);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      }
    };
    fetchClientsAndProducts();
  }, []);

  const handleAddItem = () => {
    if (!selectedProduct || quantity < 1) {
      alert("Selecione um produto e uma quantidade válida.");
      return;
    }
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;
    const item = {
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      quantity,
      price: Number(product.price) || 0,
    };
    setOrderItems([...orderItems, item]);
    setSelectedProduct("");
    setQuantity(1);
    setProductSearch("");
  };

  const handleRemoveItem = (index) => {
    const newItems = [...orderItems];
    newItems.splice(index, 1);
    setOrderItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClient || orderItems.length === 0) {
      alert(
        "Por favor, selecione um cliente и adicione pelo menos um produto."
      );
      return;
    }
    setLoading(true);
    try {
      const newOrder = {
        clientId: selectedClient,
        userId: userId,
        items: orderItems,
        totalPrice: Number(
          orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0)
        ),
        status: "Em aberto",
        description: description,
      };
      await apiService.createOrder(newOrder);
      onOrderAdded();
    } catch (error) {
      console.error("Erro ao adicionar pedido:", error);
      alert("Falha ao adicionar pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter((client) =>
    client.companyName.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const filteredProducts = products.filter(
    (product) =>
      (selectedBrand === "all" || product.brand === selectedBrand) &&
      product.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleClientSelect = (e) => {
    const selectedName = e.target.value;
    const foundClient = clients.find(
      (c) => c.companyName.toLowerCase() === selectedName.toLowerCase()
    );
    if (foundClient) {
      setSelectedClient(foundClient.id);
      setClientSearch(foundClient.companyName);
    } else {
      setSelectedClient("");
    }
  };

  const handleProductSelect = (e) => {
    const selectedName = e.target.value;
    const foundProduct = products.find(
      (p) => p.name.toLowerCase() === selectedName.toLowerCase()
    );
    if (foundProduct) {
      setSelectedProduct(foundProduct.id);
      setProductSearch(foundProduct.name);
    } else {
      setSelectedProduct("");
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Criar Novo Pedido
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            className="block text-gray-700 text-sm font-medium mb-2"
            htmlFor="client-search"
          >
            Cliente
          </label>
          <input
            type="text"
            id="client-search"
            placeholder="Buscar cliente..."
            value={clientSearch}
            onChange={(e) => {
              setClientSearch(e.target.value);
            }}
            onBlur={handleClientSelect}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            list="client-list"
          />
          <datalist id="client-list">
            {filteredClients.map((client) => (
              <option key={client.id} value={client.companyName} />
            ))}
          </datalist>
        </div>

        <div>
          <label
            className="block text-gray-700 text-sm font-medium mb-2"
            htmlFor="description"
          >
            Descrição do Pedido
          </label>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="3"
          />
        </div>

        <div className="space-y-4 border p-4 rounded-lg">
          <h3 className="font-semibold text-lg">Itens do Pedido</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label
                className="block text-gray-700 text-sm font-medium mb-2"
                htmlFor="product-search"
              >
                Produto
              </label>
              <input
                type="text"
                id="product-search"
                placeholder="Buscar produto..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                }}
                onBlur={handleProductSelect}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                list="product-list"
              />
              <datalist id="product-list">
                {filteredProducts.map((product) => (
                  <option key={product.id} value={product.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label
                className="block text-gray-700 text-sm font-medium mb-2"
                htmlFor="quantity"
              >
                Quantidade
              </label>
              <input
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="number"
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                min="1"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-700">Marca:</span>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg"
            >
              <option value="all">Todas</option>
              <option value="Blumenau">Blumenau</option>
              <option value="Zagonel">Zagonel</option>
              <option value="Padova">Padova</option>
            </select>
            <button
              type="button"
              onClick={handleAddItem}
              className="bg-green-600 text-white font-bold p-3 rounded-lg hover:bg-green-700 transition duration-300 shadow-md"
            >
              Adicionar Item
            </button>
          </div>
          {orderItems.length > 0 && (
            <ul className="divide-y divide-gray-200 mt-4">
              {orderItems.map((item, index) => (
                <li
                  key={index}
                  className="flex justify-between items-center py-2"
                >
                  <span>
                    {item.productName} ({item.quantity} x R$
                    {item.price.toFixed(2)})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end space-x-4 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition duration-300 shadow-md disabled:bg-blue-300"
            disabled={loading}
          >
            {loading ? "Salvando..." : "Salvar Pedido"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrdersForm;
