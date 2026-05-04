import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import formatCurrency from "../utils/format";
import { formatClientAddressLines } from "../utils/clients";

const PAYMENT_PDF_LABELS = {
  carteira: "Carteira (em aberto)",
  boleto: "Boleto",
  pix: "PIX",
  cheque: "Cheque",
  dinheiro: "Dinheiro",
};

// Função utilitária para normalizar items
const normalizeItems = (items) => {
  if (Array.isArray(items)) return items;
  if (typeof items === "string") {
    try {
      return JSON.parse(items || "[]");
    } catch {
      return [];
    }
  }
  return [];
};

const formatQuantityForPdf = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n - Math.round(n)) < 0.0001) return String(Math.round(n));
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
};

const PdfGenerator = ({ order, clients, clientsList = [], brands, onClose }) => {
  const [selectedPdfBrand, setSelectedPdfBrand] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [headerImage, setHeaderImage] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (brands && brands.length > 0) {
      setSelectedPdfBrand(brands[0].name || "Blumenau");
    } else {
      setSelectedPdfBrand("Blumenau");
    }

    const loadHeaderImage = async () => {
      try {
        const response = await fetch("/images/BLU1M.jpg");
        if (!response.ok) throw new Error("Imagem não encontrada");
        
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const imageData = reader.result;
          
          const img = new Image();
          img.onload = () => {
            setHeaderImage(imageData);
            setImageDimensions({
              width: img.width,
              height: img.height
            });
            setImageLoaded(true);
          };
          img.onerror = () => {
            setHeaderImage(imageData);
            setImageLoaded(true);
          };
          img.src = imageData;
        };
        reader.onerror = () => {
          console.warn("Erro ao ler imagem, usando layout padrão");
          setImageLoaded(true);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.warn("Imagem não encontrada, usando layout padrão");
        setImageLoaded(true);
      }
    };

    loadHeaderImage();
  }, [brands]);

  const bankInfo = {
    Blumenau: {
      companyName: "BLUM CURITIBA LTDA.",
      bank: "BRADESCO",
      agency: "1867",
      account: "51385-7",
      pix: "53.283.047/0001-76"
    },
    Zagonel: {
      companyName: "ZAGONEL COMÉRCIO LTDA.",
      bank: "SICREDI",
      agency: "1234",
      account: "12345-6",
      pix: "12.345.678/0001-90"
    },
    Padova: {
      companyName: "PADOVA AUTOMAÇÃO LTDA.",
      bank: "ITAU",
      agency: "5678",
      account: "98765-4",
      pix: "98.765.432/0001-10"
    },
    default: {
      companyName: "BLUM CURITIBA LTDA.",
      bank: "BRADESCO",
      agency: "1867",
      account: "51385-7",
      pix: "53.283.047/0001-76"
    }
  };

  const handleGeneratePdf = async () => {
    if (!order) return;

    const pdfDocType =
      order.documentType === "orcamento" ? "Orçamento" : "Pedido";
    const filePrefix =
      order.documentType === "orcamento" ? "orcamento" : "pedido";

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    let yPosition = 15;

    const columns = {
      produto: margin + 2,
      desc: pageWidth - 88,
      qtd: pageWidth - 70,
      preco: pageWidth - 48,
      subtotal: pageWidth - 15,
      totais: {
        label: pageWidth - 70,
        value: pageWidth - 15,
      },
    };

    const checkPageOverflow = (heightNeeded = 15) => {
      if (yPosition + heightNeeded > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
        return true;
      }
      return false;
    };

    // ✅ CORREÇÃO: Imagem menor e mais compacta
    if (headerImage && imageLoaded && imageDimensions.width > 0) {
      try {
        // Define uma largura máxima menor para a imagem
        const maxWidth = (pageWidth - 2 * margin) * 0.6; // 60% da largura disponível
        const scale = maxWidth / imageDimensions.width;
        const imgHeight = imageDimensions.height * scale;

        // Limita a altura máxima para não ocupar muito espaço
        const maxHeight = 25; // Altura máxima em mm
        const finalHeight = Math.min(imgHeight, maxHeight);
        const finalWidth = (finalHeight / imgHeight) * maxWidth;

        // Centraliza horizontalmente
        const imgX = (pageWidth - finalWidth) / 2;
        doc.addImage(headerImage, "JPEG", imgX, yPosition, finalWidth, finalHeight);
        yPosition += finalHeight + 8; // ✅ Menos espaço após a imagem
        
      } catch (error) {
        console.error("Erro ao adicionar imagem:", error);
        createDefaultHeader(doc, pageWidth, order.id, pdfDocType);
        yPosition = 35; // ✅ Header padrão também mais compacto
      }
    } else {
      createDefaultHeader(doc, pageWidth, order.id, pdfDocType);
      yPosition = 35; // ✅ Header padrão mais compacto
    }

    // ✅ CORREÇÃO: Número do pedido mais destacado
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text(
      `${pdfDocType} Nº ${order.id}`,
      pageWidth / 2,
      yPosition,
      { align: "center" },
    );
    yPosition += 8;

    // Informações do cliente
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    
    const cid = order.clientId ?? order.clientid;
    const clientName = clients[cid] || "N/A";
    doc.text(`Cliente: ${clientName}`, margin, yPosition);
    yPosition += 5;

    const clientRow = clientsList.find(
      (c) => String(c.id ?? c.Id) === String(cid),
    );
    const addrLines = formatClientAddressLines(clientRow);
    if (addrLines.length > 0) {
      doc.setFontSize(9);
      addrLines.forEach((ln) => {
        checkPageOverflow(8);
        doc.text(ln, margin, yPosition);
        yPosition += 4;
      });
    }

    yPosition += 4;
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, "F");

    doc.text("PRODUTO", columns.produto, yPosition + 5);
    doc.setFontSize(8);
    doc.text("DESC.%", columns.desc, yPosition + 5, { align: "right" });
    doc.setFontSize(9);
    doc.text("QTD.", columns.qtd, yPosition + 5, { align: "right" });
    doc.text("PREÇO UNIT.", columns.preco, yPosition + 5, { align: "right" });
    doc.text("SUBTOTAL", columns.subtotal, yPosition + 5, { align: "right" });

    yPosition += 10;

    doc.setFont(undefined, "normal");
    doc.setFontSize(9);

    const items = normalizeItems(order.items);

    items.forEach((item, index) => {
      checkPageOverflow(15);

      const productName = item.productName || item.name || "Produto";
      const productCode =
        item.productCode ??
        item.productcode ??
        item.product_code ??
        "";
      const subCode = item.subCode ?? item.subcode ?? "";
      const codePart = productCode || subCode;
      const productLabel = codePart
        ? `${productName} (Cod: ${codePart})`
        : productName;
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice || item.price || 0);
      const ld = Number(item.lineDiscount ?? item.line_discount ?? 0) || 0;
      const lineFactor = 1 - Math.min(100, Math.max(0, ld)) / 100;
      const lineSubtotal = quantity * unitPrice * lineFactor;

      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPosition, pageWidth - 2 * margin, 12, "F");
      }

      const maxWidth = columns.desc - columns.produto - 4;
      const productLines = doc.splitTextToSize(productLabel, maxWidth);

      const lineHeight = Math.max(12, productLines.length * 4);

      productLines.forEach((line, lineIndex) => {
        doc.text(line, columns.produto, yPosition + 4 + lineIndex * 4);
      });

      doc.text(
        ld > 0 ? `${Number(ld).toFixed(1)}%` : "—",
        columns.desc,
        yPosition + 5,
        { align: "right" },
      );
      doc.text(formatQuantityForPdf(quantity), columns.qtd, yPosition + 5, {
        align: "right",
      });
      doc.text(
        formatCurrency(unitPrice),
        columns.preco,
        yPosition + 5,
        { align: "right" },
      );
      doc.text(
        formatCurrency(lineSubtotal),
        columns.subtotal,
        yPosition + 5,
        { align: "right" },
      );

      yPosition += lineHeight;
    });

    yPosition += 8;

    checkPageOverflow(20);

    let subtotalAfterLines = 0;
    items.forEach((item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice || item.price || 0);
      const ld = Number(item.lineDiscount ?? item.line_discount ?? 0) || 0;
      const lineFactor = 1 - Math.min(100, Math.max(0, ld)) / 100;
      subtotalAfterLines += quantity * unitPrice * lineFactor;
    });
    const orderDiscPct = Number(order.discount) || 0;
    const orderDiscAmt = subtotalAfterLines * (orderDiscPct / 100);
    const totalValue =
      Number(order.totalPrice) || subtotalAfterLines - orderDiscAmt;

    doc.setDrawColor(200, 200, 200);
    doc.line(
      columns.totais.label - 10,
      yPosition,
      columns.totais.value + 5,
      yPosition,
    );
    yPosition += 6;

    doc.setFont(undefined, "normal");
    doc.setFontSize(9);
    doc.text("Subtotal (itens):", columns.totais.label, yPosition, {
      align: "right",
    });
    doc.text(
      formatCurrency(subtotalAfterLines),
      columns.totais.value,
      yPosition,
      { align: "right" },
    );
    yPosition += 4;

    if (orderDiscPct > 0) {
      doc.text(
        `Desconto geral (${orderDiscPct}%):`,
        columns.totais.label,
        yPosition,
        { align: "right" },
      );
      doc.text(
        `-${formatCurrency(orderDiscAmt)}`,
        columns.totais.value,
        yPosition,
        { align: "right" },
      );
      yPosition += 4;
    }

    doc.setFont(undefined, "bold");
    doc.setFontSize(10);
    doc.text("TOTAL:", columns.totais.label, yPosition, { align: "right" });
    doc.text(
      formatCurrency(totalValue),
      columns.totais.value,
      yPosition,
      { align: "right" },
    );
    yPosition += 12;

    checkPageOverflow(25);

    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("Condição de Pagamento:", margin, yPosition);
    yPosition += 4;

    doc.setFont(undefined, "normal");
    const rawPay = order.paymentMethod ?? order.payment_method;
    const paymentMethod =
      (rawPay && PAYMENT_PDF_LABELS[rawPay]) || rawPay || "—";
    doc.text(String(paymentMethod), margin, yPosition);
    yPosition += 6; // ✅ Menos espaço

    if (order.sellerName || order.sellerUsername) {
      doc.setFont(undefined, "bold");
      doc.text("Pedido lançado por:", margin, yPosition);
      yPosition += 4;
      doc.setFont(undefined, "normal");
      const seller = order.sellerName || order.sellerUsername;
      const withUser =
        order.sellerName && order.sellerUsername
          ? `${order.sellerName} (@${order.sellerUsername})`
          : seller;
      doc.text(String(withUser), margin, yPosition);
      yPosition += 6;
    }

    doc.setFont(undefined, "bold");
    doc.text("Data de Emissão:", margin, yPosition);
    yPosition += 4;
    
    doc.setFont(undefined, "normal");
    const created =
      order.createdAt ?? order.createdat ?? order.created_at ?? null;
    const emissionDate = created
      ? new Date(created).toLocaleDateString("pt-BR")
      : new Date().toLocaleDateString("pt-BR");
    doc.text(emissionDate, margin, yPosition);
    yPosition += 12; // ✅ Menos espaço

    checkPageOverflow(35);

    // Dados bancários
    const bank = bankInfo[selectedPdfBrand] || bankInfo.default;
    
    doc.setFont(undefined, "bold");
    doc.text("DADOS PARA DEPOSITO:", margin, yPosition);
    yPosition += 4; // ✅ Menos espaço
    
    doc.setFont(undefined, "normal");
    doc.text(bank.companyName, margin, yPosition);
    yPosition += 3; // ✅ Menos espaço
    doc.text(bank.bank, margin, yPosition);
    yPosition += 3; // ✅ Menos espaço
    doc.text(`AG: ${bank.agency}`, margin, yPosition);
    yPosition += 3; // ✅ Menos espaço
    doc.text(`C/C: ${bank.account}`, margin, yPosition);
    yPosition += 3; // ✅ Menos espaço
    doc.text(`PIX CNPJ: ${bank.pix}`, margin, yPosition);

    // Footer
    const footerY = pageHeight - 8; // ✅ Footer mais próximo da borda
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text("Agradecemos pela preferência! • Este documento não tem valor fiscal", 
             pageWidth / 2, footerY, { align: "center" });

    doc.save(`${filePrefix}-${order.id}.pdf`);
    onClose();
  };

  const createDefaultHeader = (doc, pageWidth, orderId, titleDoc = "Pedido") => {
    // ✅ Header padrão também mais compacto
    doc.setFillColor(61, 101, 155);
    doc.rect(0, 0, pageWidth, 20, 'F'); // ✅ Altura reduzida
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); // ✅ Fonte menor
    doc.setFont(undefined, "bold");
    doc.text("VENDAS", pageWidth / 2, 8, { align: "center" });
    
    doc.setFontSize(11); // ✅ Fonte menor
    doc.text(`${titleDoc} Nº ${orderId}`, pageWidth / 2, 15, { align: "center" });
    
    doc.setTextColor(0, 0, 0);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4 text-center">
          Gerar PDF ({order?.documentType === "orcamento" ? "Orçamento" : "Pedido"})
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione a Representada:
          </label>
          <select
            value={selectedPdfBrand}
            onChange={(e) => setSelectedPdfBrand(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {(!brands || brands.length === 0) ? (
              <>
                <option value="Blumenau">Blumenau</option>
                <option value="Zagonel">Zagonel</option>
                <option value="Padova">Padova</option>
              </>
            ) : (
              brands.map((brand) => (
                <option key={brand.id} value={brand.name}>
                  {brand.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex justify-between space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGeneratePdf}
            disabled={!imageLoaded}
            className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {imageLoaded ? (
              <>
                <span>📄</span>
                <span>Gerar PDF</span>
              </>
            ) : (
              <>
                <div className="loader border-2 border-t-transparent border-white w-4 h-4 rounded-full animate-spin"></div>
                <span>Carregando...</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          {headerImage && imageDimensions.width > 0 ? (
            <span className="text-green-600">
              ✅ Imagem compacta carregada
            </span>
          ) : imageLoaded ? (
            <span className="text-yellow-600">⚠️ Usando layout padrão</span>
          ) : (
            <span>⌛ Carregando recursos...</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfGenerator;