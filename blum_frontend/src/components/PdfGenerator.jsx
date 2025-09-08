import { useState } from "react";
import jsPDF from "jspdf";

const PdfGenerator = ({ order, clients, reps, brands, onClose }) => {
  const [selectedPdfBrand, setSelectedPdfBrand] = useState(
    brands[0] || "Blumenau"
  );

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
    if (!order) return;

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
    doc.text(`PEDIDO Nº ${order.id}`, margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");

    const clientName = clients[order.clientId] || "N/A";
    const repName = reps[order.userId] || "N/A";
    const orderDate = order.finishedAt
      ? new Date(order.finishedAt).toLocaleDateString("pt-BR")
      : new Date().toLocaleDateString("pt-BR");

    doc.text(`Data do Pedido: ${orderDate}`, pageWidth - margin, yPosition, {
      align: "right",
    });
    yPosition += 5;
    doc.text(`Cliente: ${clientName}`, margin, yPosition);
    yPosition += 5;

    if (order.description) {
      doc.text(`Descrição: ${order.description}`, margin, yPosition);
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
    order.items.forEach((item, index) => {
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = 20;
      }

      const rowHeight = 8;
      const itemTotal = (
        parseFloat(item.price || 0) * (item.quantity || 0)
      ).toFixed(2);

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
        `R$ ${(parseFloat(item.price) || 0).toFixed(2)}`,
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

    const subtotal = parseFloat(order.totalPrice || 0);
    const discountPercent = parseFloat(order.discount || 0);
    const discountAmount = subtotal * (discountPercent / 100);
    const total = subtotal - discountAmount;

    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("RESUMO DO PEDIDO", margin, yPosition);

    doc.setFont(undefined, "normal");
    doc.text(
      `Subtotal: R$ ${(subtotal || 0).toFixed(2)}`,
      pageWidth - margin,
      yPosition,
      { align: "right" }
    );

    if (discountPercent > 0) {
      doc.text(
        `Desconto (${discountPercent}%): R$ ${(discountAmount || 0).toFixed(
          2
        )}`,
        pageWidth - margin,
        yPosition + 5,
        { align: "right" }
      );
      doc.text(
        `TOTAL: R$ ${(total || 0).toFixed(2)}`,
        pageWidth - margin,
        yPosition + 10,
        { align: "right" }
      );
      yPosition += 15;
    } else {
      doc.text(
        `TOTAL: R$ ${(subtotal || 0).toFixed(2)}`,
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

    doc.save(`pedido_${order.id}_${selectedPdfBrand}.pdf`);
    onClose();
  };

  return (
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
            onClick={onClose}
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
  );
};

export default PdfGenerator;
