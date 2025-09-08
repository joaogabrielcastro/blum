import { useState, useEffect } from "react";
import apiService from "../services/apiService";
import OrdersForm from "../components/OrdersForm";
import ConfirmationModal from "../components/ConfirmationModal";
import PdfGenerator from "../components/PdfGenerator";

const OrdersPage = ({ userId, userRole, reps, brands }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [orderToFinalize, setOrderToFinalize] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [clients, setClients] = useState({});
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [orderToPdf, setOrderToPdf] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersData, clientsData] = await Promise.all([
        apiService.getOrders({ userId, userRole }),
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
    if (userId && userRole) {
      fetchData();
    }
  }, [userId, userRole]);

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

  const openPdfModal = (order) => {
    setOrderToPdf(order);
    setShowPdfModal(true);
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

      {showPdfModal && (
        <PdfGenerator
          order={orderToPdf}
          clients={clients}
          reps={reps}
          brands={brands}
          onClose={() => {
            setShowPdfModal(false);
            setOrderToPdf(null);
          }}
        />
      )}

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
            {orders.map((order) => {
              const totalWithDiscount = order.totalprice;

              return (
                <li
                  key={order.id}
                  className="py-4 flex justify-between items-center"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full">
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold text-gray-800">
                        Pedido #{order.id}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Cliente: {clients[order.clientid] || "N/A"}
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
                          ? new Date(order.finishedAt).toLocaleDateString(
                              "pt-BR"
                            )
                          : "N/A"}
                      </p>
                    </div>
                    <div className="mt-2 sm:mt-0 text-right">
                      {order.discount > 0 ? (
                        <>
                          <p className="text-sm text-gray-500 line-through">
                            R$ {(parseFloat(order.totalprice) || 0).toFixed(2)}
                          </p>
                          <p className="text-sm font-semibold text-green-700">
                            R$ {(Number(totalWithDiscount) || 0).toFixed(2)}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-700">
                          Total: R${" "}
                          {(parseFloat(order.totalprice) || 0).toFixed(2)}
                        </p>
                      )}
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
                  <div className="flex space-x-2 ml-4 flex-shrink-0">
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
                        onClick={() => openPdfModal(order)}
                        className="bg-gray-200 text-gray-800 font-bold px-3 py-1 rounded-lg text-sm hover:bg-gray-300"
                      >
                        Gerar PDF
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
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
