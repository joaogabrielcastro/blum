import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import formatCurrency from "../utils/format";

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

const PdfGenerator = ({ order, clients, reps, brands, onClose }) => {
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

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    let yPosition = 15;

    // Definição de colunas
    const columns = {
      produto: margin + 2,
      qtd: pageWidth - 65,
      preco: pageWidth - 40,
      subtotal: pageWidth - 15,
      totais: {
        label: pageWidth - 70,
        value: pageWidth - 15
      }
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
        
        console.log(`📐 Imagem redimensionada: ${finalWidth.toFixed(1)}x${finalHeight.toFixed(1)}mm`);
      } catch (error) {
        console.error("Erro ao adicionar imagem:", error);
        createDefaultHeader(doc, pageWidth, order.id);
        yPosition = 35; // ✅ Header padrão também mais compacto
      }
    } else {
      createDefaultHeader(doc, pageWidth, order.id);
      yPosition = 35; // ✅ Header padrão mais compacto
    }

    // ✅ CORREÇÃO: Número do pedido mais destacado
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text(`Pedido Nº ${order.id}`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 8;

    // Informações do cliente
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    
    const clientName = clients[order.clientId] || "N/A";
    doc.text(`Cliente: ${clientName}`, margin, yPosition);
    yPosition += 6; // ✅ Menos espaço entre linhas

    // Cabeçalho da tabela - mais próximo do conteúdo
    yPosition += 4;
    doc.setFont(undefined, "bold");
    doc.setFontSize(9);
    
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, "F");
    
    doc.text("PRODUTO", columns.produto, yPosition + 5);
    doc.text("QTD.", columns.qtd, yPosition + 5, { align: "right" });
    doc.text("PREÇO UNIT.", columns.preco, yPosition + 5, { align: "right" }); // ✅ "UNIT." adicionado
    doc.text("SUBTOTAL", columns.subtotal, yPosition + 5, { align: "right" });
    
    yPosition += 10;

    // Itens do pedido
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);
    
    const items = normalizeItems(order.items);

    items.forEach((item, index) => {
      checkPageOverflow(15);

      const productName = item.productName || item.name || "Produto";
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice || item.price || 0);
      const subtotal = quantity * unitPrice;

      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPosition, pageWidth - 2 * margin, 12, "F");
      }

      const maxWidth = columns.qtd - columns.produto - 10;
      const productLines = doc.splitTextToSize(productName, maxWidth);
      
      const lineHeight = Math.max(12, productLines.length * 4);
      
      productLines.forEach((line, lineIndex) => {
        doc.text(line, columns.produto, yPosition + 4 + (lineIndex * 4));
      });

      doc.text(quantity.toString(), columns.qtd, yPosition + 5, { align: "right" });
      doc.text(formatCurrency(unitPrice), columns.preco, yPosition + 5, { align: "right" });
      doc.text(formatCurrency(subtotal), columns.subtotal, yPosition + 5, { align: "right" });

      yPosition += lineHeight;
    });

    // ... (resto do código permanece igual, mas com espaçamentos ajustados)
    yPosition += 8; // ✅ Menos espaço após os itens

    checkPageOverflow(20);

    // TOTAIS
    const subtotalValue = Number(order.totalPrice) || 0;
    const discountValue = Number(order.discount) || 0;
    const totalValue = subtotalValue - discountValue;

    doc.setDrawColor(200, 200, 200);
    doc.line(columns.totais.label - 10, yPosition, columns.totais.value + 5, yPosition);
    yPosition += 6; // ✅ Menos espaço

    if (discountValue > 0) {
      doc.setFont(undefined, "normal");
      doc.setFontSize(9);
      doc.text("Subtotal:", columns.totais.label, yPosition, { align: "right" });
      doc.text(formatCurrency(subtotalValue), columns.totais.value, yPosition, { align: "right" });
      yPosition += 4; // ✅ Menos espaço

      doc.text("Desconto:", columns.totais.label, yPosition, { align: "right" });
      doc.text(`-${formatCurrency(discountValue)}`, columns.totais.value, yPosition, { align: "right" });
      yPosition += 4; // ✅ Menos espaço
    }

    doc.setFont(undefined, "bold");
    doc.setFontSize(10);
    doc.text("TOTAL:", columns.totais.label, yPosition, { align: "right" });
    doc.text(formatCurrency(totalValue), columns.totais.value, yPosition, { align: "right" });
    yPosition += 12; // ✅ Menos espaço

    checkPageOverflow(25);

    // Informações de pagamento e data
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("Condição de Pagamento:", margin, yPosition);
    yPosition += 4;
    
    doc.setFont(undefined, "normal");
    const paymentMethod = order.paymentMethod || "Boleto";
    doc.text(paymentMethod, margin, yPosition);
    yPosition += 6; // ✅ Menos espaço

    doc.setFont(undefined, "bold");
    doc.text("Data de Emissão:", margin, yPosition);
    yPosition += 4;
    
    doc.setFont(undefined, "normal");
    const emissionDate = order.finishedAt 
      ? new Date(order.finishedAt).toLocaleDateString("pt-BR")
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

    doc.save(`pedido-${order.id}.pdf`);
    onClose();
  };

  const createDefaultHeader = (doc, pageWidth, orderId) => {
    // ✅ Header padrão também mais compacto
    doc.setFillColor(61, 101, 155);
    doc.rect(0, 0, pageWidth, 20, 'F'); // ✅ Altura reduzida
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); // ✅ Fonte menor
    doc.setFont(undefined, "bold");
    doc.text("VENDAS", pageWidth / 2, 8, { align: "center" });
    
    doc.setFontSize(11); // ✅ Fonte menor
    doc.text(`Pedido Nº ${orderId}`, pageWidth / 2, 15, { align: "center" });
    
    doc.setTextColor(0, 0, 0);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4 text-center">Gerar PDF do Pedido</h3>
        
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