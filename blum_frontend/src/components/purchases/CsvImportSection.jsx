import { useState, useEffect, useMemo } from "react";
import apiService from "../../services/apiService";
import VerificationTable from "../common/VerificationTable";
import UploadSection from "../common/UploadSection";
import PurchaseDateSection from "./PurchaseDateSection";
import PurchaseActions from "./PurchaseActions";
import PurchaseInlineNotice from "./PurchaseInlineNotice";
import ConfirmationModal from "../ConfirmationModal";
import {
  buildVerificationCatalog,
  buildImportSuccessSummary,
  buildFinalizePurchasePayload,
  getDuplicateProductCodesFromItems,
  mergePurchaseItemsByProductCode,
  validatePurchaseImportRows,
} from "../../utils/purchaseImportUtils";

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
  const [createConfirm, setCreateConfirm] = useState(null);
  const [mergeConfirm, setMergeConfirm] = useState(null);

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
      setError("Selecione um arquivo CSV.");
      return;
    }
    if (!selectedCsvBrandId) {
      setError("Selecione uma representada para os produtos.");
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
          "Não foi possível processar o CSV. Verifique o formato e tente novamente.",
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

  const finalizeCsvRows = async (rows) => {
    const selectedBrand = brands.find(
      (b) => String(b.id) === String(selectedCsvBrandId),
    );
    const mergedRows = mergePurchaseItemsByProductCode(rows);
    setParsedCsvItems(mergedRows);
    setIsLoading(true);
    setCreateConfirm(null);
    setMergeConfirm(null);

    try {
      const result = await apiService.finalizePurchaseFromCsv(
        buildFinalizePurchasePayload(
          selectedCsvBrandId,
          purchaseDate,
          mergedRows,
        ),
      );
      setSuccessMessage(
        buildImportSuccessSummary(
          result,
          selectedBrand,
          purchaseDate,
          mergedRows.length,
        ),
      );
      setParsedCsvItems([]);
      setCsvFile(null);
      setUserProducts([]);
    } catch (err) {
      console.error("Erro ao confirmar importação CSV:", err);
      setError(
        err.message ||
          "Não foi possível finalizar a importação. Tente novamente.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const continueAfterRowsReady = async (rows) => {
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
      setCreateConfirm({
        rows,
        newProductsCount,
        existingCount: rows.length - newProductsCount,
        brandName: selectedBrand?.name || "Não selecionada",
      });
      return;
    }

    await finalizeCsvRows(rows);
  };

  const handleCsvConfirmPurchase = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!selectedCsvBrandId) {
      setError("Selecione uma representada para os produtos.");
      return;
    }

    const rows = [...parsedCsvItems];
    const duplicateProductCodes = getDuplicateProductCodesFromItems(rows);
    if (duplicateProductCodes.length > 0) {
      setMergeConfirm({ rows, codes: duplicateProductCodes });
      return;
    }

    await continueAfterRowsReady(rows);
  };

  const handleMergeConfirm = async () => {
    if (!mergeConfirm?.rows) return;
    const merged = mergePurchaseItemsByProductCode(mergeConfirm.rows);
    setParsedCsvItems(merged);
    setMergeConfirm(null);
    await continueAfterRowsReady(merged);
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
          title="Importar CSV"
          description="Envie o arquivo CSV do fornecedor para importar produtos em lote."
          accept=".csv"
          fileType="CSV"
        />
      </>
    );
  }

  return (
    <>
      <PurchaseInlineNotice message={error} onDismiss={() => setError(null)} />
      <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <h3 className="text-base font-semibold text-emerald-900">
          CSV processado
        </h3>
        <p className="mt-1 text-sm text-emerald-800">
          {parsedCsvItems.length} itens encontrados. Verifique e confirme os
          dados abaixo.
        </p>
        {csvDuplicateProductCodes.length > 0 ? (
          <p className="mt-2 text-sm font-medium text-amber-900">
            Há códigos repetidos. Use «Unificar códigos duplicados» ou confirme
            — será perguntado se deseja agrupar.
          </p>
        ) : null}
      </div>

      <PurchaseDateSection date={purchaseDate} onDateChange={setPurchaseDate} />

      <VerificationTable
        items={parsedCsvItems}
        onItemChange={handleCsvItemChange}
        userProducts={userProducts}
        title="Verifique os itens do CSV"
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
        confirmLabel="Confirmar e importar produtos"
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

      <ConfirmationModal
        show={!!mergeConfirm}
        title="Unificar códigos duplicados?"
        tone="primary"
        confirmText="Unificar e continuar"
        message={
          mergeConfirm
            ? `Códigos repetidos: ${mergeConfirm.codes.join(", ")}. Vamos somar quantidades e usar média ponderada de preço. Cancelar interrompe a importação.`
            : ""
        }
        onConfirm={handleMergeConfirm}
        onCancel={() => setMergeConfirm(null)}
      />
      <ConfirmationModal
        show={!!createConfirm}
        title="Criar produtos novos?"
        tone="primary"
        confirmText="Continuar"
        message={
          createConfirm
            ? `${createConfirm.newProductsCount} produto(s) não existem no catálogo e serão criados automaticamente. Existentes: ${createConfirm.existingCount}. Representada: ${createConfirm.brandName}. Data: ${purchaseDate}.`
            : ""
        }
        onConfirm={() =>
          createConfirm?.rows && finalizeCsvRows(createConfirm.rows)
        }
        onCancel={() => setCreateConfirm(null)}
      />
    </>
  );
}
