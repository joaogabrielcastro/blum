import { useState, useEffect, useMemo } from "react";
import apiService from "../../services/apiService";
import VerificationTable from "../common/VerificationTable";
import UploadSection from "../common/UploadSection";
import PurchaseDateSection from "./PurchaseDateSection";
import PurchaseActions from "./PurchaseActions";
import PurchaseInlineNotice from "./PurchaseInlineNotice";
import {
  buildVerificationCatalog,
  buildImportSuccessSummary,
  buildFinalizePurchasePayload,
  getDuplicateProductCodesFromItems,
  mergePurchaseItemsByProductCode,
  maybeMergeDuplicateProductCodes,
  validatePurchaseImportRows,
} from "../../utils/purchaseImportUtils";

function NewProductsSummary({ items, selectedBrand }) {
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CsvImportSection({ purchaseLogic }) {
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

  const csvDuplicateProductCodes = useMemo(
    () => getDuplicateProductCodesFromItems(parsedCsvItems),
    [parsedCsvItems],
  );

  useEffect(() => {
    if (brands.length > 0 && !selectedCsvBrandId) {
      setSelectedCsvBrandId(String(brands[0].id));
    }
  }, [brands, selectedCsvBrandId]);

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

      if (!itemsFromAI || !Array.isArray(itemsFromAI)) {
        throw new Error("Nenhum dado válido retornado do servidor");
      }

      const selectedBrand = brands.find(
        (b) => String(b.id) === String(selectedCsvBrandId),
      );

      const rawItems = itemsFromAI.map((item, index) => ({
        productCode: item.productCode || item.codigo || `CODE_${index + 1}`,
        description: item.description || item.nome || `Produto ${index + 1}`,
        quantity: Number(item.quantity || item.estoque || item.stock || 1),
        unitPrice: Number(item.unitPrice || item.preco || item.price || 0),
        ...item,
      }));

      if (rawItems.length === 0) {
        throw new Error("Nenhum item válido encontrado no CSV");
      }

      const { items: preMappedItems, catalogProducts } =
        await buildVerificationCatalog(
          apiService,
          rawItems,
          selectedBrand?.name || "",
          selectedCsvBrandId,
        );

      setUserProducts(catalogProducts);
      setParsedCsvItems(preMappedItems);
    } catch (err) {
      console.error("Erro no processamento CSV:", err);
      setError(
        err.message ||
          "Falha ao processar o CSV. Verifique o formato do arquivo e tente novamente.",
      );
    } finally {
      setIsCsvProcessing(false);
    }
  };

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

  const handleCsvConfirmPurchase = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!selectedCsvBrandId) {
      setError("Selecione uma representada para os produtos.");
      return;
    }

    let rows = [...parsedCsvItems];
    const merged = await maybeMergeDuplicateProductCodes(
      rows,
      setParsedCsvItems,
    );
    if (merged === null) return;
    rows = merged;

    const validation = validatePurchaseImportRows(rows);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    const selectedBrand = brands.find(
      (b) => String(b.id) === String(selectedCsvBrandId),
    );
    const newProductsCount = rows.filter((item) => item.isNewProduct).length;

    if (newProductsCount > 0) {
      const confirmMessage =
        `⚠️ ATENÇÃO!\n\n` +
        `${newProductsCount} produtos NÃO EXISTEM no seu catálogo e serão CRIADOS AUTOMATICAMENTE.\n\n` +
        `• Produtos existentes: ${rows.length - newProductsCount}\n` +
        `• Novos produtos: ${newProductsCount}\n` +
        `• Representada: ${selectedBrand?.name || "Não selecionada"}\n` +
        `• Data da compra: ${purchaseDate}\n\n` +
        `Deseja continuar?`;
      if (!window.confirm(confirmMessage)) return;
    }

    rows = mergePurchaseItemsByProductCode(rows);
    setParsedCsvItems(rows);
    setIsLoading(true);

    try {
      const result = await apiService.finalizePurchaseFromCsv(
        buildFinalizePurchasePayload(selectedCsvBrandId, purchaseDate, rows),
      );
      setSuccessMessage(
        buildImportSuccessSummary(
          result,
          selectedBrand,
          purchaseDate,
          rows.length,
        ),
      );
      setParsedCsvItems([]);
      setCsvFile(null);
      setUserProducts([]);
    } catch (err) {
      console.error("Erro ao confirmar importação CSV:", err);
      setError(err.message || "Ocorreu um erro ao processar a importação.");
    } finally {
      setIsLoading(false);
    }
  };

  if (parsedCsvItems.length === 0) {
    return (
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
    );
  }

  return (
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
        {csvDuplicateProductCodes.length > 0 && (
          <p className="text-amber-800 text-sm mt-2 font-medium">
            Há códigos de produto repetidos na lista. Use «Unificar códigos
            duplicados» ou confirme a importação — será perguntado se deseja
            agrupar automaticamente.
          </p>
        )}
      </div>

      <PurchaseDateSection date={purchaseDate} onDateChange={setPurchaseDate} />

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
        description="Mapeie os itens para produtos existentes e confira código, quantidade e preço."
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
          csvDuplicateProductCodes.length > 0
            ? {
                label: "Unificar códigos duplicados",
                onClick: () => {
                  setError(null);
                  setSuccessMessage(null);
                  setParsedCsvItems(
                    mergePurchaseItemsByProductCode(parsedCsvItems),
                  );
                },
              }
            : undefined
        }
      />
    </>
  );
}
