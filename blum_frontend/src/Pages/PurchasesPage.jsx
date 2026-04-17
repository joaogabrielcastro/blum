import { useState, useEffect, useMemo } from "react";
import apiService from "../services/apiService";
import LoadingSpinner from "../components/LoadingSpinner";
import VerificationTable from "../components/common/VerificationTable";
import UploadSection from "../components/common/UploadSection";
import PurchaseTabs from "../components/purchases/PurchaseTabs";
import PurchaseDateSection from "../components/purchases/PurchaseDateSection";
import PurchaseActions from "../components/purchases/PurchaseActions";

function normalizeSubcode(value) {
  return String(value ?? "").trim();
}

/** Subcódigos repetidos na lista (trim), sem duplicar na resposta. */
function getDuplicateSubcodesFromItems(items) {
  const subcodes = (items || [])
    .map((i) => normalizeSubcode(i.subcode))
    .filter(Boolean);
  const repeated = subcodes.filter((c, idx) => subcodes.indexOf(c) !== idx);
  return [...new Set(repeated)];
}

/**
 * Junta linhas com o mesmo subcódigo: soma quantidades, preço unitário = média ponderada,
 * mantém ordem da primeira ocorrência e o vínculo do catálogo da primeira linha do grupo.
 */
function mergePurchaseItemsBySubcode(items) {
  if (!Array.isArray(items) || items.length === 0) return items;
  const bySub = new Map();
  for (const it of items) {
    const s = normalizeSubcode(it.subcode);
    if (!s) continue;
    if (!bySub.has(s)) bySub.set(s, []);
    bySub.get(s).push(it);
  }
  const out = [];
  const seen = new Set();
  for (const it of items) {
    const s = normalizeSubcode(it.subcode);
    if (!s) {
      out.push({ ...it });
      continue;
    }
    if (seen.has(s)) continue;
    seen.add(s);
    const grp = bySub.get(s);
    if (grp.length === 1) out.push({ ...grp[0] });
    else out.push(mergeOneSubcodeGroup(grp));
  }
  return out;
}

function PurchaseInlineNotice({ message, onDismiss, variant = "error" }) {
  if (!message) return null;
  const isSuccess = variant === "success";
  return (
    <div
      className={
        isSuccess
          ? "mb-4 p-4 rounded-lg border border-green-200 bg-green-50 text-green-900 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2"
          : "mb-4 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2"
      }
      role={isSuccess ? "status" : "alert"}
    >
      <span className="text-sm flex-1 whitespace-pre-wrap">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className={
          isSuccess
            ? "text-sm font-medium text-green-800 hover:text-green-950 shrink-0 self-end sm:self-start"
            : "text-sm font-medium text-red-700 hover:text-red-900 shrink-0 self-end sm:self-start"
        }
      >
        Fechar
      </button>
    </div>
  );
}

function mergeOneSubcodeGroup(grp) {
  const base = { ...grp[0] };
  let totalQty = 0;
  let totalVal = 0;
  for (const row of grp) {
    const q = Number(row.quantity) || 0;
    const p = Number(row.unitPrice) || 0;
    totalQty += q;
    totalVal += q * p;
  }
  base.quantity = totalQty;
  base.unitPrice =
    totalQty > 0
      ? Math.round((totalVal / totalQty) * 10000) / 10000
      : Number(base.unitPrice) || 0;
  const ids = [...new Set(grp.map((r) => r.mappedProductId).filter(Boolean))];
  base.mappedProductId = ids.length === 1 ? ids[0] : grp[0].mappedProductId || "";
  base.isNewProduct = !base.mappedProductId;
  return base;
}

// ✅ HOOK PERSONALIZADO PARA LÓGICA DE COMPRAS
const usePurchaseLogic = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedItems, setParsedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [userProducts, setUserProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Carrega produtos e representadas (usa apiService: URL correta + JWT)
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const [productsResponse, brandsData] = await Promise.all([
          apiService.getProducts("all", 1, 10000),
          apiService.getBrands(),
        ]);

        const productsData = Array.isArray(productsResponse?.data)
          ? productsResponse.data
          : Array.isArray(productsResponse)
            ? productsResponse
            : [];

        const brandsList = Array.isArray(brandsData) ? brandsData : [];

        setUserProducts(productsData);
        setBrands(brandsList);

        if (brandsList.length > 0) {
          const firstBrand = brandsList[0];
          if (firstBrand?.id != null) {
            setSelectedBrandId(String(firstBrand.id));
          }
        } else {
          setSelectedBrandId("");
        }
      } catch (err) {
        console.error("Erro ao buscar produtos/representadas:", err);
        setUserProducts([]);
        setBrands([]);
        setSelectedBrandId("");
      }
    };
    fetchUserData();
  }, []);

  return {
    selectedFile,
    setSelectedFile,
    parsedItems,
    setParsedItems,
    isLoading,
    setIsLoading,
    error,
    setError,
    successMessage,
    setSuccessMessage,
    userProducts,
    setUserProducts,
    brands,
    selectedBrandId,
    setSelectedBrandId,
    purchaseDate,
    setPurchaseDate,
  };
};

