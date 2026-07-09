import { useState, useEffect, useMemo } from "react";
import apiService from "../../services/apiService";
import VerificationTable from "../common/VerificationTable";
import UploadSection from "../common/UploadSection";
import PurchaseActions from "../purchases/PurchaseActions";
import {
  buildVerificationCatalog,
  buildProductImportPayload,
  buildProductImportSuccessSummary,
  getDuplicateProductCodesFromItems,
  mergePurchaseItemsByProductCode,
  maybeMergeDuplicateProductCodes,
  validateProductImportRows,
} from "../../utils/productImportUtils";

export default function ProductImportSection({
  brands,
  defaultBrandId,
  onSuccess,
  onClose,
}) {
  const [file, setFile] = useState(null);
  const [parsedItems, setParsedItems] = useState([]);
  const [userProducts, setUserProducts] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState(
    defaultBrandId ? String(defaultBrandId) : "",
  );
  const [stockMode, setStockMode] = useState("replace");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [profile, setProfile] = useState("");

  const duplicateProductCodes = useMemo(
    () => getDuplicateProductCodesFromItems(parsedItems),
    [parsedItems],
  );

  useEffect(() => {
    if (defaultBrandId) {
      setSelectedBrandId(String(defaultBrandId));
    } else if (brands.length > 0 && !selectedBrandId) {
      setSelectedBrandId(String(brands[0].id));
    }
  }, [brands, defaultBrandId, selectedBrandId]);

  const handleProcess = async () => {
    if (!file) {
      setError("Selecione um arquivo CSV ou Excel.");
      return;
    }
    if (!selectedBrandId) {
      setError("Selecione uma representada.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("productsFile", file);
      const preview = await apiService.previewProductImport(formData);

      const rawItems = (preview.items || []).map((item, index) => ({
        productCode: item.productCode || item.codigo || `CODE_${index + 1}`,
        description: item.description || item.nome || `Produto ${index + 1}`,
        quantity: Number(item.quantity ?? item.estoque ?? item.stock ?? 0),
        unitPrice: Number(item.unitPrice ?? item.preco ?? item.price ?? 0),
        minStock: Number(item.minStock ?? item.minstock ?? 0),
      }));

      if (rawItems.length === 0) {
        throw new Error("Nenhum produto válido encontrado no arquivo.");
      }

      const selectedBrand = brands.find(
        (b) => String(b.id) === String(selectedBrandId),
      );

      const { items: preMappedItems, catalogProducts } =
        await buildVerificationCatalog(
          apiService,
          rawItems,
          selectedBrand?.name || "",
          selectedBrandId,
        );

      setWarnings(preview.warnings || []);
      setProfile(preview.profile || "");
      setUserProducts(catalogProducts);
      setParsedItems(preMappedItems);
    } catch (err) {
      console.error("Erro ao processar planilha:", err);
      setError(err.message || "Falha ao processar o arquivo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    setError(null);
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

  const handleConfirm = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!selectedBrandId) {
      setError("Selecione uma representada.");
      return;
    }

    let rows = [...parsedItems];
    const merged = await maybeMergeDuplicateProductCodes(rows, setParsedItems);
    if (merged === null) return;
    rows = merged;

    const validation = validateProductImportRows(rows, stockMode);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    const selectedBrand = brands.find(
      (b) => String(b.id) === String(selectedBrandId),
    );
    const newProductsCount = rows.filter((item) => item.isNewProduct).length;

    if (newProductsCount > 0) {
      const ok = window.confirm(
        `${newProductsCount} produto(s) serão criados no catálogo.\n\nDeseja continuar?`,
      );
      if (!ok) return;
    }

    rows = mergePurchaseItemsByProductCode(rows);
    setParsedItems(rows);
    setIsLoading(true);

    try {
      const result = await apiService.finalizeProductImport(
        buildProductImportPayload(selectedBrandId, stockMode, rows),
      );
      const summary = buildProductImportSuccessSummary(
        result,
        selectedBrand,
        rows.length,
        stockMode,
      );
      setSuccessMessage(summary);
      setParsedItems([]);
      setFile(null);
      setUserProducts([]);
      onSuccess?.();
    } catch (err) {
      console.error("Erro ao importar produtos:", err);
      setError(err.message || "Erro ao importar produtos.");
    } finally {
      setIsLoading(false);
    }
  };

  if (parsedItems.length === 0) {
    return (
      <div>
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 whitespace-pre-line">
            {successMessage}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Modo de importação
          </label>
          <select
            value={stockMode}
            onChange={(e) => setStockMode(e.target.value)}
            className="block w-full md:w-96 p-2 border border-gray-300 rounded"
          >
            <option value="replace">
              Sincronizar catálogo (substituir estoque)
            </option>
            <option value="add">Somar estoque (entrada)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Use «Sincronizar» para planilhas exportadas do ERP. Use «Somar» para
            entradas de compra.
          </p>
        </div>

        <UploadSection
          onFileChange={(e) => {
            setSuccessMessage(null);
            setFile(e.target.files[0]);
          }}
          selectedFile={file}
          onUpload={handleProcess}
          isLoading={isProcessing}
          error={error}
          brands={brands}
          selectedBrandId={selectedBrandId}
          onBrandChange={(e) => setSelectedBrandId(e.target.value)}
          title="Importar planilha de produtos"
          description="Envie CSV ou Excel (.xlsx) exportado do ERP — sem conversão manual."
          accept=".csv,.xlsx,.xls"
          fileType="planilha"
        />

        {onClose && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
        <h3 className="text-green-800 font-bold text-lg">
          Planilha processada
        </h3>
        <p className="text-green-700">
          {parsedItems.length} produto(s) encontrados
          {profile ? ` (perfil: ${profile})` : ""}.
        </p>
        {warnings.length > 0 && (
          <ul className="mt-2 text-amber-800 text-sm list-disc pl-5">
            {warnings.slice(0, 5).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
            {warnings.length > 5 && (
              <li>… e mais {warnings.length - 5} aviso(s)</li>
            )}
          </ul>
        )}
        {duplicateProductCodes.length > 0 && (
          <p className="text-amber-800 text-sm mt-2 font-medium">
            Códigos repetidos: {duplicateProductCodes.join(", ")}
          </p>
        )}
      </div>

      <VerificationTable
        items={parsedItems}
        onItemChange={handleItemChange}
        userProducts={userProducts}
        title="Revise os produtos"
        description="Confira código, estoque e preço antes de importar."
        source="Planilha"
      />

      <PurchaseActions
        onCancel={() => {
          setParsedItems([]);
          setFile(null);
          setError(null);
        }}
        onConfirm={handleConfirm}
        isLoading={isLoading}
        confirmLabel="Confirmar importação"
        secondaryAction={
          duplicateProductCodes.length > 0
            ? {
                label: "Unificar códigos duplicados",
                onClick: () => {
                  setParsedItems(
                    mergePurchaseItemsByProductCode(parsedItems),
                  );
                },
              }
            : undefined
        }
      />
    </div>
  );
}
