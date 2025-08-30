import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import apiService from "../apiService";
import OrdersForm from "../components/OrdersForm";
import ConfirmationModal from "../components/ConfirmationModal";

const OrdersPage = ({ userId, reps, brands }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [orderToFinalize, setOrderToFinalize] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [clients, setClients] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersData, clientsData] = await Promise.all([
        apiService.getOrders(userId),
        apiService.getClients(),
      ]);

      setOrders(ordersData);

      const clientsMap = {};
      clientsData.forEach((client) => {
        clientsMap[client.id] = client.companyName;
      });
      setClients(clientsMap);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const handleEdit = (order) => {
    setEditingOrder(order);
    setShowForm(true);
  };

  const handleDelete = (orderId) => {
    setOrderToDelete(orderId);
    setShowModal(true);
  };

  const handleFinalize = (orderId) => {
    setOrderToFinalize(orderId);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    try {
      await apiService.deleteOrder(orderToDelete);
      console.log(`Pedido ${orderToDelete} excluído com sucesso.`);
      setOrders(orders.filter((order) => order.id !== orderToDelete));
    } catch (error) {
      console.error("Erro ao excluir pedido:", error);
      alert("Falha ao excluir o pedido. Tente novamente.");
    } finally {
      setShowModal(false);
      setOrderToDelete(null);
    }
  };

  const confirmFinalize = async () => {
    if (!orderToFinalize) return;
    try {
      await apiService.finalizeOrder(orderToFinalize);
      console.log(`Pedido ${orderToFinalize} finalizado com sucesso.`);
      setOrders(
        orders.map((order) =>
          order.id === orderToFinalize
            ? {
                ...order,
                status: "Entregue",
                finishedAt: new Date().toISOString(),
              }
            : order
        )
      );
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      alert("Falha ao finalizar o pedido. Tente novamente.");
    } finally {
      setShowModal(false);
      setOrderToFinalize(null);
    }
  };

  const handleGeneratePdf = (order) => {
    const doc = new jsPDF();
    doc.text(`Pedido #${order.id}`, 10, 10);
    doc.text(`Cliente: ${clients[order.clientId]}`, 10, 20);
    doc.text(`Vendedor: ${reps[order.userId]}`, 10, 30);
    doc.text(
      `Data de Finalização: ${
        order.finishedAt
          ? new Date(order.finishedAt).toLocaleDateString("pt-BR")
          : "N/A"
      }`,
      10,
      40
    );
    doc.text(`Descrição: ${order.description || "N/A"}`, 10, 50);

    const tableColumn = [
      "Produto",
      "Marca",
      "Quantidade",
      "Preço Unitário",
      "Total",
    ];
    const tableRows = [];

    order.items.forEach((item) => {
      const itemData = [
        item.productName,
        item.brand,
        item.quantity,
        `R$ ${parseFloat(item.price).toFixed(2)}`,
        `R$ ${(parseFloat(item.price) * item.quantity).toFixed(2)}`,
      ];
      tableRows.push(itemData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 60,
      theme: "grid",
      headStyles: { fillColor: [241, 243, 244], textColor: [0, 0, 0] },
      styles: { fontSize: 10, cellPadding: 2, overflow: "linebreak" },
    });

    const finalY = doc.autoTable.previous.finalY;
    const discountAmount =
      parseFloat(order.totalPrice) * (parseFloat(order.discount) / 100) || 0;
    doc.text(
      `Desconto: R$ ${discountAmount.toFixed(2)} (${order.discount}%)`,
      10,
      finalY + 10
    );
    doc.text(
      `Valor Total: R$ ${parseFloat(order.totalPrice).toFixed(2)}`,
      10,
      finalY + 20
    );

    const footerText = "Blum - Gestão de Pedidos Eletrônicos | www.blum.com";
    const footerY = doc.internal.pageSize.height - 10;
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(footerText, 10, footerY);

    doc.save(`pedido_${order.id}.pdf`);
  };

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">Carregando pedidos...</div>
    );
  if (showForm) {
    return (
      <div className="p-8">
        <OrdersForm
          userId={userId}
          clients={clients}
          onOrderAdded={() => {
            setShowForm(false);
            setEditingOrder(null);
            fetchData();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingOrder(null);
          }}
          brands={brands}
          editingOrder={editingOrder}
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <ConfirmationModal
        show={showModal}
        onConfirm={orderToDelete ? confirmDelete : confirmFinalize}
        onCancel={() => {
          setShowModal(false);
          setOrderToDelete(null);
          setOrderToFinalize(null);
        }}
        message={
          orderToDelete
            ? "Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita."
            : "Tem certeza que deseja finalizar este pedido? Esta ação não pode ser desfeita."
        }
      />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Gerenciamento de Pedidos
        </h1>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingOrder(null);
          }}
          className="bg-blue-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md"
        >
          + Criar Pedido
        </button>
      </div>
      <p className="text-gray-600 mb-8">
        Acompanhe o status e histórico de pedidos.
      </p>
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
        {orders.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {orders.map((order) => (
              <li
                key={order.id}
                className="py-4 flex justify-between items-center"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">
                      Pedido #{order.id}
                    </h2>
                    <p className="text-sm text-gray-500">
                      Cliente: {clients[order.clientId] || "N/A"}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Vendedor: {reps[order.userId] || "N/A"}
                    </p>
                    {order.items && (
                      <p className="text-sm text-gray-500 mt-1">
                        Itens: {order.items.length}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Descrição: {order.description || "N/A"}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Finalizado em:{" "}
                      {order.finishedAt
                        ? new Date(order.finishedAt).toLocaleDateString("pt-BR")
                        : "N/A"}
                    </p>
                  </div>
                  <div className="mt-2 sm:mt-0 text-right">
                    <p className="text-sm text-gray-700">
                      Total: R${" "}
                      {parseFloat(order.totalPrice)?.toFixed(2) || "N/A"}
                    </p>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === "Entregue"
                          ? "bg-green-100 text-green-800"
                          : order.status === "Em aberto"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {order.status || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  {order.status === "Em aberto" && (
                    <button
                      onClick={() => handleEdit(order)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      Editar
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(order.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Excluir
                  </button>
                  {order.status === "Em aberto" && (
                    <button
                      onClick={() => handleFinalize(order.id)}
                      className="text-green-500 hover:text-green-700 ml-2"
                    >
                      Finalizar
                    </button>
                  )}
                  {order.status === "Entregue" && (
                    <button
                      onClick={() => handleGeneratePdf(order)}
                      className="bg-gray-200 text-gray-800 font-bold px-3 py-1 rounded-lg text-sm hover:bg-gray-300"
                    >
                      Gerar PDF
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-gray-500">
            Nenhum pedido encontrado.
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
