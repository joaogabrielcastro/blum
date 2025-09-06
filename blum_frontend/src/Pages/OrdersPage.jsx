import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import apiService from "../services/apiService";
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
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [orderToPdf, setOrderToPdf] = useState(null);
  const [selectedPdfBrand, setSelectedPdfBrand] = useState(
    brands[0] || "Blumenau"
  );

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

  const companyInfo = {
    Blumenau: {
      name: "Blumenau Ind. e Com. Ltda",
      address: "Rua João Pessoa, 123 - Centro - Blumenau/SC",
      phone: "(47) 3234-5678 | (47) 99999-9999",
      email: "vendas@blumenau.com.br",
      cnpj: "12.345.678/0001-90",
      ie: "123.456.789",
    },
    Zagonel: {
      name: "Zagonel Comércio de Eletrônicos",
      address: "Av. Brasil, 456 - Centro - Florianópolis/SC",
      phone: "(48) 3234-5678 | (48) 88888-8888",
      email: "vendas@zagonel.com.br",
      cnpj: "98.765.432/0001-10",
      ie: "987.654.321",
    },
    Padova: {
      name: "Padova Automação e Soluções",
      address: "Rua das Flores, 789 - Centro - Curitiba/PR",
      phone: "(41) 3234-5678 | (41) 77777-7777",
      email: "vendas@padova.com.br",
      cnpj: "11.223.344/0001-55",
      ie: "112.233.445",
    },
    default: {
      name: "Blum - Gestão de Pedidos Eletrônicos",
      address: "www.blum.com",
      phone: "",
      email: "",
      cnpj: "",
      ie: "",
    },
  };

  const handleGeneratePdf = () => {
    if (!orderToPdf) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    let yPosition = 15;

    const company = companyInfo[selectedPdfBrand] || companyInfo.default;

    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text(company.name, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(company.address, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 5;

    if (company.phone) {
      doc.text(company.phone, pageWidth / 2, yPosition, { align: "center" });
      yPosition += 5;
    }

    if (company.email) {
      doc.text(company.email, pageWidth / 2, yPosition, { align: "center" });
      yPosition += 5;
    }

    if (company.cnpj) {
      doc.text(
        `CNPJ: ${company.cnpj} | IE: ${company.ie}`,
        pageWidth / 2,
        yPosition,
        { align: "center" }
      );
      yPosition += 10;
    }

    doc.setDrawColor(200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text(`PEDIDO Nº ${orderToPdf.id}`, margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");

    const clientName = clients[orderToPdf.clientId] || "N/A";
    const repName = reps[orderToPdf.userId] || "N/A";
    const orderDate = orderToPdf.finishedAt
      ? new Date(orderToPdf.finishedAt).toLocaleDateString("pt-BR")
      : new Date().toLocaleDateString("pt-BR");

    doc.text(`Data do Pedido: ${orderDate}`, pageWidth - margin, yPosition, {
      align: "right",
    });
    yPosition += 5;
    doc.text(`Cliente: ${clientName}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Vendedor: ${repName}`, margin, yPosition);
    yPosition += 5;

    if (orderToPdf.description) {
      doc.text(`Descrição: ${orderToPdf.description}`, margin, yPosition);
      yPosition += 8;
    } else {
      yPosition += 5;
    }

    doc.setFont(undefined, "bold");
    doc.setFillColor(61, 101, 155);
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, "F");

    doc.text("Cód", margin + 5, yPosition + 5);
    doc.text("Produto", margin + 25, yPosition + 5);
    doc.text("Marca", margin + 90, yPosition + 5);
    doc.text("Qtd", pageWidth - 75, yPosition + 5);
    doc.text("Preço Unit.", pageWidth - 60, yPosition + 5);
    doc.text("Total", pageWidth - 25, yPosition + 5, { align: "right" });

    yPosition += 10;
    doc.setFont(undefined, "normal");
    doc.setTextColor(0, 0, 0);

    let tableBottom = yPosition;
    orderToPdf.items.forEach((item, index) => {
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = 20;
      }

      const rowHeight = 8;
      const itemTotal = (parseFloat(item.price || 0) * item.quantity).toFixed(
        2
      );

      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight, "F");
      }

      doc.setTextColor(0, 0, 0);
      doc.text((index + 1).toString(), margin + 5, yPosition + 5);

      const productName = item.productName || "Produto";
      if (productName.length > 20) {
        doc.text(
          productName.substring(0, 20) + "...",
          margin + 25,
          yPosition + 5
        );
      } else {
        doc.text(productName, margin + 25, yPosition + 5);
      }

      doc.text(item.brand || "-", margin + 90, yPosition + 5);
      doc.text(item.quantity.toString(), pageWidth - 75, yPosition + 5);
      doc.text(
        `R$ ${parseFloat(item.price || 0).toFixed(2)}`,
        pageWidth - 60,
        yPosition + 5
      );
      doc.text(`R$ ${itemTotal}`, pageWidth - 25, yPosition + 5, {
        align: "right",
      });

      yPosition += rowHeight;
      tableBottom = yPosition;
    });

    doc.setDrawColor(0, 0, 0);
    doc.line(margin, tableBottom, pageWidth - margin, tableBottom);
    yPosition = tableBottom + 10;

    const subtotal = parseFloat(orderToPdf.totalPrice || 0);
    const discountPercent = parseFloat(orderToPdf.discount || 0);
    const discountAmount = subtotal * (discountPercent / 100);
    const total = subtotal - discountAmount;

    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("RESUMO DO PEDIDO", margin, yPosition);

    doc.setFont(undefined, "normal");
    doc.text(
      `Subtotal: R$ ${subtotal.toFixed(2)}`,
      pageWidth - margin,
      yPosition,
      { align: "right" }
    );

    if (discountPercent > 0) {
      doc.text(
        `Desconto (${discountPercent}%): R$ ${discountAmount.toFixed(2)}`,
        pageWidth - margin,
        yPosition + 5,
        { align: "right" }
      );
      doc.text(
        `TOTAL: R$ ${total.toFixed(2)}`,
        pageWidth - margin,
        yPosition + 10,
        { align: "right" }
      );
      yPosition += 15;
    } else {
      doc.text(
        `TOTAL: R$ ${subtotal.toFixed(2)}`,
        pageWidth - margin,
        yPosition + 5,
        { align: "right" }
      );
      yPosition += 10;
    }

    doc.setFontSize(8);
    doc.text(
      "Observações: ________________________________________________",
      margin,
      yPosition
    );
    doc.text(
      "____________________________________________________________",
      margin,
      yPosition + 4
    );
    doc.text(
      "____________________________________________________________",
      margin,
      yPosition + 8
    );

    const signY = yPosition + 15;
    doc.line(margin, signY, pageWidth / 2 - 10, signY);
    doc.line(pageWidth / 2 + 10, signY, pageWidth - margin, signY);
    doc.text("Assinatura do Vendedor", margin, signY + 5);
    doc.text("Assinatura do Cliente", pageWidth / 2 + 10, signY + 5);

    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      "Agradecemos pela preferência! • Este documento não tem valor fiscal",
      pageWidth / 2,
      footerY,
      { align: "center" }
    );

    doc.save(`pedido_${orderToPdf.id}_${selectedPdfBrand}.pdf`);
    setShowPdfModal(false);
    setOrderToPdf(null);
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm w-full mx-4 text-center">
            <h3 className="text-xl font-bold mb-4">Gerar PDF</h3>
            <p className="text-gray-600 mb-6">
              Escolha a marca para o rodapé do PDF:
            </p>
            <div className="mb-6">
              <select
                value={selectedPdfBrand}
                onChange={(e) => setSelectedPdfBrand(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {(brands || []).map((brandName) => (
                  <option key={brandName} value={brandName}>
                    {brandName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-around space-x-4">
              <button
                onClick={() => setShowPdfModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleGeneratePdf}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Gerar PDF
              </button>
            </div>
          </div>
        </div>
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
              const totalWithDiscount = order.totalPrice;

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
                            R$ {parseFloat(order.totalPrice || 0).toFixed(2)}
                          </p>
                          <p className="text-sm font-semibold text-green-700">
                            R$ {totalWithDiscount.toFixed(2)}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-700">
                          Total: R${" "}
                          {parseFloat(order.totalPrice || 0).toFixed(2)}
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