// ✅ COMPONENTE CSV IMPORT COMPLETO - CORRIGIDO
const CsvImportSection = ({ purchaseLogic }) => {
  const {
    isLoading,
    setIsLoading,
    error,
    setError,
    successMessage,
    setSuccessMessage,
    userProducts,
    setUserProducts,
    brands,
    purchaseDate,
    setPurchaseDate,
  } = purchaseLogic;

  const [csvFile, setCsvFile] = useState(null);
  const [parsedCsvItems, setParsedCsvItems] = useState([]);
  const [selectedCsvBrandId, setSelectedCsvBrandId] = useState("");
  const [isCsvProcessing, setIsCsvProcessing] = useState(false);

  const csvDuplicateSubcodes = useMemo(
    () => getDuplicateSubcodesFromItems(parsedCsvItems),
    [parsedCsvItems],
  );

  // ✅ Inicializar com a primeira marca
  useEffect(() => {
    if (brands.length > 0 && !selectedCsvBrandId) {
      setSelectedCsvBrandId(String(brands[0].id));
    }
  }, [brands, selectedCsvBrandId]);

  // ✅ Função para processar CSV (DEFINIDA ANTES DE SER USADA)
  // ✅ CORREÇÃO: Atualize a função handleCsvProcess para buscar por subcódigo
  const handleCsvProcess = async () => {
    if (!csvFile) {
      setError("Por favor, selecione um arquivo CSV.");
      return;
    }

    if (!selectedCsvBrandId) {
      setError("Por favor, selecione uma Representada para os produtos.");
      return;
    }

    setIsCsvProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("productsCsv", csvFile);

      const itemsFromAI = await apiService.processPurchaseCsv(formData);

      // ✅ VALIDAÇÃO CRÍTICA
      if (!itemsFromAI || !Array.isArray(itemsFromAI)) {
        throw new Error("Nenhum dado válido retornado do servidor");
      }

      const preMappedItems = itemsFromAI.map((item, index) => {
        // Garantir campos mínimos
        const safeItem = {
          productCode: item.productCode || item.codigo || `CODE_${index + 1}`,
          description: item.description || item.nome || `Produto ${index + 1}`,
          quantity: Number(item.quantity || item.estoque || item.stock || 1),
          unitPrice: Number(item.unitPrice || item.preco || item.price || 0),
          // ✅ INICIALMENTE: subcode vazio (será preenchido se produto existir)
          subcode: "", // ← COMEÇA VAZIO
          ...item,
        };

        let foundProduct = null;

        // 1. Busca por PRODUCTCODE (mais confiável)
        if (safeItem.productCode && safeItem.productCode.trim() !== "") {
          foundProduct = userProducts.find(
            (p) =>
              p.productcode &&
              p.productcode.trim() === safeItem.productCode.trim(),
          );
        }

        // 2. Busca por NOME (backup)
        if (!foundProduct && safeItem.description) {
          const searchName = safeItem.description
            .toLowerCase()
            .substring(0, 25);
          foundProduct = userProducts.find(
            (p) => p.name && p.name.toLowerCase().includes(searchName),
          );
        }

        // ✅ CORREÇÃO CRÍTICA: SE ENCONTROU PRODUTO, USA O SUBCÓDIGO DO BANCO
        if (foundProduct) {
          safeItem.subcode = foundProduct.subcode || ""; // ← PEGA O SUBCÓDIGO DO BANCO
        }

        return {
          ...safeItem,
          id: index,
          mappedProductId: foundProduct ? foundProduct.id : "",
          isNewProduct: !foundProduct,
        };
      });

      if (preMappedItems.length === 0) {
        throw new Error("Nenhum item válido encontrado no CSV");
      }

      setParsedCsvItems(preMappedItems);
    } catch (err) {
      console.error("❌ Erro no processamento CSV:", err);
      setError(
        err.message ||
          "Falha ao processar o CSV. Verifique o formato do arquivo e tente novamente.",
      );
    } finally {
      setIsCsvProcessing(false);
    }
  };

  // ✅ Função para atualizar itens (igual ao PDF)
  const handleCsvItemChange = (index, field, value) => {
    setError(null);
    setSuccessMessage(null);
    setParsedCsvItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
        ...(field === "mappedProductId" && { isNewProduct: !value }),
      };
      return updated;
    });
  };

  // ✅ Função para confirmar importação do CSV
  const handleCsvConfirmPurchase = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!selectedCsvBrandId) {
      setError("Selecione uma representada para os produtos.");
      return;
    }

    let rows = [...parsedCsvItems];
    const duplicateSubcodes = getDuplicateSubcodesFromItems(rows);
    if (duplicateSubcodes.length > 0) {
      const ok = window.confirm(
        `Subcódigos repetidos na lista: ${duplicateSubcodes.join(", ")}.\n\n` +
          "Unificar automaticamente?\n" +
          "• Soma as quantidades\n" +
          "• Preço unitário = média ponderada\n" +
          "• Usa o produto do catálogo da primeira linha de cada subcódigo\n\n" +
          "Cancelar = interrompe a importação (pode usar o botão «Unificar…» na barra abaixo).",
      );
      if (!ok) return;
      rows = mergePurchaseItemsBySubcode(rows);
      setParsedCsvItems(rows);
    }

    const missingSubcodes = rows.filter(
      (item) => !normalizeSubcode(item.subcode),
    );
    if (missingSubcodes.length > 0) {
      setError("Todos os itens devem ter um subcódigo preenchido.");
      return;
    }

    const invalidItems = rows.filter(
      (item) => !item.quantity || item.unitPrice == null || item.unitPrice <= 0,
    );

    if (invalidItems.length > 0) {
      setError(
        "Todos os itens devem ter quantidade e preço unitário válidos (maior que zero).",
      );
      return;
    }

    // Confirmação
    const newProductsCount = rows.filter((item) => item.isNewProduct).length;
    const selectedBrand = brands.find(
      (b) => String(b.id) === String(selectedCsvBrandId),
    );

    if (newProductsCount > 0) {
      const confirmMessage =
        `⚠️ ATENÇÃO!\n\n` +
        `${newProductsCount} produtos NÃO EXISTEM no seu catálogo e serão CRIADOS AUTOMATICAMENTE.\n\n` +
        `• Produtos existentes: ${rows.length - newProductsCount}\n` +
        `• Novos produtos: ${newProductsCount}\n` +
        `• Representada: ${selectedBrand?.name || "Não selecionada"}\n` +
        `• Data da compra: ${purchaseDate}\n\n` +
        `Deseja continuar?`;

      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    rows = mergePurchaseItemsBySubcode(rows);
    setParsedCsvItems(rows);

    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        brandId: selectedCsvBrandId,
        purchaseDate: purchaseDate,
        items: rows.map((item) => ({
          mappedProductId: item.mappedProductId || "",
          productCode: item.productCode,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subcode: normalizeSubcode(item.subcode),
        })),
      };

      // ✅ Usar a função específica para CSV
      const result = await apiService.finalizePurchaseFromCsv(payload);

      const summary =
        `✅ ${result.message}\n\n` +
          `Resumo da importação:\n` +
          `• ${rows.length - newProductsCount} produtos atualizados\n` +
          `• ${newProductsCount} novos produtos criados\n` +
          `• Representada: ${selectedBrand?.name}\n` +
          `• Data da compra: ${purchaseDate}\n` +
          `• Linhas importadas: ${rows.length}`;

      setError(null);
      setSuccessMessage(summary);

      // Limpa a tela
      setParsedCsvItems([]);
      setCsvFile(null);

      // Recarrega produtos
      const productsResponse = await apiService.getProducts();
      const updatedProducts = productsResponse?.data || productsResponse;
      setUserProducts(updatedProducts);
    } catch (err) {
      console.error("💥 Erro ao confirmar importação CSV:", err);
      setError(err.message || "Ocorreu um erro ao processar a importação.");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Componente de Resumo de Novos Produtos
  const NewProductsSummary = ({ items, selectedBrand }) => {
    const newProducts = items.filter((item) => item.isNewProduct);

    if (newProducts.length === 0) return null;

    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex items-center mb-3">
          <span className="text-blue-600 font-bold text-lg flex items-center">
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            Novos Produtos Detectados
          </span>
        </div>
        <p className="text-blue-700 mb-3">
          {newProducts.length} produtos não existem no seu catálogo e serão
          criados automaticamente na Representada{" "}
          <strong className="text-blue-800">
            {selectedBrand?.name || "Não selecionada"}
          </strong>
          :
        </p>
        <div className="max-h-40 overflow-y-auto bg-white rounded-lg p-3 border border-blue-100">
          {newProducts.map((item, index) => (
            <div
              key={index}
              className="text-sm text-blue-600 py-2 border-b border-blue-50 last:border-b-0 flex items-start"
            >
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded mr-2 mt-0.5 flex-shrink-0">
                {index + 1}
              </span>
              <div>
                <strong className="text-blue-800">{item.productCode}</strong> -{" "}
                {item.description}
                {item.subcode && (
                  <span className="text-green-600 ml-2">
                    [Subcódigo: {item.subcode}]
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ✅ Renderização condicional igual ao PDF
  return (
    <>
      {parsedCsvItems.length === 0 ? (
        // ✅ TELA DE UPLOAD (igual ao PDF)
        <>
          <PurchaseInlineNotice
            variant="success"
            message={successMessage}
            onDismiss={() => setSuccessMessage(null)}
          />
          <UploadSection
          onFileChange={(e) => {
            setSuccessMessage(null);
            setCsvFile(e.target.files[0]);
          }}
          selectedFile={csvFile}
          onUpload={handleCsvProcess}
          isLoading={isCsvProcessing}
          error={error}
          brands={brands}
          selectedBrandId={selectedCsvBrandId}
          onBrandChange={(e) => setSelectedCsvBrandId(e.target.value)}
          title="Importar Produtos do CSV"
          description="Envie o arquivo CSV do seu fornecedor para importar os produtos em lote."
          accept=".csv"
          fileType="CSV"
        />
        </>
      ) : (
        // ✅ TELA DE VERIFICAÇÃO (igual ao PDF)
        <>
          <PurchaseInlineNotice
            message={error}
            onDismiss={() => setError(null)}
          />
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
            <h3 className="text-green-800 font-bold text-lg">
              ✅ CSV Processado com Sucesso!
            </h3>
            <p className="text-green-700">
              {parsedCsvItems.length} itens encontrados. Verifique e confirme os
              dados abaixo.
            </p>
            {csvDuplicateSubcodes.length > 0 && (
              <p className="text-amber-800 text-sm mt-2 font-medium">
                Há subcódigos repetidos na lista. Use «Unificar subcódigos
                duplicados» ou confirme a importação — será perguntado se deseja
                agrupar automaticamente (soma quantidades e média ponderada do
                preço).
              </p>
            )}
          </div>

          <PurchaseDateSection
            date={purchaseDate}
            onDateChange={setPurchaseDate}
          />

          <NewProductsSummary
            items={parsedCsvItems}
            selectedBrand={brands.find(
              (b) => String(b.id) === String(selectedCsvBrandId),
            )}
          />

          <VerificationTable
            items={parsedCsvItems}
            onItemChange={handleCsvItemChange}
            userProducts={userProducts}
            title="Verifique os Itens do CSV"
            description="Mapeie os itens para produtos existentes e insira o subcódigo obrigatório para cada produto."
            source="CSV"
          />

          <PurchaseActions
            onCancel={() => {
              setParsedCsvItems([]);
              setCsvFile(null);
              setSuccessMessage(null);
            }}
            onConfirm={handleCsvConfirmPurchase}
            isLoading={isLoading}
            confirmLabel="Confirmar e Importar Produtos"
            secondaryAction={
              csvDuplicateSubcodes.length > 0
                ? {
                    label: "Unificar subcódigos duplicados",
                    onClick: () => {
                      setError(null);
                      setSuccessMessage(null);
                      setParsedCsvItems(
                        mergePurchaseItemsBySubcode(parsedCsvItems),
                      );
                    },
                  }
                : undefined
            }
          />
        </>
      )}
    </>
  );
};

// ✅ COMPONENTE PRINCIPAL REFATORADO
const PurchasesPage = () => {
  const purchaseLogic = usePurchaseLogic();
  const [activeTab, setActiveTab] = useState("pdf");

  const {
    selectedFile,
    setSelectedFile,
    parsedItems,
    setParsedItems,
    isLoading,
    setIsLoading,
    error,
    setError,
    successMessage,
    setSuccessMessage,
    userProducts,
    setUserProducts,
    brands,
    selectedBrandId,
    setSelectedBrandId,
    purchaseDate,
    setPurchaseDate,
  } = purchaseLogic;

  useEffect(() => {
    setSuccessMessage(null);
  }, [activeTab, setSuccessMessage]);

  const pdfDuplicateSubcodes = useMemo(
    () => getDuplicateSubcodesFromItems(parsedItems),
    [parsedItems],
  );

  // ✅ FUNÇÃO handleItemChange PARA PDF (CORRIGIDA - NO LUGAR CERTO)
  const handleItemChange = (index, field, value) => {
    setError(null);
    setSuccessMessage(null);
    setParsedItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
        ...(field === "mappedProductId" && { isNewProduct: !value }),
      };
      return updated;
    });
  };

  const handlePdfUpload = async () => {
    if (!selectedFile) {
      setError("Por favor, selecione um arquivo PDF.");
      return;
    }

    if (!selectedBrandId) {
      setError("Por favor, selecione uma Representada para os produtos.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setParsedItems([]);

    try {
      const formData = new FormData();
      formData.append("purchasePdf", selectedFile);

      const itemsFromAI = await apiService.processPurchasePdf(formData);

      // Pré-mapeia os produtos existentes
      const preMappedItems = itemsFromAI.map((item, index) => {
        const foundProduct = userProducts.find(
          (p) =>
            p.productcode === item.productCode ||
            p.name
              .toLowerCase()
              .includes(item.description.toLowerCase().substring(0, 15)),
        );
        return {
          ...item,
          mappedProductId: foundProduct ? foundProduct.id : "",
          isNewProduct: !foundProduct,
          subcode: foundProduct ? foundProduct.subcode || "" : "", // ✅ Pega o subcódigo do produto existente
        };
      });

      setParsedItems(preMappedItems);
    } catch (err) {
      console.error("❌ Erro ao processar PDF:", err);
      setError(
        "Falha ao processar o PDF. Verifique o arquivo e tente novamente.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePdfConfirm = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!selectedBrandId) {
      setError("Selecione uma representada para os produtos.");
      return;
    }

    let rows = [...parsedItems];
    const duplicateSubcodes = getDuplicateSubcodesFromItems(rows);
    if (duplicateSubcodes.length > 0) {
      const ok = window.confirm(
        `Subcódigos repetidos na lista: ${duplicateSubcodes.join(", ")}.\n\n` +
          "Unificar automaticamente?\n" +
          "• Soma as quantidades\n" +
          "• Preço unitário = média ponderada\n" +
          "• Usa o produto do catálogo da primeira linha de cada subcódigo\n\n" +
          "Cancelar = interrompe (pode usar o botão «Unificar…» na barra abaixo).",
      );
      if (!ok) return;
      rows = mergePurchaseItemsBySubcode(rows);
      setParsedItems(rows);
    }

    const missingSubcodes = rows.filter(
      (item) => !normalizeSubcode(item.subcode),
    );
    if (missingSubcodes.length > 0) {
      setError("Todos os itens devem ter um subcódigo preenchido.");
      return;
    }

    const invalidItems = rows.filter(
      (item) => !item.quantity || item.unitPrice == null || item.unitPrice <= 0,
    );

    if (invalidItems.length > 0) {
      setError(
        "Todos os itens devem ter quantidade e preço unitário válidos (maior que zero).",
      );
      return;
    }

    // Confirmação
    const newProductsCount = rows.filter((item) => item.isNewProduct).length;
    const selectedBrand = brands.find(
      (b) => String(b.id) === String(selectedBrandId),
    );

    if (newProductsCount > 0) {
      const confirmMessage =
        `⚠️ ATENÇÃO!\n\n` +
        `${newProductsCount} produtos NÃO EXISTEM no seu catálogo e serão CRIADOS AUTOMATICAMENTE.\n\n` +
        `• Produtos existentes: ${rows.length - newProductsCount}\n` +
        `• Novos produtos: ${newProductsCount}\n` +
        `• Representada: ${selectedBrand?.name || "Não selecionada"}\n` +
        `• Data da compra: ${purchaseDate}\n\n` +
        `Deseja continuar?`;

      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    rows = mergePurchaseItemsBySubcode(rows);
    setParsedItems(rows);

    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        brandId: selectedBrandId,
        purchaseDate: purchaseDate,
        items: rows.map((item) => ({
          mappedProductId: item.mappedProductId || "",
          productCode: item.productCode,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subcode: normalizeSubcode(item.subcode),
        })),
      };

      const result = await apiService.finalizePurchaseFromPdf(payload);

      const summary =
        `✅ ${result.message}\n\n` +
          `Resumo:\n` +
          `• ${rows.length - newProductsCount} produtos atualizados\n` +
          `• ${newProductsCount} novos produtos criados\n` +
          `• Representada: ${selectedBrand?.name}\n` +
          `• Data da compra: ${purchaseDate}\n` +
          `• Linhas importadas: ${rows.length}`;

      setError(null);
      setSuccessMessage(summary);

      // Limpa a tela
      setParsedItems([]);
      setSelectedFile(null);

      // Recarrega produtos
      const productsResponse = await apiService.getProducts();
      const updatedProducts = productsResponse?.data || productsResponse;
      setUserProducts(updatedProducts);
    } catch (err) {
      console.error("💥 Erro ao processar PDF:", err);
      setError(err.message || "Ocorreu um erro ao processar o PDF.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <span className="mr-3">🛒</span>
            Gestão de Compras
          </h1>
          <p className="text-gray-600">
            Importe e gerencie suas compras de forma eficiente
          </p>
        </div>

        {/* Abas */}
        <PurchaseTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Conteúdo */}
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <LoadingSpinner />
              <p className="mt-4 text-gray-600">
                Processando sua solicitação...
              </p>
            </div>
          </div>
        ) : activeTab === "csv" ? (
          <CsvImportSection purchaseLogic={purchaseLogic} />
        ) : parsedItems.length === 0 ? (
          <>
            <PurchaseInlineNotice
              variant="success"
              message={successMessage}
              onDismiss={() => setSuccessMessage(null)}
            />
            <UploadSection
              onFileChange={(e) => {
                setSuccessMessage(null);
                setSelectedFile(e.target.files[0]);
              }}
              selectedFile={selectedFile}
              onUpload={handlePdfUpload}
              isLoading={isLoading}
              error={error}
              brands={brands}
              selectedBrandId={selectedBrandId}
              onBrandChange={(e) => setSelectedBrandId(e.target.value)}
            />
          </>
        ) : (
          <>
            <PurchaseInlineNotice
              message={error}
              onDismiss={() => setError(null)}
            />
            {/* ✅ MENSAGEM DE SUCESSO VERDE - IGUAL AO CSV */}
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
              <h3 className="text-green-800 font-bold text-lg">
                ✅ PDF Processado com Sucesso!
              </h3>
              <p className="text-green-700">
                {parsedItems.length} itens encontrados. Verifique e confirme os
                dados abaixo.
              </p>
              {pdfDuplicateSubcodes.length > 0 && (
                <p className="text-amber-800 text-sm mt-2 font-medium">
                  Há subcódigos repetidos. Use «Unificar subcódigos duplicados»
                  ou confirme — será perguntado se deseja agrupar (soma
                  quantidades e média ponderada do preço).
                </p>
              )}
            </div>

            <PurchaseDateSection
              date={purchaseDate}
              onDateChange={setPurchaseDate}
            />

            <VerificationTable
              items={parsedItems}
              onItemChange={handleItemChange}
              userProducts={userProducts}
            />

            <PurchaseActions
              onCancel={() => {
                setParsedItems([]);
                setSuccessMessage(null);
              }}
              onConfirm={handlePdfConfirm}
              isLoading={isLoading}
              confirmLabel="Confirmar e Atualizar Estoque"
              secondaryAction={
                pdfDuplicateSubcodes.length > 0
                  ? {
                      label: "Unificar subcódigos duplicados",
                      onClick: () => {
                        setError(null);
                        setSuccessMessage(null);
                        setParsedItems(
                          mergePurchaseItemsBySubcode(parsedItems),
                        );
                      },
                    }
                  : undefined
              }
            />
          </>
        )}
      </div>
    </div>
  );
};

export default PurchasesPage;
