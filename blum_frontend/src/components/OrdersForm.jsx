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

  useEffect(() => {
    if (editingOrder) {
      setClientId(editingOrder.clientId);
      setDescription(editingOrder.description || "");
      setItems(editingOrder.items || []);
      setDiscount(editingOrder.discount || 0);
      setTotalPrice(editingOrder.totalPrice || 0);
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
    calculateTotal();
  }, [items, discount]);

  const calculateTotal = () => {
    const subtotal = items.reduce((total, item) => {
      return total + parseFloat(item.price || 0) * item.quantity;
    }, 0);
    const discountAmount = subtotal * (discount / 100);
    setTotalPrice(subtotal - discountAmount);
  };

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
        clientId,
        userId,
        description,
        items,
        discount: parseFloat(discount),
        totalPrice,
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
    <div className="max-w-4xl mx-auto">
           {" "}
      <h2 className="text-2xl font-bold mb-6">
                {editingOrder ? "Editar Pedido" : "Criar Novo Pedido"}     {" "}
      </h2>
                  {" "}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-md p-6"
      >
               {" "}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                   {" "}
          <div>
                       {" "}
            <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cliente *            {" "}
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
                     {" "}
          </div>
                   {" "}
          <div>
                       {" "}
            <label className="block text-sm font-medium text-gray-700 mb-2">
                            Desconto (%)            {" "}
            </label>
                       {" "}
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
                     {" "}
          </div>
                 {" "}
        </div>
               {" "}
        <div className="mb-6">
                   {" "}
          <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descrição          {" "}
          </label>
                   {" "}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Descrição do pedido (opcional)"
          />
                 {" "}
        </div>
               {" "}
        <div className="mb-6">
                   {" "}
          <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Produtos</h3>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Buscar produto..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                list="product-list"
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    (p) => p.name.toLowerCase() === productSearch.toLowerCase()
                  );
                  if (productToAdd) {
                    handleProductSelect(productToAdd);
                  } else {
                    alert("Produto não encontrado.");
                  }
                }}
                className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-600"
              >
                Adicionar
              </button>
            </div>
                     {" "}
          </div>
                   {" "}
          {items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 p-4 border border-gray-200 rounded-lg"
            >
                           {" "}
              <div className="md:col-span-4">
                               {" "}
                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nome do Produto *                {" "}
                </label>
                               {" "}
                <input
                  type="text"
                  value={item.productName}
                  onChange={(e) =>
                    handleItemChange(index, "productName", e.target.value)
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                             {" "}
              </div>
                           {" "}
              <div className="md:col-span-2">
                               {" "}
                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Marca                {" "}
                </label>
                               {" "}
                <input
                  type="text"
                  value={item.brand}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                  disabled
                />
                             {" "}
              </div>
                           {" "}
              <div className="md:col-span-2">
                               {" "}
                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Quantidade                {" "}
                </label>
                               {" "}
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
                             {" "}
              </div>
                           {" "}
              <div className="md:col-span-2">
                               {" "}
                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Preço Unitário *                {" "}
                </label>
                               {" "}
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
                             {" "}
              </div>
                           {" "}
              <div className="md:col-span-2 flex items-end">
                               {" "}
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-600 w-full"
                >
                                    Remover                {" "}
                </button>
                             {" "}
              </div>
                         {" "}
            </div>
          ))}
                 {" "}
        </div>
               {" "}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
                   {" "}
          <div className="flex justify-between items-center">
                       {" "}
            <span className="text-lg font-semibold">Total do Pedido:</span>     
                 {" "}
            <span className="text-2xl font-bold text-green-700">
                            R$ {totalPrice.toFixed(2)}           {" "}
            </span>
                     {" "}
          </div>
                   {" "}
          {discount > 0 && (
            <div className="mt-2 text-sm text-gray-600">
                            <span>Desconto: {discount}% </span>             {" "}
              <span>
                (Desconto de R$ {((totalPrice * discount) / 100).toFixed(2)})
              </span>
                         {" "}
            </div>
          )}
                 {" "}
        </div>
               {" "}
        <div className="flex justify-end space-x-4">
                   {" "}
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-100"
          >
                        Cancelar          {" "}
          </button>
                   {" "}
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
          >
                        {editingOrder ? "Atualizar Pedido" : "Criar Pedido"}   
                 {" "}
          </button>
                 {" "}
        </div>
             {" "}
      </form>
         {" "}
    </div>
  );
};

export default OrdersForm;
